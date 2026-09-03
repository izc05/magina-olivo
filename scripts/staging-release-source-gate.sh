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

# The acceptance wrapper must refuse to proceed when no approved source SHA was
# supplied. This must happen before host/Docker validation.
if STAGING_ENV_FILE="$ENV_FILE" \
  MAGINA_STAGING_STATE_DIR="$STATE_DIR" \
  bash scripts/staging-acceptance.sh preflight >"$LOG_FILE" 2>&1; then
  cat "$LOG_FILE"
  echo '[staging-release-source-gate] ERROR: preflight accepted a missing approved source SHA'
  exit 1
fi
grep -q 'required environment variable is missing: STAGING_EXPECTED_SOURCE_SHA' "$LOG_FILE"

# A syntactically valid but different 40-character SHA must also be rejected
# before any host preflight action is reached.
ACTUAL_SHA="$(git rev-parse HEAD)"
WRONG_SHA="0000000000000000000000000000000000000000"
[[ "$ACTUAL_SHA" != "$WRONG_SHA" ]] || WRONG_SHA="1111111111111111111111111111111111111111"
if STAGING_ENV_FILE="$ENV_FILE" \
  STAGING_EXPECTED_SOURCE_SHA="$WRONG_SHA" \
  MAGINA_STAGING_STATE_DIR="$STATE_DIR" \
  bash scripts/staging-acceptance.sh preflight >"$LOG_FILE" 2>&1; then
  cat "$LOG_FILE"
  echo '[staging-release-source-gate] ERROR: preflight accepted an unapproved checkout SHA'
  exit 1
fi
grep -q 'does not match approved staging SHA' "$LOG_FILE"

# Status is non-destructive and must expose both the approved expected SHA and
# the current checkout SHA, in addition to deployed-source metadata.
STATUS_OUTPUT="$(
  STAGING_EXPECTED_SOURCE_SHA="$ACTUAL_SHA" \
  STAGING_ENV_FILE="$ENV_FILE" \
  MAGINA_STAGING_STATE_DIR="$STATE_DIR" \
  bash scripts/staging-acceptance.sh status
)"
printf '%s\n' "$STATUS_OUTPUT"
grep -q '^source_sha=' <<<"$STATUS_OUTPUT"
grep -q "^expected_source_sha=$ACTUAL_SHA$" <<<"$STATUS_OUTPUT"
grep -q "^checkout_source_sha=$ACTUAL_SHA$" <<<"$STATUS_OUTPUT"

# staging-release.sh status remains stable for lower-level release tooling.
RELEASE_STATUS_OUTPUT="$(
  STAGING_ENV_FILE="$ENV_FILE" \
  MAGINA_STAGING_STATE_DIR="$STATE_DIR" \
  bash scripts/staging-release.sh status
)"
printf '%s\n' "$RELEASE_STATUS_OUTPUT"
grep -q '^current_source_sha=' <<<"$RELEASE_STATUS_OUTPUT"
grep -q '^previous_source_sha=' <<<"$RELEASE_STATUS_OUTPUT"

printf '[staging-release-source-gate] PASS dirty-checkout=yes expected-source-required=yes mismatch-rejected=yes source-metadata=yes\n'
