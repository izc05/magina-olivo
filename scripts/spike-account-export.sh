#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://127.0.0.1:3001}"

log() {
  printf '[account-export-gate] %s\n' "$*"
}

fail() {
  printf '[account-export-gate] ERROR: %s\n' "$*" >&2
  exit 1
}

json_value() {
  local file="$1"
  local expression="$2"
  node -e "const fs=require('fs');const value=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const result=(${expression});if(result===undefined||result===null)process.exit(2);process.stdout.write(String(result));" "$file"
}

rm -f /tmp/account-export-a.cookies /tmp/account-export-b.cookies /tmp/account-export-*.json /tmp/account-export-*.headers
TASK_DATE=$(date -u -d 'tomorrow' +%F)

log "Registering isolated portability users"
status=$(curl --silent --output /tmp/account-export-signup-a.json --write-out "%{http_code}" \
  --cookie-jar /tmp/account-export-a.cookies \
  --header 'content-type: application/json' \
  --data '{"name":"Portability A","email":"portability-a@example.com","password":"correct-horse-battery-staple"}' \
  "$API_BASE/api/auth/sign-up/email")
[[ "$status" = "200" ]] || fail "Portability A signup expected 200, got $status"

status=$(curl --silent --output /tmp/account-export-signup-b.json --write-out "%{http_code}" \
  --cookie-jar /tmp/account-export-b.cookies \
  --header 'content-type: application/json' \
  --data '{"name":"Portability B","email":"portability-b@example.com","password":"correct-horse-battery-staple"}' \
  "$API_BASE/api/auth/sign-up/email")
[[ "$status" = "200" ]] || fail "Portability B signup expected 200, got $status"

log "Creating one owned holding per user"
status=$(curl --silent --output /tmp/account-export-holding-a.json --write-out "%{http_code}" \
  --cookie /tmp/account-export-a.cookies \
  --header 'content-type: application/json' \
  --data '{"name":"Portability Holding A","municipality":"Bedmar","province":"Jaen"}' \
  "$API_BASE/api/v1/holdings")
[[ "$status" = "201" ]] || fail "Holding A expected 201, got $status"
HOLDING_A=$(json_value /tmp/account-export-holding-a.json 'value.id')

status=$(curl --silent --output /tmp/account-export-holding-b.json --write-out "%{http_code}" \
  --cookie /tmp/account-export-b.cookies \
  --header 'content-type: application/json' \
  --data '{"name":"Portability Holding B","municipality":"Huelma","province":"Jaen"}' \
  "$API_BASE/api/v1/holdings")
[[ "$status" = "201" ]] || fail "Holding B expected 201, got $status"
HOLDING_B=$(json_value /tmp/account-export-holding-b.json 'value.id')

log "Saving a preference that must be portable"
status=$(curl --silent --output /tmp/account-export-prefs-a.json --write-out "%{http_code}" \
  --cookie /tmp/account-export-a.cookies \
  --header 'content-type: application/json' \
  --request PUT \
  --data '{"preferredCooperativeId":null,"notifyWeather":false,"notifyTasks":true,"notifyPendingYield":true,"weatherRainMmThreshold":7.5,"weatherFrostCThreshold":-1,"weatherWindKmhThreshold":55}' \
  "$API_BASE/api/v1/account/preferences")
[[ "$status" = "200" ]] || fail "Preference update expected 200, got $status"

log "Creating one private task per user before export"
status=$(curl --silent --output /tmp/account-export-task-a.json --write-out "%{http_code}" \
  --cookie /tmp/account-export-a.cookies \
  --header 'content-type: application/json' \
  --data "{\"title\":\"Tarea portable A\",\"dueDate\":\"$TASK_DATE\",\"priority\":\"high\",\"reminderDaysBefore\":1}" \
  "$API_BASE/api/v1/holdings/$HOLDING_A/tasks")
[[ "$status" = "201" ]] || fail "Task A expected 201, got $status"
TASK_A=$(json_value /tmp/account-export-task-a.json 'value.id')

status=$(curl --silent --output /tmp/account-export-task-b.json --write-out "%{http_code}" \
  --cookie /tmp/account-export-b.cookies \
  --header 'content-type: application/json' \
  --data "{\"title\":\"Tarea privada B\",\"dueDate\":\"$TASK_DATE\",\"priority\":\"normal\"}" \
  "$API_BASE/api/v1/holdings/$HOLDING_B/tasks")
[[ "$status" = "201" ]] || fail "Task B expected 201, got $status"
TASK_B=$(json_value /tmp/account-export-task-b.json 'value.id')

unauth=$(curl --silent --output /tmp/account-export-unauth.json --write-out "%{http_code}" \
  "$API_BASE/api/v1/account/exports")
[[ "$unauth" = "401" ]] || fail "Unauthenticated export listing expected 401, got $unauth"

log "Requesting asynchronous structured export"
status=$(curl --silent --output /tmp/account-export-request-a.json --write-out "%{http_code}" \
  --cookie /tmp/account-export-a.cookies \
  --request POST \
  "$API_BASE/api/v1/account/exports")
[[ "$status" = "202" ]] || fail "Export request expected 202, got $status"
EXPORT_A=$(json_value /tmp/account-export-request-a.json 'value.export.id')

log "Checking cross-user download isolation before generation"
status=$(curl --silent --output /tmp/account-export-cross-before.json --write-out "%{http_code}" \
  --cookie /tmp/account-export-b.cookies \
  "$API_BASE/api/v1/account/exports/$EXPORT_A/download")
[[ "$status" = "404" ]] || fail "User B download of A export expected 404, got $status"

log "Running durable worker until export is ready"
ready=0
for attempt in $(seq 1 10); do
  RUN_ONCE=1 WORKER_ID="account-export-gate-$attempt" npm run start --workspace @magina/worker > /tmp/account-export-worker.log 2>&1
  curl --fail --silent --cookie /tmp/account-export-a.cookies "$API_BASE/api/v1/account/exports" > /tmp/account-export-list-a.json
  export_status=$(json_value /tmp/account-export-list-a.json 'value.items[0]?.status')
  if [[ "$export_status" = "ready" ]]; then
    ready=1
    break
  fi
  if [[ "$export_status" = "failed" ]]; then
    cat /tmp/account-export-worker.log >&2 || true
    fail "Export entered failed state"
  fi
  sleep 1
done
[[ "$ready" = "1" ]] || { cat /tmp/account-export-worker.log >&2 || true; fail "Export did not become ready"; }

EXPECTED_SHA=$(json_value /tmp/account-export-list-a.json 'value.items[0]?.sha256')
DOWNLOAD_URL=$(json_value /tmp/account-export-list-a.json 'value.items[0]?.downloadUrl')
[[ "$DOWNLOAD_URL" = "/api/v1/account/exports/$EXPORT_A/download" ]] || fail "Unexpected download URL"

log "Downloading exact artifact and verifying integrity"
status=$(curl --silent --dump-header /tmp/account-export-download.headers --output /tmp/account-export-download.json --write-out "%{http_code}" \
  --cookie /tmp/account-export-a.cookies \
  "$API_BASE$DOWNLOAD_URL")
[[ "$status" = "200" ]] || fail "Ready export download expected 200, got $status"
grep -qi '^cache-control:.*no-store' /tmp/account-export-download.headers || fail "Export download missing no-store cache policy"
grep -qi '^content-disposition: attachment;' /tmp/account-export-download.headers || fail "Export download missing attachment disposition"
ACTUAL_SHA=$(sha256sum /tmp/account-export-download.json | awk '{print $1}')
[[ "$ACTUAL_SHA" = "$EXPECTED_SHA" ]] || fail "Downloaded export SHA-256 mismatch"
HEADER_SHA=$(awk -F': ' 'tolower($1)=="x-content-sha256" {gsub("\r", "", $2); print $2}' /tmp/account-export-download.headers)
[[ "$HEADER_SHA" = "$EXPECTED_SHA" ]] || fail "X-Content-SHA256 header mismatch"

EXPORT_FILE=/tmp/account-export-download.json HOLDING_A="$HOLDING_A" TASK_A="$TASK_A" TASK_B="$TASK_B" node --input-type=module <<'NODE'
import fs from 'node:fs';
const value = JSON.parse(fs.readFileSync(process.env.EXPORT_FILE, 'utf8'));
if (value.schemaVersion !== 1) throw new Error('schemaVersion must be 1');
if (value.scope?.kind !== 'owned_holdings') throw new Error('owned_holdings scope missing');
if (value.account?.email !== 'portability-a@example.com') throw new Error('account snapshot missing');
if (value.preferences?.notifyWeather !== false) throw new Error('preferences were not exported');
if (value.preferences?.weatherRainMmThreshold !== 7.5) throw new Error('numeric preference mismatch');
if (!value.holdings?.some((item) => item.id === process.env.HOLDING_A && item.name === 'Portability Holding A')) {
  throw new Error('owned holding missing from export');
}
if (value.holdings?.some((item) => item.name === 'Portability Holding B')) {
  throw new Error('cross-user holding leaked into export');
}
if (!Array.isArray(value.tasks)) throw new Error('tasks array missing from structured export');
if (!value.tasks.some((item) => item.id === process.env.TASK_A && item.holdingId === process.env.HOLDING_A)) {
  throw new Error('owned task missing from export');
}
if (value.tasks.some((item) => item.id === process.env.TASK_B || item.title === 'Tarea privada B')) {
  throw new Error('cross-user task leaked into export');
}
const raw = fs.readFileSync(process.env.EXPORT_FILE, 'utf8');
if (raw.includes('object_key')) throw new Error('private object key leaked into export');
NODE

log "Checking cross-user isolation after generation"
status=$(curl --silent --output /tmp/account-export-cross-after.json --write-out "%{http_code}" \
  --cookie /tmp/account-export-b.cookies \
  "$API_BASE/api/v1/account/exports/$EXPORT_A/download")
[[ "$status" = "404" ]] || fail "User B download of ready A export expected 404, got $status"

log "Verifying a valid export request is idempotent while artifact is current"
status=$(curl --silent --output /tmp/account-export-request-a-again.json --write-out "%{http_code}" \
  --cookie /tmp/account-export-a.cookies \
  --request POST \
  "$API_BASE/api/v1/account/exports")
[[ "$status" = "200" ]] || fail "Second current export request expected 200, got $status"
EXPORT_A_AGAIN=$(json_value /tmp/account-export-request-a-again.json 'value.export.id')
[[ "$EXPORT_A_AGAIN" = "$EXPORT_A" ]] || fail "Current export request created a duplicate artifact"

log "Forcing expiry and verifying cleanup"
EXPORT_ID="$EXPORT_A" node --input-type=module <<'NODE'
import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query("update account_exports set expires_at = now() - interval '1 minute' where id = $1", [process.env.EXPORT_ID]);
await client.end();
NODE
RUN_ONCE=1 WORKER_ID="account-export-expiry-gate" npm run start --workspace @magina/worker > /tmp/account-export-expiry-worker.log 2>&1

curl --fail --silent --cookie /tmp/account-export-a.cookies "$API_BASE/api/v1/account/exports" > /tmp/account-export-list-expired.json
expired_status=$(json_value /tmp/account-export-list-expired.json 'value.items[0]?.status')
[[ "$expired_status" = "expired" ]] || fail "Expired artifact expected status expired, got $expired_status"

status=$(curl --silent --output /tmp/account-export-expired-download.json --write-out "%{http_code}" \
  --cookie /tmp/account-export-a.cookies \
  "$API_BASE/api/v1/account/exports/$EXPORT_A/download")
[[ "$status" = "410" ]] || fail "Expired export download expected 410, got $status"

EXPORT_ID="$EXPORT_A" node --input-type=module <<'NODE'
import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const result = await client.query('select status, artifact_text from account_exports where id = $1', [process.env.EXPORT_ID]);
await client.end();
if (result.rows[0]?.status !== 'expired') throw new Error('database export status is not expired');
if (result.rows[0]?.artifact_text !== null) throw new Error('expired export artifact was not cleared');
NODE

log "Account export gate passed"
