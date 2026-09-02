#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-deploy}"
REQUESTED_RELEASE="${2:-}"
COMPOSE_FILE="${MAGINA_STAGING_COMPOSE_FILE:-infra/docker/compose.staging.yml}"
ENV_FILE="${STAGING_ENV_FILE:-}"
STATE_DIR="${MAGINA_STAGING_STATE_DIR:-.deploy/staging}"
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

mkdir -p "$STATE_DIR"
chmod 700 "$STATE_DIR"

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
    if curl --fail --silent "$HEALTH_URL" >/tmp/magina-staging-release-ready.json; then
      grep -q '"status":"ready"' /tmp/magina-staging-release-ready.json || true
      log "release $release is healthy"
      return 0
    fi
    sleep 1
  done
  return 1
}

compose() {
  MAGINA_IMAGE_TAG="$MAGINA_IMAGE_TAG" \
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

ensure_release_images() {
  local release="$1"
  docker image inspect "magina-olivo-runtime:$release" >/dev/null 2>&1 || fail "missing runtime image for release $release"
  docker image inspect "magina-olivo-web:$release" >/dev/null 2>&1 || fail "missing web image for release $release"
}

build_release() {
  local release="$1"
  log "building runtime image for $release"
  docker build \
    --file infra/docker/Dockerfile.runtime \
    --label "org.opencontainers.image.revision=$release" \
    --tag "magina-olivo-runtime:$release" \
    .

  log "building web image for $release"
  docker build \
    --file infra/docker/Dockerfile.web \
    --label "org.opencontainers.image.revision=$release" \
    --tag "magina-olivo-web:$release" \
    .
}

current_release() {
  [[ -f "$STATE_DIR/current" ]] && cat "$STATE_DIR/current" || true
}

previous_release() {
  [[ -f "$STATE_DIR/previous" ]] && cat "$STATE_DIR/previous" || true
}

write_state_after_successful_deploy() {
  local new_release="$1"
  local old_release="$2"
  if [[ -n "$old_release" && "$old_release" != "$new_release" ]]; then
    printf '%s\n' "$old_release" > "$STATE_DIR/previous"
  fi
  printf '%s\n' "$new_release" > "$STATE_DIR/current"
  chmod 600 "$STATE_DIR/current"
  [[ ! -f "$STATE_DIR/previous" ]] || chmod 600 "$STATE_DIR/previous"
}

case "$ACTION" in
  deploy)
    RELEASE="${REQUESTED_RELEASE:-$(git rev-parse --short=12 HEAD 2>/dev/null || true)}"
    [[ -n "$RELEASE" ]] || fail "provide a release tag when Git metadata is unavailable"
    [[ "$RELEASE" =~ ^[A-Za-z0-9._-]+$ ]] || fail "release tag contains unsupported characters"

    OLD_RELEASE="$(current_release)"
    build_release "$RELEASE"
    ensure_release_images "$RELEASE"

    export MAGINA_IMAGE_TAG="$RELEASE"
    log "validating rendered Compose configuration"
    compose config >/tmp/magina-staging-release-compose.yml

    log "deploying release $RELEASE"
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

    write_state_after_successful_deploy "$RELEASE" "$OLD_RELEASE"
    log "DEPLOY PASS current=$RELEASE previous=${OLD_RELEASE:-none}"
    ;;

  rollback)
    CURRENT_RELEASE="$(current_release)"
    TARGET_RELEASE="${REQUESTED_RELEASE:-$(previous_release)}"
    [[ -n "$TARGET_RELEASE" ]] || fail "no previous release recorded; optionally pass an explicit release tag"
    ensure_release_images "$TARGET_RELEASE"

    export MAGINA_IMAGE_TAG="$TARGET_RELEASE"
    log "rolling back code to $TARGET_RELEASE"
    compose up -d --pull never

    if ! wait_for_health "$TARGET_RELEASE"; then
      compose ps --all || true
      compose logs --no-color || true
      fail "rollback target $TARGET_RELEASE did not become healthy"
    fi

    printf '%s\n' "$TARGET_RELEASE" > "$STATE_DIR/current"
    if [[ -n "$CURRENT_RELEASE" && "$CURRENT_RELEASE" != "$TARGET_RELEASE" ]]; then
      printf '%s\n' "$CURRENT_RELEASE" > "$STATE_DIR/previous"
    fi
    chmod 600 "$STATE_DIR/current"
    [[ ! -f "$STATE_DIR/previous" ]] || chmod 600 "$STATE_DIR/previous"
    log "ROLLBACK PASS current=$TARGET_RELEASE previous=${CURRENT_RELEASE:-none}"
    ;;

  status)
    printf 'current=%s\n' "$(current_release)"
    printf 'previous=%s\n' "$(previous_release)"
    ;;

  *)
    fail "usage: $0 {deploy [release]|rollback [release]|status}"
    ;;
esac
