#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://127.0.0.1:3001}"
TRUSTED_ORIGIN="${TRUSTED_ORIGIN:-http://127.0.0.1:3001}"

log() {
  printf '[api-flow-gate] %s\n' "$*"
}

fail() {
  printf '[api-flow-gate] ERROR: %s\n' "$*" >&2
  exit 1
}

json_value() {
  local file="$1"
  local expression="$2"
  node -e "const fs=require('fs');const value=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const result=(${expression});if(result===undefined||result===null)process.exit(2);process.stdout.write(String(result));" "$file"
}

rm -f /tmp/cookies-a.txt /tmp/cookies-b.txt

log "Registering Farmer A without printing token-bearing signup response"
signup_a_status=$(curl --silent --dump-header /tmp/signup-a-headers.txt --output /tmp/signup-a.json --write-out "%{http_code}" \
  --cookie-jar /tmp/cookies-a.txt \
  --header 'content-type: application/json' \
  --data '{"name":"Farmer A","email":"farmer-a@example.com","password":"correct-horse-battery-staple"}' \
  "$API_BASE/api/auth/sign-up/email")
[[ "$signup_a_status" = "200" ]] || fail "Farmer A signup expected 200, got $signup_a_status"
grep -qi '^set-cookie:.*httponly' /tmp/signup-a-headers.txt || fail "session cookie is missing HttpOnly"
grep -qi '^set-cookie:.*samesite=lax' /tmp/signup-a-headers.txt || fail "session cookie is missing SameSite=Lax"

me_status=$(curl --silent --dump-header /tmp/me-headers.txt --output /tmp/me-a.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-a.txt \
  "$API_BASE/api/v1/me")
[[ "$me_status" = "200" ]] || fail "/me expected 200, got $me_status"
grep -q 'farmer-a@example.com' /tmp/me-a.json || fail "Farmer A session not visible in /me"
grep -qi '^cache-control: no-store' /tmp/me-headers.txt || fail "private response missing no-store"
grep -qi '^x-content-type-options: nosniff' /tmp/me-headers.txt || fail "private response missing nosniff"
grep -qi '^x-frame-options: DENY' /tmp/me-headers.txt || fail "private response missing frame denial"
grep -qi "^content-security-policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'" /tmp/me-headers.txt || fail "private response missing CSP"

unauth_status=$(curl --silent --output /tmp/holdings-unauth.json --write-out "%{http_code}" \
  "$API_BASE/api/v1/holdings")
[[ "$unauth_status" = "401" ]] || fail "unauthenticated holdings expected 401, got $unauth_status"

log "Creating and isolating two holdings"
create_a_status=$(curl --silent --output /tmp/holding-a.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-a.txt \
  --header 'content-type: application/json' \
  --data '{"name":"Holding Pilot A","municipality":"Bedmar","province":"Jaen"}' \
  "$API_BASE/api/v1/holdings")
[[ "$create_a_status" = "201" ]] || fail "Holding A expected 201, got $create_a_status"
HOLDING_A=$(json_value /tmp/holding-a.json 'value.id')

signup_b_status=$(curl --silent --output /tmp/signup-b.json --write-out "%{http_code}" \
  --cookie-jar /tmp/cookies-b.txt \
  --header 'content-type: application/json' \
  --data '{"name":"Farmer B","email":"farmer-b@example.com","password":"correct-horse-battery-staple"}' \
  "$API_BASE/api/auth/sign-up/email")
[[ "$signup_b_status" = "200" ]] || fail "Farmer B signup expected 200, got $signup_b_status"

list_b_before_status=$(curl --silent --output /tmp/holdings-b-before.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-b.txt \
  "$API_BASE/api/v1/holdings")
[[ "$list_b_before_status" = "200" ]] || fail "Farmer B holdings expected 200"
if grep -q 'Holding Pilot A' /tmp/holdings-b-before.json; then
  fail "Farmer B can see Farmer A holding"
fi

create_b_status=$(curl --silent --output /tmp/holding-b.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-b.txt \
  --header 'content-type: application/json' \
  --data '{"name":"Holding Pilot B","municipality":"Huelma","province":"Jaen"}' \
  "$API_BASE/api/v1/holdings")
[[ "$create_b_status" = "201" ]] || fail "Holding B expected 201, got $create_b_status"

curl --fail --silent --cookie /tmp/cookies-a.txt "$API_BASE/api/v1/holdings" > /tmp/holdings-a-after.json
curl --fail --silent --cookie /tmp/cookies-b.txt "$API_BASE/api/v1/holdings" > /tmp/holdings-b-after.json
grep -q 'Holding Pilot A' /tmp/holdings-a-after.json || fail "Holding A missing from owner list"
grep -q 'Holding Pilot B' /tmp/holdings-b-after.json || fail "Holding B missing from owner list"
if grep -q 'Holding Pilot B' /tmp/holdings-a-after.json || grep -q 'Holding Pilot A' /tmp/holdings-b-after.json; then
  fail "cross-holding list leak detected"
fi

log "Verifying browser origin protection"
hostile_status=$(curl --silent --output /tmp/hostile-origin.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-a.txt \
  --header 'content-type: application/json' \
  --header 'Origin: https://evil.example' \
  --header 'Sec-Fetch-Site: cross-site' \
  --data '{"name":"Cross Site Holding"}' \
  "$API_BASE/api/v1/holdings")
[[ "$hostile_status" = "403" ]] || fail "cross-site mutation expected 403, got $hostile_status"
grep -q 'CROSS_SITE_REQUEST_BLOCKED' /tmp/hostile-origin.json || fail "cross-site error code missing"

trusted_validation_status=$(curl --silent --output /tmp/trusted-origin-validation.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-a.txt \
  --header 'content-type: application/json' \
  --header "Origin: $TRUSTED_ORIGIN" \
  --header 'Sec-Fetch-Site: same-origin' \
  --data '{}' \
  "$API_BASE/api/v1/holdings")
[[ "$trusted_validation_status" = "400" ]] || fail "trusted origin should reach schema validation and return 400"

log "Creating farm, plot and campaign"
farm_status=$(curl --silent --output /tmp/farm-a.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-a.txt \
  --header 'content-type: application/json' \
  --data '{"name":"Las Vinas","areaHa":3.25}' \
  "$API_BASE/api/v1/holdings/$HOLDING_A/farms")
[[ "$farm_status" = "201" ]] || fail "Farm A expected 201, got $farm_status"
FARM_A=$(json_value /tmp/farm-a.json 'value.id')

foreign_farm_status=$(curl --silent --output /tmp/farm-a-by-b.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-b.txt \
  "$API_BASE/api/v1/holdings/$HOLDING_A/farms")
[[ "$foreign_farm_status" = "404" ]] || fail "foreign farm access expected 404"

plot_status=$(curl --silent --output /tmp/plot-a.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-a.txt \
  --header 'content-type: application/json' \
  --data '{"name":"Parcela Norte","areaHa":1.75,"irrigationType":"dryland","oliveTreeCount":210}' \
  "$API_BASE/api/v1/farms/$FARM_A/plots")
[[ "$plot_status" = "201" ]] || fail "Plot A expected 201, got $plot_status"
PLOT_A=$(json_value /tmp/plot-a.json 'value.id')

foreign_plot_status=$(curl --silent --output /tmp/plot-a-by-b.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-b.txt \
  "$API_BASE/api/v1/farms/$FARM_A/plots")
[[ "$foreign_plot_status" = "404" ]] || fail "foreign plot access expected 404"

campaign_status=$(curl --silent --output /tmp/campaign-a.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-a.txt \
  --header 'content-type: application/json' \
  --data '{"name":"Campana 2026/27","seasonStartYear":2026,"startDate":"2026-10-01"}' \
  "$API_BASE/api/v1/holdings/$HOLDING_A/campaigns")
[[ "$campaign_status" = "201" ]] || fail "Campaign A expected 201, got $campaign_status"
CAMPAIGN_A=$(json_value /tmp/campaign-a.json 'value.id')

log "Proving delivery idempotency"
DELIVERY_BODY=$(printf '{"deliveredAt":"2026-11-18T18:42:00+01:00","kilograms":"1842.000","customDestination":"Cooperativa piloto","farmId":"%s","plotId":"%s","ticketNumber":"004281"}' "$FARM_A" "$PLOT_A")
IDEMPOTENCY_KEY='11111111-1111-4111-8111-111111111111'

delivery_status=$(curl --silent --output /tmp/delivery-a.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-a.txt \
  --header 'content-type: application/json' \
  --header "Idempotency-Key: $IDEMPOTENCY_KEY" \
  --data "$DELIVERY_BODY" \
  "$API_BASE/api/v1/campaigns/$CAMPAIGN_A/deliveries")
[[ "$delivery_status" = "201" ]] || fail "delivery expected 201, got $delivery_status"
DELIVERY_A=$(json_value /tmp/delivery-a.json 'value.id')
grep -q '1842.000' /tmp/delivery-a.json || fail "delivery kilograms missing"

replay_status=$(curl --silent --output /tmp/delivery-replay.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-a.txt \
  --header 'content-type: application/json' \
  --header "Idempotency-Key: $IDEMPOTENCY_KEY" \
  --data "$DELIVERY_BODY" \
  "$API_BASE/api/v1/campaigns/$CAMPAIGN_A/deliveries")
[[ "$replay_status" = "201" ]] || fail "idempotent replay expected 201"
DELIVERY_REPLAY=$(json_value /tmp/delivery-replay.json 'value.id')
[[ "$DELIVERY_A" = "$DELIVERY_REPLAY" ]] || fail "idempotent replay returned a different delivery"

curl --fail --silent --cookie /tmp/cookies-a.txt \
  "$API_BASE/api/v1/campaigns/$CAMPAIGN_A/deliveries" > /tmp/deliveries-a.json
DELIVERY_COUNT=$(json_value /tmp/deliveries-a.json 'value.items.length')
[[ "$DELIVERY_COUNT" = "1" ]] || fail "replay created duplicate delivery"

conflict_status=$(curl --silent --output /tmp/idempotency-conflict.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-a.txt \
  --header 'content-type: application/json' \
  --header "Idempotency-Key: $IDEMPOTENCY_KEY" \
  --data '{"deliveredAt":"2026-11-18T18:42:00+01:00","kilograms":"1900.000","customDestination":"Cooperativa piloto"}' \
  "$API_BASE/api/v1/campaigns/$CAMPAIGN_A/deliveries")
[[ "$conflict_status" = "409" ]] || fail "idempotency key reuse expected 409"
grep -q 'IDEMPOTENCY_KEY_REUSED' /tmp/idempotency-conflict.json || fail "idempotency conflict code missing"

foreign_delivery_status=$(curl --silent --output /tmp/delivery-list-by-b.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-b.txt \
  "$API_BASE/api/v1/campaigns/$CAMPAIGN_A/deliveries")
[[ "$foreign_delivery_status" = "404" ]] || fail "foreign delivery access expected 404"
printf '%s' "$DELIVERY_A" > /tmp/delivery-a.id

log "Adding delayed yield and preserving correction history"
result_status=$(curl --silent --output /tmp/result-a.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-a.txt \
  --header 'content-type: application/json' \
  --data '{"value":"21.7000","measuredAt":"2026-11-20T10:00:00+01:00"}' \
  "$API_BASE/api/v1/deliveries/$DELIVERY_A/results")
[[ "$result_status" = "201" ]] || fail "initial yield expected 201"
grep -q '21.7000' /tmp/result-a.json || fail "initial yield missing"

foreign_result_status=$(curl --silent --output /tmp/results-by-b.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-b.txt \
  "$API_BASE/api/v1/deliveries/$DELIVERY_A/results")
[[ "$foreign_result_status" = "404" ]] || fail "foreign result access expected 404"

correction_status=$(curl --silent --output /tmp/result-correction.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-a.txt \
  --header 'content-type: application/json' \
  --data '{"value":"21.9000","measuredAt":"2026-11-20T12:00:00+01:00","notes":"Corrected cooperative result"}' \
  "$API_BASE/api/v1/deliveries/$DELIVERY_A/results")
[[ "$correction_status" = "201" ]] || fail "corrected yield expected 201"

curl --fail --silent --cookie /tmp/cookies-a.txt \
  "$API_BASE/api/v1/deliveries/$DELIVERY_A/results" > /tmp/results-a.json
node - <<'NODE'
const fs = require('fs');
const { items } = JSON.parse(fs.readFileSync('/tmp/results-a.json', 'utf8'));
if (items.length !== 2) throw new Error(`Expected two yield history rows, got ${items.length}`);
const oldValue = items.find((item) => item.value === '21.7000');
const currentValue = items.find((item) => item.value === '21.9000');
if (!oldValue || oldValue.status !== 'superseded') throw new Error('Old yield was not superseded');
if (!currentValue || currentValue.status !== 'current') throw new Error('Corrected yield is not current');
NODE

log "Uploading private ticket and proving access isolation"
printf 'ticket-004281-private' > /tmp/ticket-004281.txt
upload_status=$(curl --silent --output /tmp/document-a.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-a.txt \
  --header 'content-type: application/octet-stream' \
  --data-binary @/tmp/ticket-004281.txt \
  "$API_BASE/api/v1/holdings/$HOLDING_A/documents?filename=ticket-004281.txt&mimeType=text%2Fplain&documentType=ticket&deliveryId=$DELIVERY_A")
[[ "$upload_status" = "201" ]] || fail "ticket upload expected 201, got $upload_status"
DOCUMENT_A=$(json_value /tmp/document-a.json 'value.id')

metadata_status=$(curl --silent --output /tmp/document-metadata-a.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-a.txt \
  "$API_BASE/api/v1/documents/$DOCUMENT_A")
[[ "$metadata_status" = "200" ]] || fail "ticket metadata expected 200"
grep -q "$DELIVERY_A" /tmp/document-metadata-a.json || fail "ticket is not linked to delivery"

content_status=$(curl --silent --output /tmp/document-content-a.bin --write-out "%{http_code}" \
  --cookie /tmp/cookies-a.txt \
  "$API_BASE/api/v1/documents/$DOCUMENT_A/content")
[[ "$content_status" = "200" ]] || fail "ticket content expected 200"
cmp /tmp/ticket-004281.txt /tmp/document-content-a.bin || fail "downloaded ticket bytes changed"

foreign_metadata_status=$(curl --silent --output /tmp/document-metadata-b.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-b.txt \
  "$API_BASE/api/v1/documents/$DOCUMENT_A")
[[ "$foreign_metadata_status" = "404" ]] || fail "foreign document metadata expected 404"
foreign_content_status=$(curl --silent --output /tmp/document-content-b.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-b.txt \
  "$API_BASE/api/v1/documents/$DOCUMENT_A/content")
[[ "$foreign_content_status" = "404" ]] || fail "foreign document content expected 404"

log "Verifying weighted campaign summary exposes result coverage"
second_delivery_status=$(curl --silent --output /tmp/delivery-second.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-a.txt \
  --header 'content-type: application/json' \
  --header 'Idempotency-Key: 22222222-2222-4222-8222-222222222222' \
  --data '{"deliveredAt":"2026-11-21T09:00:00+01:00","kilograms":"1000.000","customDestination":"Cooperativa piloto"}' \
  "$API_BASE/api/v1/campaigns/$CAMPAIGN_A/deliveries")
[[ "$second_delivery_status" = "201" ]] || fail "second delivery expected 201"

summary_status=$(curl --silent --output /tmp/summary-a.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-a.txt \
  "$API_BASE/api/v1/campaigns/$CAMPAIGN_A/summary")
[[ "$summary_status" = "200" ]] || fail "campaign summary expected 200"
foreign_summary_status=$(curl --silent --output /tmp/summary-by-b.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-b.txt \
  "$API_BASE/api/v1/campaigns/$CAMPAIGN_A/summary")
[[ "$foreign_summary_status" = "404" ]] || fail "foreign campaign summary expected 404"

node - <<'NODE'
const fs = require('fs');
const summary = JSON.parse(fs.readFileSync('/tmp/summary-a.json', 'utf8'));
const expected = {
  deliveriesCount: 2,
  totalKilograms: '2842.000',
  deliveriesWithResult: 1,
  pendingResultCount: 1,
  resultCoveredKilograms: '1842.000',
  coveragePercent: '64.8135',
  weightedYieldPercent: '21.9000',
};
for (const [key, value] of Object.entries(expected)) {
  if (summary[key] !== value) throw new Error(`${key} expected ${value}, got ${summary[key]}`);
}
NODE

log "Running optimistic-concurrency plus clean backup/restore gate"
bash scripts/spike-backup-restore.sh

log "Signing out with browser-origin headers"
signout_status=$(curl --silent --output /tmp/signout-a.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-a.txt \
  --cookie-jar /tmp/cookies-a.txt \
  --header 'content-type: application/json' \
  --header "Origin: $TRUSTED_ORIGIN" \
  --header 'Sec-Fetch-Site: same-origin' \
  --data '{}' \
  "$API_BASE/api/auth/sign-out")
[[ "$signout_status" = "200" ]] || fail "sign-out expected 200, got $signout_status"

after_logout_status=$(curl --silent --output /tmp/me-after-logout.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-a.txt \
  "$API_BASE/api/v1/me")
[[ "$after_logout_status" = "401" ]] || fail "session remained valid after logout (status $after_logout_status)"

log "API FLOW GATE PASS"
