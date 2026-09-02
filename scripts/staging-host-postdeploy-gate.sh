#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${MAGINA_STAGING_COMPOSE_FILE:-infra/docker/compose.staging.yml}"
ENV_FILE="${STAGING_ENV_FILE:-}"
STATE_DIR="${MAGINA_STAGING_STATE_DIR:-.deploy/staging}"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-magina-olivo-staging}"

log() {
  printf '[staging-host-postdeploy] %s\n' "$*"
}

fail() {
  printf '[staging-host-postdeploy] ERROR: %s\n' "$*" >&2
  exit 1
}

[[ -n "$ENV_FILE" && -f "$ENV_FILE" ]] || fail "STAGING_ENV_FILE must point to the secrets-managed staging env file"
[[ -f "$COMPOSE_FILE" ]] || fail "compose file not found: $COMPOSE_FILE"
[[ -f "$STATE_DIR/current" ]] || fail "no current staging release recorded"
CURRENT_RELEASE="$(cat "$STATE_DIR/current")"
[[ -n "$CURRENT_RELEASE" ]] || fail "current staging release is empty"
export MAGINA_IMAGE_TAG="$CURRENT_RELEASE"

read_env_value() {
  local key="$1"
  awk -F= -v wanted="$key" '$1 == wanted { sub(/^[^=]*=/, ""); print; exit }' "$ENV_FILE"
}

STAGING_BIND_VALUE="$(read_env_value STAGING_BIND)"
STAGING_BIND_VALUE="${STAGING_BIND_VALUE:-127.0.0.1:8088}"
case "$STAGING_BIND_VALUE" in
  127.0.0.1:*|localhost:*) ;;
  *) fail "STAGING_BIND must remain loopback-only; got '$STAGING_BIND_VALUE'" ;;
esac

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

container_id() {
  local service="$1"
  local id
  id="$(compose ps -q "$service")"
  [[ -n "$id" ]] || fail "service $service has no container"
  printf '%s' "$id"
}

POSTGRES_CONTAINER="$(container_id postgres)"
API_CONTAINER="$(container_id api)"
WORKER_CONTAINER="$(container_id worker)"
WEB_CONTAINER="$(container_id web)"

require_running() {
  local label="$1"
  local container="$2"
  local status
  status="$(docker inspect --format '{{.State.Status}}' "$container")"
  [[ "$status" = "running" ]] || fail "$label container is not running: $status"
}

require_health() {
  local label="$1"
  local container="$2"
  local health
  health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$container")"
  [[ "$health" = "healthy" ]] || fail "$label container is not healthy: $health"
}

require_no_published_ports() {
  local label="$1"
  local container="$2"
  local published
  published="$(docker port "$container" 2>/dev/null || true)"
  [[ -z "$published" ]] || fail "$label unexpectedly publishes host ports: $published"
}

require_running postgres "$POSTGRES_CONTAINER"
require_running api "$API_CONTAINER"
require_running worker "$WORKER_CONTAINER"
require_running web "$WEB_CONTAINER"
require_health postgres "$POSTGRES_CONTAINER"
require_health api "$API_CONTAINER"

require_no_published_ports postgres "$POSTGRES_CONTAINER"
require_no_published_ports api "$API_CONTAINER"
require_no_published_ports worker "$WORKER_CONTAINER"

WEB_PORT_OUTPUT="$(docker port "$WEB_CONTAINER" 8080/tcp 2>/dev/null || true)"
[[ -n "$WEB_PORT_OUTPUT" ]] || fail "web container does not publish its Nginx port"

EXPECTED_HOST="${STAGING_BIND_VALUE%:*}"
EXPECTED_PORT="${STAGING_BIND_VALUE##*:}"
[[ "$EXPECTED_PORT" =~ ^[0-9]+$ ]] || fail "invalid port in STAGING_BIND: $STAGING_BIND_VALUE"

# Docker may normalize localhost to 127.0.0.1. Accept IPv4 loopback only.
if ! printf '%s\n' "$WEB_PORT_OUTPUT" | grep -Fxq "127.0.0.1:$EXPECTED_PORT"; then
  fail "web must publish only 127.0.0.1:$EXPECTED_PORT; got '$WEB_PORT_OUTPUT'"
fi
if printf '%s\n' "$WEB_PORT_OUTPUT" | grep -Ev '^127\.0\.0\.1:[0-9]+$' | grep -q .; then
  fail "web has an unexpected non-loopback port binding: $WEB_PORT_OUTPUT"
fi

HEALTH_URL="http://127.0.0.1:$EXPECTED_PORT/health/ready"
ROOT_URL="http://127.0.0.1:$EXPECTED_PORT/"

log "Checking local same-origin entry before Tunnel"
ready_status="$(curl --silent --show-error --output /tmp/magina-postdeploy-ready.json --write-out '%{http_code}' "$HEALTH_URL")"
[[ "$ready_status" = "200" ]] || fail "local readiness expected 200, got $ready_status"
grep -q '"status":"ready"' /tmp/magina-postdeploy-ready.json || fail "local readiness body is not ready"

root_status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$ROOT_URL")"
[[ "$root_status" = "200" ]] || fail "local PWA root expected 200, got $root_status"

# Compose must not accidentally create additional published ports through a
# future edit. Inspect every service container, not just the three sensitive
# services above, and allow host bindings only on the web container.
for service in postgres api worker; do
  id="$(container_id "$service")"
  [[ -z "$(docker port "$id" 2>/dev/null || true)" ]] || fail "$service gained a published host port"
done

rm -f /tmp/magina-postdeploy-ready.json
log "PASS release=$CURRENT_RELEASE web=127.0.0.1:$EXPECTED_PORT api_private=yes postgres_private=yes worker_private=yes"
