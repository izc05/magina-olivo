#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://127.0.0.1:3001}"
COOPERATIVE_ID="10000000-0000-4000-8000-000000000018"
COOKIE_JAR="/tmp/magina-account-preferences-cookies.txt"

log() {
  printf '[account-preferences-gate] %s\n' "$*"
}

fail() {
  printf '[account-preferences-gate] ERROR: %s\n' "$*" >&2
  exit 1
}

rm -f "$COOKIE_JAR" /tmp/account-pref-*.json

unauth_status=$(curl --silent --output /tmp/account-pref-unauth.json --write-out "%{http_code}" \
  "$API_BASE/api/v1/account/preferences")
[[ "$unauth_status" = "401" ]] || fail "unauthenticated preferences expected 401, got $unauth_status"

log "Creating synthetic account"
signup_status=$(curl --silent --output /tmp/account-pref-signup.json --write-out "%{http_code}" \
  --cookie-jar "$COOKIE_JAR" \
  --header 'content-type: application/json' \
  --data '{"name":"Account Preferences Gate","email":"account-preferences@example.com","password":"correct-horse-battery-staple"}' \
  "$API_BASE/api/auth/sign-up/email")
[[ "$signup_status" = "200" ]] || fail "signup expected 200, got $signup_status"

log "Checking deterministic defaults"
default_status=$(curl --silent --output /tmp/account-pref-defaults.json --write-out "%{http_code}" \
  --cookie "$COOKIE_JAR" \
  "$API_BASE/api/v1/account/preferences")
[[ "$default_status" = "200" ]] || fail "preferences GET expected 200, got $default_status"
node - /tmp/account-pref-defaults.json <<'NODE'
const fs = require('fs');
const value = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (value.preferredCooperativeId !== null) throw new Error('default cooperative must be null');
if (value.notifyWeather !== true || value.notifyTasks !== true || value.notifyPendingYield !== true) throw new Error('default notifications must be enabled');
if (Number(value.weatherRainProbabilityPercentThreshold) !== 60) throw new Error('rain probability default mismatch');
if (Number(value.weatherFrostCThreshold) !== 0) throw new Error('frost default mismatch');
if (Number(value.weatherWindKmhThreshold) !== 50) throw new Error('wind default mismatch');
NODE

log "Saving preferences"
update_status=$(curl --silent --output /tmp/account-pref-updated.json --write-out "%{http_code}" \
  --cookie "$COOKIE_JAR" \
  --header 'content-type: application/json' \
  --data "{\"preferredCooperativeId\":\"$COOPERATIVE_ID\",\"notifyWeather\":true,\"notifyTasks\":false,\"notifyPendingYield\":true,\"weatherRainProbabilityPercentThreshold\":75,\"weatherFrostCThreshold\":-1.5,\"weatherWindKmhThreshold\":65}" \
  "$API_BASE/api/v1/account/preferences" \
  --request PUT)
[[ "$update_status" = "200" ]] || fail "preferences PUT expected 200, got $update_status"

log "Verifying persisted values"
curl --fail --silent --cookie "$COOKIE_JAR" \
  "$API_BASE/api/v1/account/preferences" > /tmp/account-pref-persisted.json
node - /tmp/account-pref-persisted.json "$COOPERATIVE_ID" <<'NODE'
const fs = require('fs');
const value = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const cooperativeId = process.argv[3];
if (value.preferredCooperativeId !== cooperativeId) throw new Error('preferred cooperative did not persist');
if (value.notifyWeather !== true || value.notifyTasks !== false || value.notifyPendingYield !== true) throw new Error('notification preferences did not persist');
if (Number(value.weatherRainProbabilityPercentThreshold) !== 75) throw new Error('rain probability threshold did not persist');
if (Number(value.weatherFrostCThreshold) !== -1.5) throw new Error('frost threshold did not persist');
if (Number(value.weatherWindKmhThreshold) !== 65) throw new Error('wind threshold did not persist');
NODE

log "Rejecting an unknown cooperative"
invalid_status=$(curl --silent --output /tmp/account-pref-invalid.json --write-out "%{http_code}" \
  --cookie "$COOKIE_JAR" \
  --header 'content-type: application/json' \
  --data '{"preferredCooperativeId":"99999999-9999-4999-8999-999999999999","notifyWeather":true,"notifyTasks":true,"notifyPendingYield":true,"weatherRainProbabilityPercentThreshold":60,"weatherFrostCThreshold":0,"weatherWindKmhThreshold":50}' \
  "$API_BASE/api/v1/account/preferences" \
  --request PUT)
[[ "$invalid_status" = "400" ]] || fail "unknown cooperative expected 400, got $invalid_status"
grep -q 'INVALID_PREFERRED_COOPERATIVE' /tmp/account-pref-invalid.json || fail "invalid cooperative error code missing"

log "PASS"
