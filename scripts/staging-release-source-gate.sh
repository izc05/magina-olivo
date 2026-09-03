#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="/tmp/magina-staging-source-gate.env"
STATE_DIR="/tmp/magina-staging-source-gate-state"
DIRTY_MARKER=".magina-staging-source-gate-dirty"
LOG_FILE="/tmp/magina-staging-source-gate.log"

cleanup() {
  rm -f "$ENV_FILE" "$DIRTY_MARKER" "$LOG_FILE"
  rm -rf "$STATE_DIR"
}
trap cleanup EXIT

cat >"$ENV_FILE" <<'ENV'
STAGING_BIND=127.0.0.1:18092
ENV
chmod 600 "$ENV_FILE"
rm -rf "$STATE_DIR"

# The deploy command must refuse a dirty checkout before any Docker build or
# deployment action. An untracked, non-ignored marker is enough to prove it.
touch "$DIRTY_MARKER"
if STAGING_ENV_FILE="$ENV_FILE" \
  MAGINA_STAGING_STATE_DIR="$STATE_DIR" \
  bash scripts/staging-release.sh deploy source-gate-should-not-build >"$LOG_FILE" 2>&1; then
  cat "$LOG_FILE"
  echo '[staging-release-source-gate] ERROR: dirty checkout was accepted'
  exit 1
fi

grep -q 'refusing to build staging from a dirty working tree' "$LOG_FILE"
rm -f "$DIRTY_MARKER"

# Status is non-destructive and should expose the source-SHA fields even before
# the first deploy, making the evidence contract stable for operators/tools.
STATUS_OUTPUT="$(
  STAGING_ENV_FILE="$ENV_FILE" \
  MAGINA_STAGING_STATE_DIR="$STATE_DIR" \
  bash scripts/staging-release.sh status
)"
printf '%s\n' "$STATUS_OUTPUT"
grep -q '^current_source_sha=' <<<"$STATUS_OUTPUT"
grep -q '^previous_source_sha=' <<<"$STATUS_OUTPUT"

printf '[staging-release-source-gate] PASS dirty-checkout rejection and source metadata contract\n'
