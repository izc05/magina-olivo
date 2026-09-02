#!/usr/bin/env bash
set -euo pipefail

POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:18-alpine}"
POSTGRES_USER="${POSTGRES_USER:-magina}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-magina_ci}"
SOURCE_DB="${SOURCE_DB:-magina_olivo}"
RESTORE_DB="${RESTORE_DB:-magina_restore}"
DOCUMENT_STORAGE_DIR="${DOCUMENT_STORAGE_DIR:-/tmp/magina-private-documents}"
BACKUP_ROOT="${BACKUP_ROOT:-/tmp/magina-restore-bundle}"

log() {
  printf '[restore-gate] %s\n' "$*"
}

fail() {
  printf '[restore-gate] ERROR: %s\n' "$*" >&2
  exit 1
}

bash scripts/spike-timeline-gate.sh
bash scripts/spike-delivery-concurrency.sh

PG_CONTAINER="$(docker ps --filter "ancestor=${POSTGRES_IMAGE}" --format '{{.ID}}' | head -n 1)"
[[ -n "$PG_CONTAINER" ]] || fail "PostgreSQL service container not found"

rm -rf "$BACKUP_ROOT"
mkdir -p "$BACKUP_ROOT/documents"

log "Creating PostgreSQL custom-format backup with PostgreSQL 18 tools"
docker exec \
  -e PGPASSWORD="$POSTGRES_PASSWORD" \
  "$PG_CONTAINER" \
  pg_dump -U "$POSTGRES_USER" -d "$SOURCE_DB" -Fc -f /tmp/magina-source.dump

docker cp "$PG_CONTAINER:/tmp/magina-source.dump" "$BACKUP_ROOT/postgres.dump" >/dev/null
[[ -s "$BACKUP_ROOT/postgres.dump" ]] || fail "PostgreSQL backup is empty"

log "Creating independent document backup"
if [[ -d "$DOCUMENT_STORAGE_DIR" ]]; then
  cp -a "$DOCUMENT_STORAGE_DIR"/. "$BACKUP_ROOT/documents/"
fi

DOCUMENT_COUNT="$(find "$BACKUP_ROOT/documents" -type f | wc -l | tr -d ' ')"
[[ "$DOCUMENT_COUNT" = "1" ]] || fail "Expected exactly one backed-up document, got $DOCUMENT_COUNT"

log "Simulating loss of live document storage"
rm -rf "$DOCUMENT_STORAGE_DIR"
mkdir -p "$DOCUMENT_STORAGE_DIR"
[[ "$(find "$DOCUMENT_STORAGE_DIR" -type f | wc -l | tr -d ' ')" = "0" ]] || fail "Document loss simulation failed"

log "Creating a clean restore database"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$PG_CONTAINER" \
  dropdb -U "$POSTGRES_USER" --if-exists "$RESTORE_DB"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$PG_CONTAINER" \
  createdb -U "$POSTGRES_USER" "$RESTORE_DB"

docker cp "$BACKUP_ROOT/postgres.dump" "$PG_CONTAINER:/tmp/magina-restore.dump" >/dev/null

docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$PG_CONTAINER" \
  pg_restore --no-owner --no-acl -U "$POSTGRES_USER" -d "$RESTORE_DB" /tmp/magina-restore.dump

sql_value() {
  local query="$1"
  docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$PG_CONTAINER" \
    psql -U "$POSTGRES_USER" -d "$RESTORE_DB" -Atqc "$query" | tr -d '\r'
}

assert_sql() {
  local label="$1"
  local query="$2"
  local expected="$3"
  local actual
  actual="$(sql_value "$query")"
  [[ "$actual" = "$expected" ]] || fail "$label expected '$expected', got '$actual'"
  log "PASS $label = $actual"
}

log "Verifying restored relational state"
assert_sql "holdings" "select count(*) from holdings" "2"
assert_sql "farms" "select count(*) from farms" "1"
assert_sql "plots" "select count(*) from plots" "1"
assert_sql "campaigns" "select count(*) from campaigns" "1"
assert_sql "deliveries" "select count(*) from deliveries" "2"
assert_sql "delivery_results" "select count(*) from delivery_results" "2"
assert_sql "documents" "select count(*) from documents" "1"
assert_sql "document_links" "select count(*) from document_links" "1"

assert_sql \
  "delivery kilograms" \
  "select string_agg(to_char(kilograms, 'FM999999990.000'), ',' order by kilograms) from deliveries" \
  "1000.000,1842.000"

assert_sql \
  "current yield" \
  "select to_char(value, 'FM990.0000') from delivery_results where status='current' and result_type='fat_yield'" \
  "21.9000"

assert_sql \
  "superseded yield" \
  "select to_char(value, 'FM990.0000') from delivery_results where status='superseded' and result_type='fat_yield'" \
  "21.7000"

assert_sql \
  "ticket link" \
  "select count(*) from document_links where entity_type='delivery'" \
  "1"

assert_sql \
  "delivery edit version" \
  "select version from deliveries where ticket_number='004281'" \
  "2"

assert_sql \
  "delivery edit notes" \
  "select notes from deliveries where ticket_number='004281'" \
  "first concurrent edit"

log "Restoring document storage from backup bundle"
cp -a "$BACKUP_ROOT/documents"/. "$DOCUMENT_STORAGE_DIR/"

RESTORED_OBJECT_KEY="$(sql_value "select object_key from documents limit 1")"
RESTORED_SHA256="$(sql_value "select sha256 from documents limit 1")"
RESTORED_PATH="$DOCUMENT_STORAGE_DIR/$RESTORED_OBJECT_KEY"

[[ -f "$RESTORED_PATH" ]] || fail "Restored document object is missing: $RESTORED_OBJECT_KEY"
ACTUAL_SHA256="$(sha256sum "$RESTORED_PATH" | awk '{print $1}')"
[[ "$ACTUAL_SHA256" = "$RESTORED_SHA256" ]] || fail "Restored document checksum mismatch"

EXPECTED_TICKET_CONTENT='ticket-004281-private'
ACTUAL_TICKET_CONTENT="$(cat "$RESTORED_PATH")"
[[ "$ACTUAL_TICKET_CONTENT" = "$EXPECTED_TICKET_CONTENT" ]] || fail "Restored ticket bytes differ from original fixture"

log "PASS restored private document checksum and content"
log "RESTORE GATE PASS"
