#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${MAGINA_STAGING_COMPOSE_FILE:-infra/docker/compose.staging.yml}"
ENV_FILE="${STAGING_ENV_FILE:-}"
STATE_DIR="${MAGINA_STAGING_STATE_DIR:-.deploy/staging}"
DESTINATION="${BACKUP_DESTINATION_DIR:-}"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-magina-olivo-staging}"

log() {
  printf '[staging-backup] %s\n' "$*"
}

fail() {
  printf '[staging-backup] ERROR: %s\n' "$*" >&2
  exit 1
}

[[ -n "$ENV_FILE" && -f "$ENV_FILE" ]] || fail "STAGING_ENV_FILE must point to the staging env file"
[[ -n "$DESTINATION" ]] || fail "BACKUP_DESTINATION_DIR is required"
[[ "${BACKUP_DESTINATION_CONFIRMED_OFF_HOST:-}" = "1" ]] \
  || fail "set BACKUP_DESTINATION_CONFIRMED_OFF_HOST=1 only after choosing storage outside the staging host"
[[ "$DESTINATION" = /* ]] || fail "BACKUP_DESTINATION_DIR must be an absolute path"
[[ -d "$DESTINATION" ]] || fail "backup destination does not exist: $DESTINATION"
[[ -w "$DESTINATION" ]] || fail "backup destination is not writable: $DESTINATION"

CURRENT_RELEASE=""
CURRENT_SOURCE_SHA=""
[[ ! -f "$STATE_DIR/current" ]] || CURRENT_RELEASE="$(cat "$STATE_DIR/current")"
[[ ! -f "$STATE_DIR/current-source-sha" ]] || CURRENT_SOURCE_SHA="$(cat "$STATE_DIR/current-source-sha")"
[[ -n "$CURRENT_RELEASE" ]] || fail "no current staging release recorded"
[[ "$CURRENT_SOURCE_SHA" =~ ^[0-9a-f]{40}$ ]] || fail "current staging source SHA is missing or invalid"
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
    -u AEMET_API_KEY \
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

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SAFE_RELEASE="$(printf '%s' "$CURRENT_RELEASE" | tr -c 'A-Za-z0-9._-' '_')"
BUNDLE="$DESTINATION/magina-staging-${TIMESTAMP}-${SAFE_RELEASE}"
[[ ! -e "$BUNDLE" ]] || fail "backup bundle already exists: $BUNDLE"
mkdir -m 700 "$BUNDLE"
mkdir -m 700 "$BUNDLE/objects"

cleanup_remote_tmp() {
  docker exec "$API_CONTAINER" rm -rf /tmp/magina-object-backup >/dev/null 2>&1 || true
}
trap cleanup_remote_tmp EXIT

log "Creating PostgreSQL 18 custom-format dump"
docker exec "$PG_CONTAINER" sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "$BUNDLE/postgres.dump"
[[ -s "$BUNDLE/postgres.dump" ]] || fail "PostgreSQL backup is empty"
chmod 600 "$BUNDLE/postgres.dump"

log "Recording relational manifest for later restore verification"
docker exec -i "$PG_CONTAINER" sh -c \
  'export PGPASSWORD="$POSTGRES_PASSWORD"; exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -F=' \
  > "$BUNDLE/database-manifest.txt" <<'SQL'
select 'auth_users', count(*) from "user";
select 'auth_sessions', count(*) from session;
select 'holdings', count(*) from holdings;
select 'farms', count(*) from farms;
select 'plots', count(*) from plots;
select 'campaigns', count(*) from campaigns;
select 'activities', count(*) from activities;
select 'tasks', count(*) from tasks;
select 'deliveries', count(*) from deliveries;
select 'delivery_results', count(*) from delivery_results;
select 'documents', count(*) from documents;
select 'document_links', count(*) from document_links;
select 'job_queue', count(*) from job_queue;
select 'schema_migrations', count(*) from schema_migrations;
select 'delivery_kilograms_sum', coalesce(to_char(sum(kilograms), 'FM999999999990.000'), '0.000') from deliveries;
select 'current_yield_rows', count(*) from delivery_results where status='current';
SQL
[[ -s "$BUNDLE/database-manifest.txt" ]] || fail "database manifest is empty"
chmod 600 "$BUNDLE/database-manifest.txt"

log "Exporting private object storage through the deployed API image"
cleanup_remote_tmp
docker exec \
  -e OBJECT_BACKUP_DIR=/tmp/magina-object-backup \
  "$API_CONTAINER" \
  node scripts/export-private-objects.mjs

OBJECT_COUNT="$(docker exec "$API_CONTAINER" node -e '
const fs=require("fs");
const value=JSON.parse(fs.readFileSync("/tmp/magina-object-backup/objects-manifest.json","utf8"));
if(!Number.isInteger(value.objectCount)||value.objectCount<0) process.exit(2);
process.stdout.write(String(value.objectCount));
')"
[[ "$OBJECT_COUNT" =~ ^[0-9]+$ ]] || fail "invalid private object count returned by exporter"

docker cp "$API_CONTAINER:/tmp/magina-object-backup/." "$BUNDLE/objects/" >/dev/null
[[ -f "$BUNDLE/objects/objects-manifest.json" ]] || fail "object storage manifest missing"

cat > "$BUNDLE/backup-meta.txt" <<META
format_version=1
created_at_utc=$TIMESTAMP
application_release=$CURRENT_RELEASE
application_source_sha=$CURRENT_SOURCE_SHA
compose_project=$COMPOSE_PROJECT_NAME
postgres_format=custom
private_object_count=$OBJECT_COUNT
META
chmod 600 "$BUNDLE/backup-meta.txt"

log "Creating independent checksums for the complete bundle"
(
  cd "$BUNDLE"
  find . -type f ! -name SHA256SUMS -print0 \
    | sort -z \
    | xargs -0 sha256sum > SHA256SUMS
)
chmod 600 "$BUNDLE/SHA256SUMS"
chmod -R go-rwx "$BUNDLE"

log "Validating bundle checksums"
(
  cd "$BUNDLE"
  sha256sum --check --quiet SHA256SUMS
)

log "PASS bundle=$BUNDLE release=$CURRENT_RELEASE source_sha=$CURRENT_SOURCE_SHA postgres=yes private_objects=$OBJECT_COUNT"
