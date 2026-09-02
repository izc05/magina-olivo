#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${MAGINA_STAGING_COMPOSE_FILE:-infra/docker/compose.staging.yml}"
ENV_FILE="${STAGING_ENV_FILE:-}"
STATE_DIR="${MAGINA_STAGING_STATE_DIR:-.deploy/staging}"
BUNDLE="${RESTORE_BUNDLE_DIR:-}"
RESTORE_DB="${RESTORE_DATABASE:-magina_restore_validation}"
RESTORE_BUCKET="${RESTORE_OBJECT_STORAGE_BUCKET:-}"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-magina-olivo-staging}"

log() {
  printf '[staging-restore] %s\n' "$*"
}

fail() {
  printf '[staging-restore] ERROR: %s\n' "$*" >&2
  exit 1
}

[[ -n "$ENV_FILE" && -f "$ENV_FILE" ]] || fail "STAGING_ENV_FILE must point to the staging env file"
[[ -n "$BUNDLE" && -d "$BUNDLE" ]] || fail "RESTORE_BUNDLE_DIR must point to an existing backup bundle"
[[ "$BUNDLE" = /* ]] || fail "RESTORE_BUNDLE_DIR must be an absolute path"
[[ "$RESTORE_DB" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]] || fail "RESTORE_DATABASE must be a simple PostgreSQL identifier"
[[ "$RESTORE_DB" != "magina_olivo" ]] || fail "restore drill must never target the live staging database"
[[ -n "$RESTORE_BUCKET" ]] || fail "RESTORE_OBJECT_STORAGE_BUCKET is required and must be a separate empty recovery bucket"
[[ "${RESTORE_TARGETS_CONFIRMED_ISOLATED:-}" = "1" ]] \
  || fail "set RESTORE_TARGETS_CONFIRMED_ISOLATED=1 only after selecting isolated restore targets"

for required_file in postgres.dump database-manifest.txt backup-meta.txt SHA256SUMS objects/objects-manifest.json; do
  [[ -f "$BUNDLE/$required_file" ]] || fail "backup bundle is missing $required_file"
done

log "Verifying backup bundle checksums before restore"
(
  cd "$BUNDLE"
  sha256sum --check --quiet SHA256SUMS
) || fail "backup bundle checksum verification failed"

grep -q '^format_version=1$' "$BUNDLE/backup-meta.txt" || fail "unsupported backup bundle format"

CURRENT_RELEASE=""
[[ ! -f "$STATE_DIR/current" ]] || CURRENT_RELEASE="$(cat "$STATE_DIR/current")"
[[ -n "$CURRENT_RELEASE" ]] || fail "no current staging release recorded"
export MAGINA_IMAGE_TAG="$CURRENT_RELEASE"

compose() {
  env \
    -u POSTGRES_PASSWORD \
    -u DATABASE_URL \
    -u BETTER_AUTH_SECRET \
    -u BETTER_AUTH_URL \
    -u BETTER_AUTH_TRUSTED_ORIGINS \
    -u AUTH_MAIL_TRANSPORT \
    -u AUTH_MAIL_FROM \
    -u RESEND_API_KEY \
    -u LOG_LEVEL \
    -u DB_POOL_MAX \
    -u OBJECT_STORAGE_ENDPOINT \
    -u OBJECT_STORAGE_BUCKET \
    -u OBJECT_STORAGE_REGION \
    -u OBJECT_STORAGE_ACCESS_KEY_ID \
    -u OBJECT_STORAGE_SECRET_ACCESS_KEY \
    -u OBJECT_STORAGE_FORCE_PATH_STYLE \
    -u WORKER_POLL_MS \
    -u WORKER_RETRY_SECONDS \
    -u WORKER_LEASE_SECONDS \
    -u STAGING_BIND \
    MAGINA_IMAGE_TAG="$MAGINA_IMAGE_TAG" \
    COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT_NAME" \
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

PG_CONTAINER="$(compose ps -q postgres)"
API_CONTAINER="$(compose ps -q api)"
[[ -n "$PG_CONTAINER" ]] || fail "staging PostgreSQL container not found"
[[ -n "$API_CONTAINER" ]] || fail "staging API container not found"

cleanup() {
  docker exec "$PG_CONTAINER" rm -f /tmp/magina-staging-restore.dump >/dev/null 2>&1 || true
  docker exec "$API_CONTAINER" rm -rf /tmp/magina-object-restore >/dev/null 2>&1 || true
}
trap cleanup EXIT

log "Preparing isolated PostgreSQL restore database $RESTORE_DB"
DB_EXISTS="$(docker exec "$PG_CONTAINER" sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d postgres -Atqc "select 1 from pg_database where datname='"'"'$RESTORE_DB'"'"'"')"
if [[ "$DB_EXISTS" = "1" ]]; then
  [[ "${RESTORE_DATABASE_CONFIRM_RECREATE:-}" = "1" ]] \
    || fail "restore database already exists; set RESTORE_DATABASE_CONFIRM_RECREATE=1 to replace only this isolated validation database"
  docker exec "$PG_CONTAINER" sh -c \
    'PGPASSWORD="$POSTGRES_PASSWORD" dropdb -U "$POSTGRES_USER" --force '"$RESTORE_DB"
fi

docker exec "$PG_CONTAINER" sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" createdb -U "$POSTGRES_USER" '"$RESTORE_DB"

docker cp "$BUNDLE/postgres.dump" "$PG_CONTAINER:/tmp/magina-staging-restore.dump" >/dev/null
log "Restoring PostgreSQL dump into isolated database"
docker exec "$PG_CONTAINER" sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore --no-owner --no-acl -U "$POSTGRES_USER" -d '"$RESTORE_DB"' /tmp/magina-staging-restore.dump'

ACTUAL_DB_MANIFEST="$(mktemp)"
trap 'rm -f "$ACTUAL_DB_MANIFEST"; cleanup' EXIT

docker exec "$PG_CONTAINER" sh -c '
  export PGPASSWORD="$POSTGRES_PASSWORD"
  psql -U "$POSTGRES_USER" -d '"$RESTORE_DB"' -At -F= <<'"'"'SQL'"'"'
select 'auth_users', count(*) from "user";
select 'auth_sessions', count(*) from session;
select 'holdings', count(*) from holdings;
select 'farms', count(*) from farms;
select 'plots', count(*) from plots;
select 'campaigns', count(*) from campaigns;
select 'deliveries', count(*) from deliveries;
select 'delivery_results', count(*) from delivery_results;
select 'documents', count(*) from documents;
select 'document_links', count(*) from document_links;
select 'job_queue', count(*) from job_queue;
select 'schema_migrations', count(*) from schema_migrations;
select 'delivery_kilograms_sum', coalesce(to_char(sum(kilograms), 'FM999999999990.000'), '0.000') from deliveries;
select 'current_yield_rows', count(*) from delivery_results where status='current';
SQL
' > "$ACTUAL_DB_MANIFEST"

if ! diff -u "$BUNDLE/database-manifest.txt" "$ACTUAL_DB_MANIFEST"; then
  fail "restored PostgreSQL state differs from backup manifest"
fi
log "PASS PostgreSQL restore matches relational manifest"

log "Copying object backup into runtime container"
cleanup
docker exec "$API_CONTAINER" mkdir -p /tmp/magina-object-restore
docker cp "$BUNDLE/objects/." "$API_CONTAINER:/tmp/magina-object-restore/" >/dev/null

log "Restoring private objects into isolated recovery bucket"
docker exec \
  -e OBJECT_RESTORE_DIR=/tmp/magina-object-restore \
  -e OBJECT_STORAGE_BUCKET="$RESTORE_BUCKET" \
  -e OBJECT_RESTORE_CONFIRM_EMPTY=1 \
  "$API_CONTAINER" \
  node scripts/import-private-objects.mjs

log "RESTORE GATE PASS database=$RESTORE_DB bucket=$RESTORE_BUCKET"
