#!/usr/bin/env bash
set -euo pipefail

POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:18-alpine}"
POSTGRES_USER="${POSTGRES_USER:-magina}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-magina_ci}"
SOURCE_DB="${SOURCE_DB:-magina_olivo}"
API_BASE="${API_BASE:-http://127.0.0.1:3001}"

log() {
  printf '[concurrency-gate] %s\n' "$*"
}

fail() {
  printf '[concurrency-gate] ERROR: %s\n' "$*" >&2
  exit 1
}

[[ -f /tmp/delivery-a.id ]] || fail "delivery id fixture is missing"
[[ -f /tmp/cookies-a.txt ]] || fail "Farmer A cookie jar is missing"
[[ -f /tmp/cookies-b.txt ]] || fail "Farmer B cookie jar is missing"

DELIVERY_A="$(cat /tmp/delivery-a.id)"

log "Applying first edit with version 1"
first_status=$(curl --silent --output /tmp/delivery-update-first.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-a.txt \
  --header 'content-type: application/json' \
  --request PATCH \
  --data '{"version":1,"notes":"first concurrent edit"}' \
  "$API_BASE/api/v1/deliveries/$DELIVERY_A")
[[ "$first_status" = "200" ]] || fail "first edit expected 200, got $first_status"
node - <<'NODE'
const fs = require('fs');
const body = JSON.parse(fs.readFileSync('/tmp/delivery-update-first.json', 'utf8'));
if (body.version !== 2) throw new Error(`Expected version 2, got ${body.version}`);
if (body.notes !== 'first concurrent edit') throw new Error('First edit was not persisted in response');
NODE

log "Submitting stale edit with version 1"
stale_status=$(curl --silent --output /tmp/delivery-update-stale.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-a.txt \
  --header 'content-type: application/json' \
  --request PATCH \
  --data '{"version":1,"notes":"stale edit must not win"}' \
  "$API_BASE/api/v1/deliveries/$DELIVERY_A")
[[ "$stale_status" = "409" ]] || fail "stale edit expected 409, got $stale_status"
grep -q 'DELIVERY_VERSION_CONFLICT' /tmp/delivery-update-stale.json || fail "missing version conflict code"
grep -q '"current_version":2' /tmp/delivery-update-stale.json || fail "conflict does not report current version 2"

log "Checking foreign user cannot edit the delivery"
foreign_status=$(curl --silent --output /tmp/delivery-update-foreign.json --write-out "%{http_code}" \
  --cookie /tmp/cookies-b.txt \
  --header 'content-type: application/json' \
  --request PATCH \
  --data '{"version":2,"notes":"foreign edit"}' \
  "$API_BASE/api/v1/deliveries/$DELIVERY_A")
[[ "$foreign_status" = "404" ]] || fail "foreign edit expected 404, got $foreign_status"

PG_CONTAINER="$(docker ps --filter "ancestor=${POSTGRES_IMAGE}" --format '{{.ID}}' | head -n 1)"
[[ -n "$PG_CONTAINER" ]] || fail "PostgreSQL service container not found"

read -r current_version current_notes < <(
  docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$PG_CONTAINER" \
    psql -U "$POSTGRES_USER" -d "$SOURCE_DB" -AtF '|' -c \
    "select version, notes from deliveries where id='${DELIVERY_A}'" | tr '|' ' '
)

[[ "$current_version" = "2" ]] || fail "database expected version 2, got $current_version"
[[ "$current_notes" = "first concurrent edit" ]] || fail "stale/foreign edit overwrote persisted notes"

log "PASS optimistic concurrency preserves the first committed edit"
