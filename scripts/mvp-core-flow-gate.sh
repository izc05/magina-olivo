#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://127.0.0.1:3001}"
RUN_SUFFIX="${RUN_SUFFIX:-$(date +%s)-$$}"
PASSWORD="${MVP_GATE_PASSWORD:-mvp-gate-correct-horse-battery-staple}"
TMP_DIR="$(mktemp -d)"
COOKIE_A="$TMP_DIR/cookies-a.txt"
COOKIE_B="$TMP_DIR/cookies-b.txt"
EMAIL_A="mvp-gate-a-${RUN_SUFFIX}@example.com"
EMAIL_B="mvp-gate-b-${RUN_SUFFIX}@example.com"

ACCESS_HEADERS=()
if [[ -n "${CF_ACCESS_CLIENT_ID:-}" || -n "${CF_ACCESS_CLIENT_SECRET:-}" ]]; then
  [[ -n "${CF_ACCESS_CLIENT_ID:-}" && -n "${CF_ACCESS_CLIENT_SECRET:-}" ]] \
    || { printf '[mvp-core-gate] ERROR: both CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET must be set\n' >&2; exit 1; }
  ACCESS_HEADERS+=(
    --header "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID"
    --header "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET"
  )
fi

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

log() {
  printf '[mvp-core-gate] %s\n' "$*"
}

fail() {
  printf '[mvp-core-gate] ERROR: %s\n' "$*" >&2
  exit 1
}

curl_access() {
  command curl "${ACCESS_HEADERS[@]}" "$@"
}

json_value() {
  local file="$1"
  local expression="$2"
  node -e "const fs=require('fs');const value=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const result=(${expression});if(result===undefined||result===null)process.exit(2);process.stdout.write(String(result));" "$file"
}

uuid() {
  node -e "process.stdout.write(require('crypto').randomUUID())"
}

post_json() {
  local cookie_file="$1"
  local output_file="$2"
  local body="$3"
  local url="$4"
  curl_access --silent --output "$output_file" --write-out '%{http_code}' \
    --cookie "$cookie_file" \
    --header 'content-type: application/json' \
    --data "$body" \
    "$url"
}

log "Checking liveness"
live_status=$(curl_access --silent --output "$TMP_DIR/live.json" --write-out '%{http_code}' "$API_BASE/health/live")
[[ "$live_status" = "200" ]] || fail "health/live expected 200, got $live_status"

log "Creating two isolated synthetic users"
signup_a_body=$(printf '{"name":"MVP Gate A","email":"%s","password":"%s"}' "$EMAIL_A" "$PASSWORD")
signup_a_status=$(curl_access --silent --output "$TMP_DIR/signup-a.json" --write-out '%{http_code}' \
  --cookie-jar "$COOKIE_A" \
  --header 'content-type: application/json' \
  --data "$signup_a_body" \
  "$API_BASE/api/auth/sign-up/email")
[[ "$signup_a_status" = "200" ]] || fail "user A signup expected 200, got $signup_a_status"

signup_b_body=$(printf '{"name":"MVP Gate B","email":"%s","password":"%s"}' "$EMAIL_B" "$PASSWORD")
signup_b_status=$(curl_access --silent --output "$TMP_DIR/signup-b.json" --write-out '%{http_code}' \
  --cookie-jar "$COOKIE_B" \
  --header 'content-type: application/json' \
  --data "$signup_b_body" \
  "$API_BASE/api/auth/sign-up/email")
[[ "$signup_b_status" = "200" ]] || fail "user B signup expected 200, got $signup_b_status"

me_status=$(curl_access --silent --output "$TMP_DIR/me-a.json" --write-out '%{http_code}' --cookie "$COOKIE_A" "$API_BASE/api/v1/me")
[[ "$me_status" = "200" ]] || fail "authenticated /me expected 200"
grep -q "$EMAIL_A" "$TMP_DIR/me-a.json" || fail "user A session mismatch"

log "Creating holding -> farm -> plot -> campaign"
holding_status=$(post_json "$COOKIE_A" "$TMP_DIR/holding.json" \
  '{"name":"MVP Gate Holding","municipality":"Bedmar","province":"Jaén"}' \
  "$API_BASE/api/v1/holdings")
[[ "$holding_status" = "201" ]] || fail "holding expected 201, got $holding_status"
HOLDING_ID=$(json_value "$TMP_DIR/holding.json" 'value.id')

foreign_holding_status=$(curl_access --silent --output "$TMP_DIR/foreign-holding.json" --write-out '%{http_code}' \
  --cookie "$COOKIE_B" "$API_BASE/api/v1/holdings/$HOLDING_ID/farms")
[[ "$foreign_holding_status" = "404" ]] || fail "foreign holding access expected 404"

farm_status=$(post_json "$COOKIE_A" "$TMP_DIR/farm.json" \
  '{"name":"Las Viñas","areaHa":3.25}' \
  "$API_BASE/api/v1/holdings/$HOLDING_ID/farms")
[[ "$farm_status" = "201" ]] || fail "farm expected 201, got $farm_status"
FARM_ID=$(json_value "$TMP_DIR/farm.json" 'value.id')

plot_status=$(post_json "$COOKIE_A" "$TMP_DIR/plot.json" \
  '{"name":"Parcela Norte","areaHa":1.75,"irrigationType":"dryland","oliveTreeCount":210,"sigpacReference":"SYNTHETIC-GATE"}' \
  "$API_BASE/api/v1/farms/$FARM_ID/plots")
[[ "$plot_status" = "201" ]] || fail "plot expected 201, got $plot_status"
PLOT_ID=$(json_value "$TMP_DIR/plot.json" 'value.id')

campaign_status=$(post_json "$COOKIE_A" "$TMP_DIR/campaign.json" \
  '{"name":"Campaña sintética 2026/27","seasonStartYear":2026,"startDate":"2026-10-01"}' \
  "$API_BASE/api/v1/holdings/$HOLDING_ID/campaigns")
[[ "$campaign_status" = "201" ]] || fail "campaign expected 201, got $campaign_status"
CAMPAIGN_ID=$(json_value "$TMP_DIR/campaign.json" 'value.id')

log "Creating one idempotent 1,842 kg delivery"
DELIVERY_ID="$(uuid)"
DELIVERY_BODY=$(printf '{"deliveredAt":"2026-11-18T18:42:00+01:00","kilograms":"1842.000","customDestination":"Almazara sintética","farmId":"%s","plotId":"%s","ticketNumber":"004281","variety":"Picual","clientGeneratedId":"%s"}' "$FARM_ID" "$PLOT_ID" "$DELIVERY_ID")

delivery_status=$(curl_access --silent --output "$TMP_DIR/delivery.json" --write-out '%{http_code}' \
  --cookie "$COOKIE_A" \
  --header 'content-type: application/json' \
  --header "Idempotency-Key: $DELIVERY_ID" \
  --data "$DELIVERY_BODY" \
  "$API_BASE/api/v1/campaigns/$CAMPAIGN_ID/deliveries")
[[ "$delivery_status" = "201" ]] || fail "delivery expected 201, got $delivery_status"
[[ "$(json_value "$TMP_DIR/delivery.json" 'value.id')" = "$DELIVERY_ID" ]] || fail "delivery did not preserve clientGeneratedId"

replay_status=$(curl_access --silent --output "$TMP_DIR/delivery-replay.json" --write-out '%{http_code}' \
  --cookie "$COOKIE_A" \
  --header 'content-type: application/json' \
  --header "Idempotency-Key: $DELIVERY_ID" \
  --data "$DELIVERY_BODY" \
  "$API_BASE/api/v1/campaigns/$CAMPAIGN_ID/deliveries")
[[ "$replay_status" = "201" ]] || fail "delivery replay expected original 201, got $replay_status"
[[ "$(json_value "$TMP_DIR/delivery-replay.json" 'value.id')" = "$DELIVERY_ID" ]] || fail "delivery replay returned a different id"

curl_access --fail --silent --cookie "$COOKIE_A" "$API_BASE/api/v1/campaigns/$CAMPAIGN_ID/deliveries" > "$TMP_DIR/deliveries.json"
[[ "$(json_value "$TMP_DIR/deliveries.json" 'value.items.length')" = "1" ]] || fail "delivery replay created a duplicate"

log "Adding delayed yield"
yield_status=$(post_json "$COOKIE_A" "$TMP_DIR/yield.json" \
  '{"value":"21.9000","measuredAt":"2026-11-20T12:00:00+01:00"}' \
  "$API_BASE/api/v1/deliveries/$DELIVERY_ID/results")
[[ "$yield_status" = "201" ]] || fail "yield expected 201, got $yield_status"

log "Creating retry-safe pruning activity"
ACTIVITY_ID="$(uuid)"
ACTIVITY_BODY=$(printf '{"activityType":"pruning","occurredAt":"2026-03-14T09:30:00+01:00","clientGeneratedId":"%s","campaignId":"%s","farmId":"%s","plotId":"%s","affectedAreaHa":1.75,"costEur":85.50,"notes":"Poda sintética de gate"}' "$ACTIVITY_ID" "$CAMPAIGN_ID" "$FARM_ID" "$PLOT_ID")
activity_status=$(post_json "$COOKIE_A" "$TMP_DIR/activity.json" "$ACTIVITY_BODY" "$API_BASE/api/v1/holdings/$HOLDING_ID/activities")
[[ "$activity_status" = "201" ]] || fail "activity expected 201, got $activity_status"
[[ "$(json_value "$TMP_DIR/activity.json" 'value.id')" = "$ACTIVITY_ID" ]] || fail "activity did not preserve clientGeneratedId"

activity_replay_status=$(post_json "$COOKIE_A" "$TMP_DIR/activity-replay.json" "$ACTIVITY_BODY" "$API_BASE/api/v1/holdings/$HOLDING_ID/activities")
[[ "$activity_replay_status" = "200" ]] || fail "activity replay expected 200, got $activity_replay_status"
[[ "$(json_value "$TMP_DIR/activity-replay.json" 'value.id')" = "$ACTIVITY_ID" ]] || fail "activity replay returned a different id"

curl_access --fail --silent --cookie "$COOKIE_A" \
  "$API_BASE/api/v1/holdings/$HOLDING_ID/activities?plotId=$PLOT_ID&activityType=pruning" > "$TMP_DIR/activities.json"
node - "$TMP_DIR/activities.json" "$ACTIVITY_ID" <<'NODE'
const fs = require('fs');
const [file, activityId] = process.argv.slice(2);
const { items } = JSON.parse(fs.readFileSync(file, 'utf8'));
if (items.length !== 1) throw new Error(`Expected one pruning activity, got ${items.length}`);
if (items[0].id !== activityId) throw new Error('Pruning activity id mismatch');
NODE

log "Verifying plot timeline combines labor, delivery and yield"
curl_access --fail --silent --cookie "$COOKIE_A" "$API_BASE/api/v1/plots/$PLOT_ID/timeline" > "$TMP_DIR/timeline.json"
node - "$TMP_DIR/timeline.json" "$ACTIVITY_ID" "$DELIVERY_ID" <<'NODE'
const fs = require('fs');
const [file, activityId, deliveryId] = process.argv.slice(2);
const { items } = JSON.parse(fs.readFileSync(file, 'utf8'));
const types = new Set(items.map((item) => item.type));
for (const expected of ['activity', 'delivery', 'yield_result']) {
  if (!types.has(expected)) throw new Error(`Timeline missing ${expected}`);
}
if (!items.some((item) => item.type === 'activity' && item.id === activityId)) throw new Error('Timeline missing pruning activity');
if (!items.some((item) => item.type === 'delivery' && item.id === deliveryId)) throw new Error('Timeline missing delivery');
if (!items.some((item) => item.type === 'yield_result' && item.deliveryId === deliveryId && item.yieldPercent === '21.9000')) throw new Error('Timeline missing current yield result');
NODE

foreign_timeline_status=$(curl_access --silent --output "$TMP_DIR/foreign-timeline.json" --write-out '%{http_code}' \
  --cookie "$COOKIE_B" "$API_BASE/api/v1/plots/$PLOT_ID/timeline")
[[ "$foreign_timeline_status" = "404" ]] || fail "foreign timeline access expected 404"

log "Checking deterministic campaign summary"
curl_access --fail --silent --cookie "$COOKIE_A" "$API_BASE/api/v1/campaigns/$CAMPAIGN_ID/summary" > "$TMP_DIR/summary.json"
node - "$TMP_DIR/summary.json" <<'NODE'
const fs = require('fs');
const summary = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (summary.deliveriesCount !== 1) throw new Error(`Expected 1 delivery, got ${summary.deliveriesCount}`);
if (Number(summary.totalKilograms) !== 1842) throw new Error(`Expected 1842 kg, got ${summary.totalKilograms}`);
if (summary.pendingResultCount !== 0) throw new Error(`Expected zero pending yields, got ${summary.pendingResultCount}`);
if (Number(summary.coveragePercent) !== 100) throw new Error(`Expected 100% coverage, got ${summary.coveragePercent}`);
if (Number(summary.weightedYieldPercent) !== 21.9) throw new Error(`Expected 21.9% weighted yield, got ${summary.weightedYieldPercent}`);
NODE

log "Uploading and isolating a private synthetic ticket"
printf '%%PDF-1.4\n%% synthetic Mágina Olivo gate ticket 004281\n' > "$TMP_DIR/ticket-004281.pdf"
upload_status=$(curl_access --silent --output "$TMP_DIR/document.json" --write-out '%{http_code}' \
  --cookie "$COOKIE_A" \
  --header 'content-type: application/octet-stream' \
  --data-binary @"$TMP_DIR/ticket-004281.pdf" \
  "$API_BASE/api/v1/holdings/$HOLDING_ID/documents?filename=ticket-004281.pdf&mimeType=application%2Fpdf&documentType=ticket&deliveryId=$DELIVERY_ID")
[[ "$upload_status" = "201" ]] || fail "ticket upload expected 201, got $upload_status"
DOCUMENT_ID=$(json_value "$TMP_DIR/document.json" 'value.id')

curl_access --fail --silent --cookie "$COOKIE_A" "$API_BASE/api/v1/documents/$DOCUMENT_ID" > "$TMP_DIR/document-metadata.json"
grep -q "$DELIVERY_ID" "$TMP_DIR/document-metadata.json" || fail "ticket metadata is not linked to delivery"

curl_access --fail --silent --cookie "$COOKIE_A" "$API_BASE/api/v1/documents/$DOCUMENT_ID/content" > "$TMP_DIR/ticket-downloaded.pdf"
cmp "$TMP_DIR/ticket-004281.pdf" "$TMP_DIR/ticket-downloaded.pdf" || fail "ticket bytes changed during private roundtrip"

foreign_document_status=$(curl_access --silent --output "$TMP_DIR/foreign-document.json" --write-out '%{http_code}' \
  --cookie "$COOKIE_B" "$API_BASE/api/v1/documents/$DOCUMENT_ID")
[[ "$foreign_document_status" = "404" ]] || fail "foreign document metadata expected 404"

foreign_content_status=$(curl_access --silent --output "$TMP_DIR/foreign-document.bin" --write-out '%{http_code}' \
  --cookie "$COOKIE_B" "$API_BASE/api/v1/documents/$DOCUMENT_ID/content")
[[ "$foreign_content_status" = "404" ]] || fail "foreign document content expected 404"

log "PASS: MVP synthetic journey, idempotency, timeline, summary and private ticket isolation"
