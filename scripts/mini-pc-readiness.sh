#!/usr/bin/env bash
set -euo pipefail

MIN_FREE_KB="${MINI_PC_MIN_FREE_KB:-5242880}"
MIN_MEMORY_KB="${MINI_PC_MIN_MEMORY_KB:-2097152}"
FAILURES=0
WARNINGS=0

log() {
  printf '[mini-pc-readiness] %s\n' "$*"
}

pass() {
  printf '[mini-pc-readiness] PASS: %s\n' "$*"
}

warn() {
  WARNINGS=$((WARNINGS + 1))
  printf '[mini-pc-readiness] WARN: %s\n' "$*" >&2
}

fail() {
  FAILURES=$((FAILURES + 1))
  printf '[mini-pc-readiness] FAIL: %s\n' "$*" >&2
}

require_command() {
  local command_name="$1"
  if command -v "$command_name" >/dev/null 2>&1; then
    pass "command available: $command_name"
  else
    fail "required command not found: $command_name"
  fi
}

if [[ "$(uname -s 2>/dev/null || true)" != "Linux" ]]; then
  fail "Mini-PC staging host must be Linux"
else
  pass "Linux host detected"
fi

ARCH="$(uname -m 2>/dev/null || true)"
case "$ARCH" in
  x86_64|aarch64|arm64) pass "supported architecture: $ARCH" ;;
  *) fail "unsupported architecture: ${ARCH:-unknown}" ;;
esac

for command_name in git curl sha256sum awk grep stat df; do
  require_command "$command_name"
done

if command -v docker >/dev/null 2>&1; then
  pass "command available: docker"
  if docker info >/dev/null 2>&1; then
    pass "Docker daemon reachable by current operator"
  else
    fail "Docker is installed but daemon is not reachable by current operator"
  fi

  if docker compose version >/dev/null 2>&1; then
    pass "Docker Compose v2 available"
  else
    fail "Docker Compose v2 is required"
  fi
else
  fail "required command not found: docker"
fi

AVAILABLE_KB="$(df -Pk . 2>/dev/null | awk 'NR==2 {print $4}')"
if [[ "$AVAILABLE_KB" =~ ^[0-9]+$ ]]; then
  if (( AVAILABLE_KB >= MIN_FREE_KB )); then
    pass "free disk space ${AVAILABLE_KB}KB >= ${MIN_FREE_KB}KB"
  else
    fail "free disk space ${AVAILABLE_KB}KB < required ${MIN_FREE_KB}KB"
  fi
else
  fail "unable to determine free disk space"
fi

TOTAL_MEMORY_KB="$(awk '/^MemTotal:/ {print $2; exit}' /proc/meminfo 2>/dev/null || true)"
if [[ "$TOTAL_MEMORY_KB" =~ ^[0-9]+$ ]]; then
  if (( TOTAL_MEMORY_KB >= MIN_MEMORY_KB )); then
    pass "memory ${TOTAL_MEMORY_KB}KB >= ${MIN_MEMORY_KB}KB"
  else
    warn "memory ${TOTAL_MEMORY_KB}KB is below ${MIN_MEMORY_KB}KB; image builds may be unstable"
  fi
else
  warn "unable to determine total memory"
fi

if command -v timedatectl >/dev/null 2>&1; then
  NTP_SYNC="$(timedatectl show -p NTPSynchronized --value 2>/dev/null || true)"
  if [[ "$NTP_SYNC" = "yes" ]]; then
    pass "system clock reports NTP synchronized"
  else
    warn "system clock does not report NTP synchronized; fix before HTTPS/session gates"
  fi
else
  warn "timedatectl unavailable; verify clock synchronization manually"
fi

if command -v ss >/dev/null 2>&1; then
  if ss -ltnH 2>/dev/null | awk '{print $4}' | grep -Eq '(^|:)8088$'; then
    warn "TCP 8088 is already in use; confirm whether an existing Mágina staging instance owns it"
  else
    pass "TCP 8088 appears free for loopback staging bind"
  fi
else
  warn "ss unavailable; port 8088 availability was not checked"
fi

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  CURRENT_SHA="$(git rev-parse HEAD 2>/dev/null || true)"
  if [[ "$CURRENT_SHA" =~ ^[0-9a-f]{40}$ ]]; then
    pass "Git checkout detected: $CURRENT_SHA"
  else
    warn "Git checkout detected but HEAD could not be resolved"
  fi

  if [[ -z "$(git status --short 2>/dev/null || true)" ]]; then
    pass "Git working tree is clean"
  else
    warn "Git working tree has changes; formal staging deploy will reject a dirty checkout"
  fi

  if [[ -n "${STAGING_EXPECTED_SOURCE_SHA:-}" ]]; then
    if [[ ! "$STAGING_EXPECTED_SOURCE_SHA" =~ ^[0-9a-f]{40}$ ]]; then
      fail "STAGING_EXPECTED_SOURCE_SHA must be a 40-character lowercase Git SHA"
    elif [[ "$CURRENT_SHA" = "$STAGING_EXPECTED_SOURCE_SHA" ]]; then
      pass "checkout matches STAGING_EXPECTED_SOURCE_SHA"
    else
      warn "checkout does not match STAGING_EXPECTED_SOURCE_SHA; switch to the approved detached SHA before formal preflight"
    fi
  fi
else
  warn "not currently inside a Git checkout; clone/fetch Mágina Olivo before formal staging"
fi

if [[ -n "${MAGINA_POSTGRES_DATA_DIR:-}" ]]; then
  if [[ "$MAGINA_POSTGRES_DATA_DIR" != /* ]]; then
    fail "MAGINA_POSTGRES_DATA_DIR must be an absolute path"
  elif [[ ! -d "$MAGINA_POSTGRES_DATA_DIR" ]]; then
    fail "MAGINA_POSTGRES_DATA_DIR does not exist: $MAGINA_POSTGRES_DATA_DIR"
  else
    pass "PostgreSQL data directory exists: $MAGINA_POSTGRES_DATA_DIR"
    if command -v findmnt >/dev/null 2>&1; then
      ROOT_SOURCE="$(findmnt -n -o SOURCE -T / 2>/dev/null || true)"
      DATA_SOURCE="$(findmnt -n -o SOURCE -T "$MAGINA_POSTGRES_DATA_DIR" 2>/dev/null || true)"
      DATA_FSTYPE="$(findmnt -n -o FSTYPE -T "$MAGINA_POSTGRES_DATA_DIR" 2>/dev/null || true)"
      if [[ -n "$ROOT_SOURCE" && -n "$DATA_SOURCE" && "$ROOT_SOURCE" != "$DATA_SOURCE" ]]; then
        pass "PostgreSQL data path is on a separate mount ($DATA_SOURCE, ${DATA_FSTYPE:-unknown})"
      else
        warn "PostgreSQL data path is not proven to be on a separate mount"
      fi
    else
      warn "findmnt unavailable; external data mount cannot be verified yet"
    fi
  fi
fi

printf '\n'
log "summary failures=$FAILURES warnings=$WARNINGS"

if (( FAILURES > 0 )); then
  log "NOT READY — fix FAIL items before creating the staging env or running formal preflight"
  exit 1
fi

log "READY FOR CONFIGURATION — host prerequisites look usable"
log "Next: create STAGING_ENV_FILE outside Git with mode 0600, checkout the approved detached SHA, then run scripts/staging-acceptance.sh preflight"
