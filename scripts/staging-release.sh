#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-deploy}"
REQUESTED_RELEASE="${2:-}"
COMPOSE_FILE="${MAGINA_STAGING_COMPOSE_FILE:-infra/docker/compose.staging.yml}"
ENV_FILE="${STAGING_ENV_FILE:-}"
STATE_DIR="${MAGINA_STAGING_STATE_DIR:-.deploy/staging}"
POSTGRES_IMAGE="${MAGINA_POSTGRES_IMAGE:-postgres:18.6-alpine}"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-magina-olivo-staging}"

log() {
  printf '[staging-release] %s\n' "$*"
}

fail() {
  printf '[staging-release] ERROR: %s\n' "$*" >&2
  exit 1
}

[[ -n "$ENV_FILE" ]] || fail "STAGING_ENV_FILE must point to the secrets-managed staging env file"
[[ -f "$ENV_FILE" ]] || fail "staging env file not found: $ENV_FILE"
[[ -f "$COMPOSE_FILE" ]] || fail "compose file not found: $COMPOSE_FILE"

ensure_state_dir() {
  mkdir -p "$STATE_DIR"
  chmod 700 "$STATE_DIR"
}

assert_clean_checkout() {
  git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "deploy must run from a Git working tree"
  local dirty
  dirty="$(git status --porcelain --untracked-files=normal)"
  [[ -z "$dirty" ]] || fail "refusing to build staging from a dirty working tree; commit or remove local changes first"
}

git_source_sha() {
  git rev-parse HEAD 2>/dev/null || fail "unable to resolve current Git commit"
}

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
HEALTH_URL="http://$STAGING_BIND_VALUE/health/ready"

wait_for_health() {
  local release="$1"
  for attempt in $(seq 1 60); do
    if curl --fail --silent "$HEALTH_URL" >/tmp/magina-staging-release-ready.json \
      && grep -q '"status":"ready"' /tmp/magina-staging-release-ready.json; then
      log "release $release is healthy"
      return 0
    fi
    sleep 1
  done
  return 1
}

# Docker Compose gives the process environment precedence over --env-file.
# Staging must be driven by the secrets-managed env file, not by variables
# inherited from CI or an operator shell. Strip every Compose input that may
# leak in from the parent process; keep only the release tag/project name here.
compose() {
  env \
    -u POSTGRES_PASSWORD \
    -u DATABASE_URL \
    -u MAGINA_POSTGRES_DATA_DIR \
    -u STAGING_REQUIRE_EXTERNAL_DATA \
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

ensure_base_image() {
  if ! docker image inspect "$POSTGRES_IMAGE" >/dev/null 2>&1; then
    log "pulling pinned PostgreSQL image $POSTGRES_IMAGE"
    docker pull "$POSTGRES_IMAGE"
  fi
}

ensure_release_images() {
  local release="$1"
  docker image inspect "magina-olivo-runtime:$release" >/dev/null 2>&1 || fail "missing runtime image for release $release"
  docker image inspect "magina-olivo-web:$release" >/dev/null 2>&1 || fail "missing web image for release $release"
}

image_source_sha() {
  local release="$1"
  docker image inspect \
    --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}' \
    "magina-olivo-runtime:$release" 2>/dev/null || true
}

build_release() {
  local release="$1"
  local source_sha="$2"
  log "building runtime image for $release source_sha=$source_sha"
  docker build \
    --file infra/docker/Dockerfile.runtime \
    --label "org.opencontainers.image.revision=$source_sha" \
    --label "org.opencontainers.image.version=$release" \
    --tag "magina-olivo-runtime:$release" \
    .

  log "building web image for $release source_sha=$source_sha"
  docker build \
    --file infra/docker/Dockerfile.web \
    --label "org.opencontainers.image.revision=$source_sha" \
    --label "org.opencontainers.image.version=$release" \
    --tag "magina-olivo-web:$release" \
    .
}

current_release() {
  [[ -f "$STATE_DIR/current" ]] && cat "$STATE_DIR/current" || true
}

previous_release() {
  [[ -f "$STATE_DIR/previous" ]] && cat "$STATE_DIR/previous" || true
}

current_source_sha() {
  [[ -f "$STATE_DIR/current-source-sha" ]] && cat "$STATE_DIR/current-source-sha" || true
}

previous_source_sha() {
  [[ -f "$STATE_DIR/previous-source-sha" ]] && cat "$STATE_DIR/previous-source-sha" || true
}

write_state_after_successful_deploy() {
  local new_release="$1"
  local old_release="$2"
  local new_source_sha="$3"
  local old_source_sha
  old_source_sha="$(current_source_sha)"

  if [[ -n "$old_release" && "$old_release" != "$new_release" ]]; then
    printf '%s\n' "$old_release" > "$STATE_DIR/previous"
    if [[ -n "$old_source_sha" ]]; then
      printf '%s\n' "$old_source_sha" > "$STATE_DIR/previous-source-sha"
    fi
  fi

  printf '%s\n' "$new_release" > "$STATE_DIR/current"
  printf '%s\n' "$new_source_sha" > "$STATE_DIR/current-source-sha"
  chmod 600 "$STATE_DIR/current" "$STATE_DIR/current-source-sha"
  [[ ! -f "$STATE_DIR/previous" ]] || chmod 600 "$STATE_DIR/previous"
  [[ ! -f "$STATE_DIR/previous-source-sha" ]] || chmod 600 "$STATE_DIR/previous-source-sha"
}

case "$ACTION" in
  deploy)
    assert_clean_checkout
    SOURCE_SHA="$(git_source_sha)"
    RELEASE="${REQUESTED_RELEASE:-${SOURCE_SHA:0:12}}"
    [[ -n "$RELEASE" ]] || fail "unable to derive release tag"
    [[ "$RELEASE" =~ ^[A-Za-z0-9._-]+$ ]] || fail "release tag contains unsupported characters"

    ensure_state_dir
    OLD_RELEASE="$(current_release)"
    ensure_base_image
    build_release "$RELEASE" "$SOURCE_SHA"
    ensure_release_images "$RELEASE"

    export MAGINA_IMAGE_TAG="$RELEASE"
    log "validating rendered Compose configuration"
    compose config >/tmp/magina-staging-release-compose.yml

    log "deploying release $RELEASE source_sha=$SOURCE_SHA"
    if ! compose up -d --pull never; then
      compose ps --all || true
      compose logs --no-color || true
      fail "Compose failed while deploying $RELEASE"
    fi

    if ! wait_for_health "$RELEASE"; then
      compose ps --all || true
      compose logs --no-color || true
      if [[ -n "$OLD_RELEASE" && "$OLD_RELEASE" != "$RELEASE" ]]; then
        log "new release unhealthy; attempting automatic code rollback to $OLD_RELEASE"
        ensure_release_images "$OLD_RELEASE"
        export MAGINA_IMAGE_TAG="$OLD_RELEASE"
        compose up -d --pull never || true
        wait_for_health "$OLD_RELEASE" || true
      fi
      fail "release $RELEASE failed health verification"
    fi

    write_state_after_successful_deploy "$RELEASE" "$OLD_RELEASE" "$SOURCE_SHA"
    log "DEPLOY PASS current=$RELEASE source_sha=$SOURCE_SHA previous=${OLD_RELEASE:-none}"
    ;;

  rollback)
    ensure_state_dir
    CURRENT_RELEASE="$(current_release)"
    CURRENT_SOURCE_SHA="$(current_source_sha)"
    TARGET_RELEASE="${REQUESTED_RELEASE:-$(previous_release)}"
    [[ -n "$TARGET_RELEASE" ]] || fail "no previous release recorded; optionally pass an explicit release tag"
    ensure_base_image
    ensure_release_images "$TARGET_RELEASE"

    TARGET_SOURCE_SHA="$(image_source_sha "$TARGET_RELEASE")"
    [[ -n "$TARGET_SOURCE_SHA" && "$TARGET_SOURCE_SHA" != "<no value>" ]] || fail "rollback image $TARGET_RELEASE does not contain source revision metadata"

    export MAGINA_IMAGE_TAG="$TARGET_RELEASE"
    log "rolling back code to $TARGET_RELEASE source_sha=$TARGET_SOURCE_SHA"
    compose up -d --pull never

    if ! wait_for_health "$TARGET_RELEASE"; then
      compose ps --all || true
      compose logs --no-color || true
      fail "rollback target $TARGET_RELEASE did not become healthy"
    fi

    printf '%s\n' "$TARGET_RELEASE" > "$STATE_DIR/current"
    printf '%s\n' "$TARGET_SOURCE_SHA" > "$STATE_DIR/current-source-sha"
    if [[ -n "$CURRENT_RELEASE" && "$CURRENT_RELEASE" != "$TARGET_RELEASE" ]]; then
      printf '%s\n' "$CURRENT_RELEASE" > "$STATE_DIR/previous"
      if [[ -n "$CURRENT_SOURCE_SHA" ]]; then
        printf '%s\n' "$CURRENT_SOURCE_SHA" > "$STATE_DIR/previous-source-sha"
      fi
    fi
    chmod 600 "$STATE_DIR/current" "$STATE_DIR/current-source-sha"
    [[ ! -f "$STATE_DIR/previous" ]] || chmod 600 "$STATE_DIR/previous"
    [[ ! -f "$STATE_DIR/previous-source-sha" ]] || chmod 600 "$STATE_DIR/previous-source-sha"
    log "ROLLBACK PASS current=$TARGET_RELEASE source_sha=$TARGET_SOURCE_SHA previous=${CURRENT_RELEASE:-none}"
    ;;

  status)
    ensure_state_dir
    printf 'current=%s\n' "$(current_release)"
    printf 'current_source_sha=%s\n' "$(current_source_sha)"
    printf 'previous=%s\n' "$(previous_release)"
    printf 'previous_source_sha=%s\n' "$(previous_source_sha)"
    ;;

  *)
    fail "usage: $0 {deploy [release]|rollback [release]|status}"
    ;;
esac
