#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:-status}"
STATE_DIR="${MAGINA_STAGING_STATE_DIR:-.deploy/staging}"

log() {
  printf '[staging-acceptance] %s\n' "$*"
}

fail() {
  printf '[staging-acceptance] ERROR: %s\n' "$*" >&2
  exit 1
}

require_env() {
  local key="$1"
  [[ -n "${!key:-}" ]] || fail "required environment variable is missing: $key"
}

require_file() {
  [[ -f "$1" ]] || fail "required file not found: $1"
}

require_staging_env() {
  require_env STAGING_ENV_FILE
  require_file "$STAGING_ENV_FILE"
}

current_release() {
  [[ -f "$STATE_DIR/current" ]] && cat "$STATE_DIR/current" || true
}

current_source_sha() {
  [[ -f "$STATE_DIR/current_source_sha" ]] && cat "$STATE_DIR/current_source_sha" || true
}

run_preflight() {
  require_staging_env
  log "Running host preflight"
  bash scripts/staging-host-preflight.sh
}

run_deploy_local() {
  require_staging_env
  local release
  release="${STAGING_RELEASE:-$(git rev-parse --short=12 HEAD 2>/dev/null || true)}"
  [[ -n "$release" ]] || fail "set STAGING_RELEASE when Git metadata is unavailable"

  run_preflight
  log "Deploying release=$release"
  bash scripts/staging-release.sh deploy "$release"

  log "Running post-deploy isolation gate"
  bash scripts/staging-host-postdeploy-gate.sh

  log "Running private object storage roundtrip"
  bash scripts/staging-r2-gate.sh

  log "DEPLOY-LOCAL PASS release=$(current_release) source_sha=$(current_source_sha)"
  log "Next external dependency: publish the configured staging hostname through Cloudflare Tunnel before running: $0 external"
}

run_external() {
  require_env STAGING_BASE_URL
  require_env STAGING_GATE_EMAIL
  require_env STAGING_GATE_PASSWORD

  case "$STAGING_BASE_URL" in
    https://*) ;;
    *) fail "STAGING_BASE_URL must use https://" ;;
  esac

  log "Running public HTTPS/security gate"
  bash scripts/staging-https-gate.sh

  log "Running complete synthetic agricultural journey through the public hostname"
  API_BASE="${STAGING_BASE_URL%/}" bash scripts/mvp-core-flow-gate.sh

  log "Running public Mágina pages and data-source gate"
  bash scripts/staging-public-magina-gate.sh

  log "EXTERNAL PASS base_url=${STAGING_BASE_URL%/}"
  log "Private agricultural flow and public Mágina services passed. Password-recovery email, accessibility and PWA/offline remain separate acceptance blocks."
}

run_backup() {
  require_staging_env
  require_env BACKUP_DESTINATION_DIR
  [[ "${BACKUP_DESTINATION_CONFIRMED_OFF_HOST:-}" = "1" ]] \
    || fail "BACKUP_DESTINATION_CONFIRMED_OFF_HOST=1 is required"

  log "Running off-host staging backup"
  bash scripts/staging-backup.sh
  log "BACKUP PASS only if the backup script reported success; restore validation is still required separately."
}

run_restore() {
  require_staging_env
  require_env RESTORE_BUNDLE_DIR
  require_env RESTORE_DATABASE
  require_env RESTORE_OBJECT_STORAGE_BUCKET
  [[ "${RESTORE_TARGETS_CONFIRMED_ISOLATED:-}" = "1" ]] \
    || fail "RESTORE_TARGETS_CONFIRMED_ISOLATED=1 is required"

  log "Running isolated restore validation"
  bash scripts/staging-restore-gate.sh
  log "RESTORE PASS"
}

show_status() {
  printf 'release=%s\n' "$(current_release)"
  printf 'source_sha=%s\n' "$(current_source_sha)"
  printf 'staging_env=%s\n' "${STAGING_ENV_FILE:-unset}"
  printf 'staging_base_url=%s\n' "${STAGING_BASE_URL:-unset}"
  printf 'public_weather_municipality=%s\n' "${STAGING_PUBLIC_WEATHER_MUNICIPALITY:-bedmar-y-garciez}"
  printf 'next_manual_gates=mail-recovery,accessibility,pwa-offline\n'
}

case "$ACTION" in
  preflight)
    run_preflight
    ;;
  deploy-local)
    run_deploy_local
    ;;
  external)
    run_external
    ;;
  backup)
    run_backup
    ;;
  restore)
    run_restore
    ;;
  status)
    show_status
    ;;
  *)
    fail "usage: $0 {preflight|deploy-local|external|backup|restore|status}"
    ;;
esac
