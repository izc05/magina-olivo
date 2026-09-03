#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${STAGING_BASE_URL:?set STAGING_BASE_URL, e.g. https://magina-staging.example.com}"
PARTICIPANT_ID="${PILOT_PARTICIPANT_ID:?set PILOT_PARTICIPANT_ID, e.g. p01}"
PARTICIPANT_NAME="${PILOT_PARTICIPANT_NAME:-Piloto ${PARTICIPANT_ID}}"
CREDENTIALS_DIR="${PILOT_CREDENTIALS_DIR:-.deploy/pilot}"

log() {
  printf '[pilot-participant] %s\n' "$*"
}

fail() {
  printf '[pilot-participant] ERROR: %s\n' "$*" >&2
  exit 1
}

case "$BASE_URL" in
  https://*) ;;
  *) fail "STAGING_BASE_URL must use https://" ;;
esac
BASE_URL="${BASE_URL%/}"

[[ "$PARTICIPANT_ID" =~ ^[a-z0-9][a-z0-9-]{1,31}$ ]] \
  || fail "PILOT_PARTICIPANT_ID must match ^[a-z0-9][a-z0-9-]{1,31}$"

ACCESS_HEADERS=()
if [[ -n "${CF_ACCESS_CLIENT_ID:-}" || -n "${CF_ACCESS_CLIENT_SECRET:-}" ]]; then
  [[ -n "${CF_ACCESS_CLIENT_ID:-}" && -n "${CF_ACCESS_CLIENT_SECRET:-}" ]] \
    || fail "both CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET must be set"
  ACCESS_HEADERS+=(
    --header "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID"
    --header "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET"
  )
fi

RUN_SUFFIX="$(date -u +%Y%m%dT%H%M%SZ)-$$"
EMAIL="${PILOT_PARTICIPANT_EMAIL:-magina-pilot-${PARTICIPANT_ID}-${RUN_SUFFIX}@example.com}"
PASSWORD="${PILOT_PARTICIPANT_PASSWORD:-$(node -e "process.stdout.write(require('crypto').randomBytes(18).toString('base64url') + 'Aa1!')")}" 

TMP_DIR="$(mktemp -d)"
COOKIE_FILE="$TMP_DIR/cookies.txt"
CREDENTIALS_FILE="$CREDENTIALS_DIR/${PARTICIPANT_ID}-${RUN_SUFFIX}.credentials"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$CREDENTIALS_DIR"
chmod 700 "$CREDENTIALS_DIR"

log "Checking staging readiness"
ready_status=$(curl --proto '=https' --tlsv1.2 --silent --show-error \
  "${ACCESS_HEADERS[@]}" \
  --output "$TMP_DIR/ready.json" --write-out '%{http_code}' \
  "$BASE_URL/health/ready")
[[ "$ready_status" = "200" ]] || fail "readiness expected 200, got $ready_status"

grep -q '"status":"ready"' "$TMP_DIR/ready.json" || fail "staging is not ready"

signup_body=$(node -e '
  const [name, email, password] = process.argv.slice(1);
  process.stdout.write(JSON.stringify({ name, email, password }));
' "$PARTICIPANT_NAME" "$EMAIL" "$PASSWORD")

log "Creating isolated synthetic participant account"
signup_status=$(curl --proto '=https' --tlsv1.2 --silent --show-error \
  "${ACCESS_HEADERS[@]}" \
  --output "$TMP_DIR/signup.json" --write-out '%{http_code}' \
  --cookie-jar "$COOKIE_FILE" \
  --header 'content-type: application/json' \
  --header "Origin: $BASE_URL" \
  --header 'Sec-Fetch-Site: same-origin' \
  --data "$signup_body" \
  "$BASE_URL/api/auth/sign-up/email")
[[ "$signup_status" = "200" ]] || fail "participant sign-up expected 200, got $signup_status"
chmod 600 "$COOKIE_FILE" 2>/dev/null || true

# Persist the credentials immediately after account creation so a later validation
# failure does not leave an inaccessible synthetic account behind.
umask 077
cat > "$CREDENTIALS_FILE" <<EOF
Mágina Olivo · cuenta sintética de piloto
Participant: $PARTICIPANT_ID
Name: $PARTICIPANT_NAME
Email: $EMAIL
Password: $PASSWORD
Staging: $BASE_URL
Created UTC: $RUN_SUFFIX

Uso exclusivo de staging. No reutilizar esta contraseña ni estos datos en producción.
EOF
chmod 600 "$CREDENTIALS_FILE"

log "Verifying authenticated identity"
me_status=$(curl --proto '=https' --tlsv1.2 --silent --show-error \
  "${ACCESS_HEADERS[@]}" \
  --output "$TMP_DIR/me.json" --write-out '%{http_code}' \
  --cookie "$COOKIE_FILE" \
  "$BASE_URL/api/v1/me")
[[ "$me_status" = "200" ]] || fail "/me expected 200, got $me_status"
node - "$TMP_DIR/me.json" "$EMAIL" <<'NODE'
const fs = require('fs');
const [file, email] = process.argv.slice(2);
const value = JSON.parse(fs.readFileSync(file, 'utf8'));
if (value?.user?.email !== email) {
  throw new Error(`Authenticated participant mismatch: expected ${email}`);
}
NODE

log "Proving participant starts with zero private holdings"
holdings_status=$(curl --proto '=https' --tlsv1.2 --silent --show-error \
  "${ACCESS_HEADERS[@]}" \
  --output "$TMP_DIR/holdings.json" --write-out '%{http_code}' \
  --cookie "$COOKIE_FILE" \
  "$BASE_URL/api/v1/holdings")
[[ "$holdings_status" = "200" ]] || fail "holdings expected 200, got $holdings_status"
node - "$TMP_DIR/holdings.json" <<'NODE'
const fs = require('fs');
const value = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!Array.isArray(value?.items)) throw new Error('Holdings response has no items array');
if (value.items.length !== 0) throw new Error(`Participant is not clean: ${value.items.length} holding(s) found`);
NODE

log "Signing out facilitator-side session"
signout_status=$(curl --proto '=https' --tlsv1.2 --silent --show-error \
  "${ACCESS_HEADERS[@]}" \
  --output "$TMP_DIR/signout.json" --write-out '%{http_code}' \
  --cookie "$COOKIE_FILE" \
  --cookie-jar "$COOKIE_FILE" \
  --header 'content-type: application/json' \
  --header "Origin: $BASE_URL" \
  --header 'Sec-Fetch-Site: same-origin' \
  --data '{}' \
  "$BASE_URL/api/auth/sign-out")
[[ "$signout_status" = "200" ]] || fail "sign-out expected 200, got $signout_status"

after_logout_status=$(curl --proto '=https' --tlsv1.2 --silent --show-error \
  "${ACCESS_HEADERS[@]}" \
  --output "$TMP_DIR/me-after-logout.json" --write-out '%{http_code}' \
  --cookie "$COOKIE_FILE" \
  "$BASE_URL/api/v1/me")
[[ "$after_logout_status" = "401" ]] || fail "facilitator session remained valid after sign-out: HTTP $after_logout_status"

log "PASS participant=$PARTICIPANT_ID clean=true"
log "Credentials saved locally with mode 0600: $CREDENTIALS_FILE"
log "Do not commit or paste the credential file into issues, PRs or chat."
