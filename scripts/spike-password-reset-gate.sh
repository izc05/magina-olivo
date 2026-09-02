#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://127.0.0.1:3001}"
CAPTURE_FILE="${AUTH_MAIL_CAPTURE_FILE:-/tmp/magina-auth-mail.jsonl}"
EMAIL="password-reset-pilot@example.com"
OLD_PASSWORD="old-password-for-pilot-2026"
NEW_PASSWORD="new-password-for-pilot-2026"

log() {
  printf '[password-reset-gate] %s\n' "$*"
}

fail() {
  printf '[password-reset-gate] ERROR: %s\n' "$*" >&2
  exit 1
}

cleanup() {
  rm -f \
    /tmp/reset-session-a.txt \
    /tmp/reset-session-b.txt \
    /tmp/reset-session-new.txt \
    /tmp/reset-signup.json \
    /tmp/reset-signin-b.json \
    /tmp/reset-request.json \
    /tmp/reset-link-headers.txt \
    /tmp/reset-link-body.txt \
    /tmp/reset-payload.json \
    /tmp/reset-response.json \
    /tmp/reset-reuse-response.json \
    /tmp/reset-old-login.json \
    /tmp/reset-new-login.json \
    "$CAPTURE_FILE"
}
trap cleanup EXIT
cleanup

log "Creating one user with two independent active sessions"
signup_status=$(curl --silent --output /tmp/reset-signup.json --write-out "%{http_code}" \
  --cookie-jar /tmp/reset-session-a.txt \
  --header 'content-type: application/json' \
  --data "{\"name\":\"Password Reset Pilot\",\"email\":\"$EMAIL\",\"password\":\"$OLD_PASSWORD\"}" \
  "$API_BASE/api/auth/sign-up/email")
[[ "$signup_status" = "200" ]] || fail "signup expected 200, got $signup_status"

signin_b_status=$(curl --silent --output /tmp/reset-signin-b.json --write-out "%{http_code}" \
  --cookie-jar /tmp/reset-session-b.txt \
  --header 'content-type: application/json' \
  --data "{\"email\":\"$EMAIL\",\"password\":\"$OLD_PASSWORD\"}" \
  "$API_BASE/api/auth/sign-in/email")
[[ "$signin_b_status" = "200" ]] || fail "second session sign-in expected 200, got $signin_b_status"

for cookie_file in /tmp/reset-session-a.txt /tmp/reset-session-b.txt; do
  status=$(curl --silent --output /dev/null --write-out "%{http_code}" \
    --cookie "$cookie_file" \
    "$API_BASE/api/v1/me")
  [[ "$status" = "200" ]] || fail "pre-reset session expected 200, got $status"
done

log "Requesting password reset without exposing the generated URL/token"
request_status=$(curl --silent --output /tmp/reset-request.json --write-out "%{http_code}" \
  --header 'content-type: application/json' \
  --data "{\"email\":\"$EMAIL\",\"redirectTo\":\"$API_BASE/reset-password\"}" \
  "$API_BASE/api/auth/request-password-reset")
[[ "$request_status" = "200" ]] || fail "password reset request expected 200, got $request_status"

for attempt in $(seq 1 20); do
  [[ -s "$CAPTURE_FILE" ]] && break
  sleep 0.1
done
[[ -s "$CAPTURE_FILE" ]] || fail "reset mail capture was not produced"
[[ "$(stat -c '%a' "$CAPTURE_FILE")" = "600" ]] || fail "reset mail capture permissions must be 600"

RESET_URL=$(node -e '
const fs=require("fs");
const lines=fs.readFileSync(process.argv[1],"utf8").trim().split(/\n+/);
const messages=lines.map((line)=>JSON.parse(line));
const match=[...messages].reverse().find((item)=>item.type==="password-reset" && item.to===process.argv[2]);
if(!match?.resetUrl) process.exit(2);
process.stdout.write(match.resetUrl);
' "$CAPTURE_FILE" "$EMAIL")
[[ -n "$RESET_URL" ]] || fail "captured reset URL missing"

# Exercise the actual emailed Better Auth link. It redirects to the frontend
# reset page with a short-lived token; neither URL nor token is printed.
link_status=$(curl --silent --dump-header /tmp/reset-link-headers.txt --output /tmp/reset-link-body.txt --write-out "%{http_code}" \
  "$RESET_URL")
case "$link_status" in
  301|302|303|307|308) ;;
  *) fail "reset link expected redirect, got $link_status" ;;
esac

RESET_LOCATION=$(awk 'BEGIN{IGNORECASE=1} /^location:/ { sub(/^[^:]*:[[:space:]]*/, ""); sub(/\r$/, ""); print; exit }' /tmp/reset-link-headers.txt)
[[ -n "$RESET_LOCATION" ]] || fail "reset link redirect location missing"
RESET_TOKEN=$(node -e '
const value=new URL(process.argv[1], process.argv[2]);
const token=value.searchParams.get("token");
if(!token) process.exit(2);
process.stdout.write(token);
' "$RESET_LOCATION" "$API_BASE")
[[ -n "$RESET_TOKEN" ]] || fail "reset redirect token missing"

node -e 'process.stdout.write(JSON.stringify({newPassword:process.argv[2],token:process.argv[1]}))' \
  "$RESET_TOKEN" "$NEW_PASSWORD" > /tmp/reset-payload.json

log "Resetting password and requiring old sessions to be revoked"
reset_status=$(curl --silent --output /tmp/reset-response.json --write-out "%{http_code}" \
  --header 'content-type: application/json' \
  --data @/tmp/reset-payload.json \
  "$API_BASE/api/auth/reset-password")
[[ "$reset_status" = "200" ]] || fail "reset password expected 200, got $reset_status"

for cookie_file in /tmp/reset-session-a.txt /tmp/reset-session-b.txt; do
  status=$(curl --silent --output /dev/null --write-out "%{http_code}" \
    --cookie "$cookie_file" \
    "$API_BASE/api/v1/me")
  [[ "$status" = "401" ]] || fail "old session expected 401 after reset, got $status"
done

reuse_status=$(curl --silent --output /tmp/reset-reuse-response.json --write-out "%{http_code}" \
  --header 'content-type: application/json' \
  --data @/tmp/reset-payload.json \
  "$API_BASE/api/auth/reset-password")
[[ "$reuse_status" != "200" ]] || fail "password reset token unexpectedly reusable"

old_login_status=$(curl --silent --output /tmp/reset-old-login.json --write-out "%{http_code}" \
  --header 'content-type: application/json' \
  --data "{\"email\":\"$EMAIL\",\"password\":\"$OLD_PASSWORD\"}" \
  "$API_BASE/api/auth/sign-in/email")
[[ "$old_login_status" != "200" ]] || fail "old password unexpectedly still valid"

new_login_status=$(curl --silent --output /tmp/reset-new-login.json --write-out "%{http_code}" \
  --cookie-jar /tmp/reset-session-new.txt \
  --header 'content-type: application/json' \
  --data "{\"email\":\"$EMAIL\",\"password\":\"$NEW_PASSWORD\"}" \
  "$API_BASE/api/auth/sign-in/email")
[[ "$new_login_status" = "200" ]] || fail "new password sign-in expected 200, got $new_login_status"

new_me_status=$(curl --silent --output /dev/null --write-out "%{http_code}" \
  --cookie /tmp/reset-session-new.txt \
  "$API_BASE/api/v1/me")
[[ "$new_me_status" = "200" ]] || fail "new session expected 200, got $new_me_status"

log "PASSWORD RESET GATE PASS"
