#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${STAGING_BASE_URL:?set STAGING_BASE_URL, e.g. https://magina-staging.example.com}"
EMAIL="${STAGING_GATE_EMAIL:?set STAGING_GATE_EMAIL for a synthetic staging account}"
PASSWORD="${STAGING_GATE_PASSWORD:?set STAGING_GATE_PASSWORD for the synthetic staging account}"

log() {
  printf '[staging-https-gate] %s\n' "$*"
}

fail() {
  printf '[staging-https-gate] ERROR: %s\n' "$*" >&2
  exit 1
}

case "$BASE_URL" in
  https://*) ;;
  *) fail "STAGING_BASE_URL must use https://" ;;
esac

BASE_URL="${BASE_URL%/}"
rm -f /tmp/magina-staging-cookies.txt

log "Checking public HTTPS readiness"
ready_status=$(curl --proto '=https' --tlsv1.2 --silent --output /tmp/staging-ready.json --write-out '%{http_code}' \
  "$BASE_URL/health/ready")
[[ "$ready_status" = "200" ]] || fail "readiness expected 200, got $ready_status"
grep -q '"status":"ready"' /tmp/staging-ready.json || fail "readiness body is not ready"

root_status=$(curl --proto '=https' --tlsv1.2 --silent --dump-header /tmp/staging-root-headers.txt \
  --output /dev/null --write-out '%{http_code}' "$BASE_URL/")
[[ "$root_status" = "200" ]] || fail "root expected 200, got $root_status"
grep -qi '^strict-transport-security:' /tmp/staging-root-headers.txt || fail "HSTS header missing"
grep -qi '^x-content-type-options: nosniff' /tmp/staging-root-headers.txt || fail "nosniff header missing on web entry"

log "Signing in without printing the token-bearing response"
signin_status=$(curl --proto '=https' --tlsv1.2 --silent \
  --dump-header /tmp/staging-signin-headers.txt \
  --output /tmp/staging-signin.json \
  --write-out '%{http_code}' \
  --cookie-jar /tmp/magina-staging-cookies.txt \
  --header 'content-type: application/json' \
  --header "Origin: $BASE_URL" \
  --header 'Sec-Fetch-Site: same-origin' \
  --data "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  "$BASE_URL/api/auth/sign-in/email")
[[ "$signin_status" = "200" ]] || fail "sign-in expected 200, got $signin_status"

grep -qi '^set-cookie:.*httponly' /tmp/staging-signin-headers.txt || fail "session cookie missing HttpOnly"
grep -qi '^set-cookie:.*secure' /tmp/staging-signin-headers.txt || fail "session cookie missing Secure"
grep -qi '^set-cookie:.*samesite=lax' /tmp/staging-signin-headers.txt || fail "session cookie missing SameSite=Lax"

log "Checking authenticated private response"
me_status=$(curl --proto '=https' --tlsv1.2 --silent \
  --dump-header /tmp/staging-me-headers.txt \
  --output /tmp/staging-me.json \
  --write-out '%{http_code}' \
  --cookie /tmp/magina-staging-cookies.txt \
  "$BASE_URL/api/v1/me")
[[ "$me_status" = "200" ]] || fail "/me expected 200, got $me_status"
grep -q "$EMAIL" /tmp/staging-me.json || fail "authenticated user mismatch"
grep -qi '^cache-control: no-store' /tmp/staging-me-headers.txt || fail "private response missing no-store"
grep -qi '^content-security-policy:' /tmp/staging-me-headers.txt || fail "private API response missing CSP"

log "Signing out and proving session revocation"
signout_status=$(curl --proto '=https' --tlsv1.2 --silent \
  --output /tmp/staging-signout.json \
  --write-out '%{http_code}' \
  --cookie /tmp/magina-staging-cookies.txt \
  --cookie-jar /tmp/magina-staging-cookies.txt \
  --header 'content-type: application/json' \
  --header "Origin: $BASE_URL" \
  --header 'Sec-Fetch-Site: same-origin' \
  --data '{}' \
  "$BASE_URL/api/auth/sign-out")
[[ "$signout_status" = "200" ]] || fail "sign-out expected 200, got $signout_status"

after_logout_status=$(curl --proto '=https' --tlsv1.2 --silent \
  --output /tmp/staging-me-after-logout.json \
  --write-out '%{http_code}' \
  --cookie /tmp/magina-staging-cookies.txt \
  "$BASE_URL/api/v1/me")
[[ "$after_logout_status" = "401" ]] || fail "session remained valid after logout: HTTP $after_logout_status"

log "STAGING HTTPS GATE PASS"
