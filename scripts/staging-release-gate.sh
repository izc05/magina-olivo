#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="/tmp/magina-staging-release.env"
STATE_DIR="/tmp/magina-staging-release-state"
COMPOSE_FILE="infra/docker/compose.staging.yml"
export STAGING_ENV_FILE="$ENV_FILE"
export MAGINA_STAGING_STATE_DIR="$STATE_DIR"
export MAGINA_STAGING_COMPOSE_FILE="$COMPOSE_FILE"
export COMPOSE_PROJECT_NAME="magina-ci-release"

SOURCE_SHA="$(git rev-parse HEAD)"
RELEASE_A="ci-release-a-${GITHUB_SHA:-local}"
RELEASE_B="ci-release-b-${GITHUB_SHA:-local}"

cat >"$ENV_FILE" <<'ENV'
POSTGRES_PASSWORD=magina_release_ci_password
DATABASE_URL=postgres://magina:magina_release_ci_password@postgres:5432/magina_olivo
BETTER_AUTH_SECRET=ci-release-only-better-auth-secret-2026-not-production
BETTER_AUTH_URL=https://magina-staging.example.test
BETTER_AUTH_TRUSTED_ORIGINS=https://magina-staging.example.test
AEMET_API_KEY=ci-synthetic-aemet-key-not-production
OBJECT_STORAGE_ENDPOINT=https://example.invalid
OBJECT_STORAGE_BUCKET=magina-release-ci-private
OBJECT_STORAGE_REGION=auto
OBJECT_STORAGE_ACCESS_KEY_ID=ci-access-key
OBJECT_STORAGE_SECRET_ACCESS_KEY=ci-secret-key
OBJECT_STORAGE_FORCE_PATH_STYLE=true
AUTH_MAIL_TRANSPORT=disabled
STAGING_BIND=127.0.0.1:18089
LOG_LEVEL=warn
DB_POOL_MAX=10
WORKER_POLL_MS=5000
WORKER_RETRY_SECONDS=5
WORKER_LEASE_SECONDS=120
ENV
chmod 600 "$ENV_FILE"
rm -rf "$STATE_DIR"

cleanup() {
  MAGINA_IMAGE_TAG="$RELEASE_A" docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" down --volumes --remove-orphans >/dev/null 2>&1 || true
  docker image rm \
    "magina-olivo-runtime:$RELEASE_A" \
    "magina-olivo-web:$RELEASE_A" \
    "magina-olivo-runtime:$RELEASE_B" \
    "magina-olivo-web:$RELEASE_B" >/dev/null 2>&1 || true
  rm -f "$ENV_FILE" /tmp/magina-release-gate-ready.json
  rm -rf "$STATE_DIR"
}
trap cleanup EXIT

assert_image_source_sha() {
  local image="$1"
  local actual
  actual="$(docker image inspect --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$image")"
  [[ "$actual" = "$SOURCE_SHA" ]] || {
    echo "[staging-release-gate] ERROR: $image revision=$actual expected=$SOURCE_SHA"
    exit 1
  }
}

printf '[staging-release-gate] deploy A\n'
bash scripts/staging-release.sh deploy "$RELEASE_A"
[[ "$(cat "$STATE_DIR/current")" = "$RELEASE_A" ]]
[[ "$(cat "$STATE_DIR/current-source-sha")" = "$SOURCE_SHA" ]]
[[ ! -f "$STATE_DIR/previous" ]]
[[ ! -f "$STATE_DIR/previous-source-sha" ]]
assert_image_source_sha "magina-olivo-runtime:$RELEASE_A"
assert_image_source_sha "magina-olivo-web:$RELEASE_A"
bash scripts/staging-host-postdeploy-gate.sh

printf '[staging-release-gate] deploy B\n'
bash scripts/staging-release.sh deploy "$RELEASE_B"
[[ "$(cat "$STATE_DIR/current")" = "$RELEASE_B" ]]
[[ "$(cat "$STATE_DIR/current-source-sha")" = "$SOURCE_SHA" ]]
[[ "$(cat "$STATE_DIR/previous")" = "$RELEASE_A" ]]
[[ "$(cat "$STATE_DIR/previous-source-sha")" = "$SOURCE_SHA" ]]
assert_image_source_sha "magina-olivo-runtime:$RELEASE_B"
assert_image_source_sha "magina-olivo-web:$RELEASE_B"
bash scripts/staging-host-postdeploy-gate.sh

printf '[staging-release-gate] rollback to A\n'
bash scripts/staging-release.sh rollback
[[ "$(cat "$STATE_DIR/current")" = "$RELEASE_A" ]]
[[ "$(cat "$STATE_DIR/current-source-sha")" = "$SOURCE_SHA" ]]
[[ "$(cat "$STATE_DIR/previous")" = "$RELEASE_B" ]]
[[ "$(cat "$STATE_DIR/previous-source-sha")" = "$SOURCE_SHA" ]]
bash scripts/staging-host-postdeploy-gate.sh

curl --fail --silent http://127.0.0.1:18089/health/ready >/tmp/magina-release-gate-ready.json
grep -q '"status":"ready"' /tmp/magina-release-gate-ready.json

printf '[staging-release-gate] RELEASE LIFECYCLE GATE PASS source_sha=%s\n' "$SOURCE_SHA"
