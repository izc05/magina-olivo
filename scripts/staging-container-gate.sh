#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="infra/docker/compose.staging.yml"
POSTGRES_IMAGE="postgres:18.6-alpine"
export COMPOSE_PROJECT_NAME="magina-ci-staging"
export MAGINA_IMAGE_TAG="ci-${GITHUB_SHA:-local}"
export POSTGRES_PASSWORD="magina_staging_ci_password"
export DATABASE_URL="postgres://magina:magina_staging_ci_password@postgres:5432/magina_olivo"
export BETTER_AUTH_SECRET="ci-staging-only-better-auth-secret-2026-not-production"
export BETTER_AUTH_URL="https://magina-staging.example.test"
export BETTER_AUTH_TRUSTED_ORIGINS="https://magina-staging.example.test"
export OBJECT_STORAGE_ENDPOINT="https://example.invalid"
export OBJECT_STORAGE_BUCKET="magina-ci-private"
export OBJECT_STORAGE_REGION="auto"
export OBJECT_STORAGE_ACCESS_KEY_ID="ci-access-key"
export OBJECT_STORAGE_SECRET_ACCESS_KEY="ci-secret-key"
export OBJECT_STORAGE_FORCE_PATH_STYLE="true"
export STAGING_BIND="127.0.0.1:18088"
export LOG_LEVEL="warn"

log() {
  printf '[staging-container-gate] %s\n' "$*"
}

diagnostics() {
  docker compose -f "$COMPOSE_FILE" ps --all || true
  docker compose -f "$COMPOSE_FILE" logs --no-color || true
}

cleanup() {
  docker compose -f "$COMPOSE_FILE" down --volumes --remove-orphans >/dev/null 2>&1 || true
  docker image rm "magina-olivo-runtime:$MAGINA_IMAGE_TAG" "magina-olivo-web:$MAGINA_IMAGE_TAG" >/dev/null 2>&1 || true
}
trap cleanup EXIT

log "Rendering staging Compose configuration"
docker compose -f "$COMPOSE_FILE" config >/tmp/magina-staging-compose-rendered.yml

log "Pulling pinned PostgreSQL base image"
docker pull "$POSTGRES_IMAGE"

log "Building release-tagged runtime image"
docker build \
  --file infra/docker/Dockerfile.runtime \
  --tag "magina-olivo-runtime:$MAGINA_IMAGE_TAG" \
  .

log "Building release-tagged web image"
docker build \
  --file infra/docker/Dockerfile.web \
  --tag "magina-olivo-web:$MAGINA_IMAGE_TAG" \
  .

log "Starting isolated staging stack from tagged application images"
if ! docker compose -f "$COMPOSE_FILE" up -d --pull never; then
  diagnostics
  exit 1
fi

log "Waiting for same-origin web/API entrypoint"
for attempt in $(seq 1 60); do
  if curl --fail --silent http://127.0.0.1:18088/health/ready >/tmp/magina-staging-ready.json; then
    break
  fi
  if [ "$attempt" = "60" ]; then
    diagnostics
    exit 1
  fi
  sleep 1
done

grep -q '"status":"ready"' /tmp/magina-staging-ready.json
curl --fail --silent http://127.0.0.1:18088/ >/tmp/magina-staging-index.html
grep -q '<div id="root"></div>' /tmp/magina-staging-index.html

API_PORTS="$(docker compose -f "$COMPOSE_FILE" port api 3001 2>/dev/null || true)"
POSTGRES_PORTS="$(docker compose -f "$COMPOSE_FILE" port postgres 5432 2>/dev/null || true)"
[[ -z "$API_PORTS" ]] || { echo "API unexpectedly publishes a host port: $API_PORTS"; exit 1; }
[[ -z "$POSTGRES_PORTS" ]] || { echo "PostgreSQL unexpectedly publishes a host port: $POSTGRES_PORTS"; exit 1; }

log "STAGING CONTAINER GATE PASS"
