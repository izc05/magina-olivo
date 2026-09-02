#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${MAGINA_STAGING_COMPOSE_FILE:-infra/docker/compose.staging.yml}"
ENV_FILE="${STAGING_ENV_FILE:-}"
STATE_DIR="${MAGINA_STAGING_STATE_DIR:-.deploy/staging}"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-magina-olivo-staging}"

log() {
  printf '[staging-r2-gate] %s\n' "$*"
}

fail() {
  printf '[staging-r2-gate] ERROR: %s\n' "$*" >&2
  exit 1
}

[[ -n "$ENV_FILE" && -f "$ENV_FILE" ]] || fail "STAGING_ENV_FILE must point to the secrets-managed staging env file"
[[ -f "$STATE_DIR/current" ]] || fail "deploy a staging release before running the R2 gate"
CURRENT_RELEASE="$(cat "$STATE_DIR/current")"
[[ -n "$CURRENT_RELEASE" ]] || fail "current staging release is empty"
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

API_CONTAINER="$(compose ps -q api)"
[[ -n "$API_CONTAINER" ]] || fail "staging API container not found"
[[ "$(docker inspect --format '{{.State.Status}}' "$API_CONTAINER")" = "running" ]] \
  || fail "staging API container is not running"

log "Executing private object storage roundtrip inside the deployed API container"
docker exec "$API_CONTAINER" node scripts/r2-roundtrip-gate.mjs
log "PASS release=$CURRENT_RELEASE"
