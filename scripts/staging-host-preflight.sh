#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${STAGING_ENV_FILE:-}"
MIN_FREE_KB="${STAGING_MIN_FREE_KB:-5242880}"

log() {
  printf '[staging-host-preflight] %s\n' "$*"
}

fail() {
  printf '[staging-host-preflight] ERROR: %s\n' "$*" >&2
  exit 1
}

warn() {
  printf '[staging-host-preflight] WARN: %s\n' "$*" >&2
}

[[ "$(uname -s)" = "Linux" ]] || fail "staging host must be Linux"
case "$(uname -m)" in
  x86_64|aarch64|arm64) ;;
  *) fail "unsupported host architecture: $(uname -m)" ;;
esac

for command_name in docker git curl sha256sum awk grep stat df; do
  command -v "$command_name" >/dev/null 2>&1 || fail "required command not found: $command_name"
done

docker info >/dev/null 2>&1 || fail "Docker daemon is not reachable by the current operator"
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required"

[[ -n "$ENV_FILE" && -f "$ENV_FILE" ]] || fail "STAGING_ENV_FILE must point to the secrets-managed env file"

# Refuse group/world-readable secret files. Root ownership is recommended but
# not mandatory because rootless Docker/shared staging hosts are valid.
ENV_MODE="$(stat -c '%a' "$ENV_FILE")"
if (( (8#$ENV_MODE & 077) != 0 )); then
  fail "staging env file must not be group/world accessible; mode is $ENV_MODE"
fi

read_env_value() {
  local key="$1"
  awk -F= -v wanted="$key" '$1 == wanted { sub(/^[^=]*=/, ""); print; exit }' "$ENV_FILE"
}

require_env_key() {
  local key="$1"
  [[ -n "$(read_env_value "$key")" ]] || fail "required staging env key is missing: $key"
}

for key in \
  POSTGRES_PASSWORD \
  DATABASE_URL \
  BETTER_AUTH_SECRET \
  BETTER_AUTH_URL \
  BETTER_AUTH_TRUSTED_ORIGINS \
  AEMET_API_KEY \
  OBJECT_STORAGE_ENDPOINT \
  OBJECT_STORAGE_BUCKET \
  OBJECT_STORAGE_ACCESS_KEY_ID \
  OBJECT_STORAGE_SECRET_ACCESS_KEY \
  STAGING_BIND; do
  require_env_key "$key"
done

BETTER_AUTH_URL_VALUE="$(read_env_value BETTER_AUTH_URL)"
TRUSTED_ORIGINS_VALUE="$(read_env_value BETTER_AUTH_TRUSTED_ORIGINS)"
OBJECT_STORAGE_ENDPOINT_VALUE="$(read_env_value OBJECT_STORAGE_ENDPOINT)"
STAGING_BIND_VALUE="$(read_env_value STAGING_BIND)"
MAIL_TRANSPORT_VALUE="$(read_env_value AUTH_MAIL_TRANSPORT)"

[[ "$BETTER_AUTH_URL_VALUE" = https://* ]] || fail "BETTER_AUTH_URL must use HTTPS in external staging"
TRUSTED_MATCH=0
IFS=',' read -r -a TRUSTED_ORIGINS <<< "$TRUSTED_ORIGINS_VALUE"
for origin in "${TRUSTED_ORIGINS[@]}"; do
  origin="${origin#${origin%%[![:space:]]*}}"
  origin="${origin%${origin##*[![:space:]]}}"
  if [[ "$origin" = "$BETTER_AUTH_URL_VALUE" ]]; then
    TRUSTED_MATCH=1
    break
  fi
done
[[ "$TRUSTED_MATCH" = "1" ]] || fail "BETTER_AUTH_TRUSTED_ORIGINS must include BETTER_AUTH_URL"

[[ "$OBJECT_STORAGE_ENDPOINT_VALUE" = https://* ]] || fail "OBJECT_STORAGE_ENDPOINT must use HTTPS"
case "$STAGING_BIND_VALUE" in
  127.0.0.1:*|localhost:*) ;;
  *) fail "STAGING_BIND must remain loopback-only; got '$STAGING_BIND_VALUE'" ;;
esac

case "${MAIL_TRANSPORT_VALUE:-disabled}" in
  disabled) warn "transactional email is disabled; acceptable before the mail gate, not before pilot" ;;
  resend)
    require_env_key AUTH_MAIL_FROM
    require_env_key RESEND_API_KEY
    ;;
  capture) fail "AUTH_MAIL_TRANSPORT=capture is forbidden on external staging" ;;
  *) fail "unsupported AUTH_MAIL_TRANSPORT in staging env file" ;;
esac

AVAILABLE_KB="$(df -Pk . | awk 'NR==2 {print $4}')"
[[ "$AVAILABLE_KB" =~ ^[0-9]+$ ]] || fail "unable to determine free disk space"
if (( AVAILABLE_KB < MIN_FREE_KB )); then
  fail "insufficient free disk space: ${AVAILABLE_KB}KB available, require at least ${MIN_FREE_KB}KB"
fi

if command -v timedatectl >/dev/null 2>&1; then
  NTP_SYNC="$(timedatectl show -p NTPSynchronized --value 2>/dev/null || true)"
  if [[ "$NTP_SYNC" != "yes" ]]; then
    warn "host does not report synchronized NTP; correct clock sync before HTTPS/session gates"
  fi
else
  warn "timedatectl unavailable; verify host clock synchronization manually"
fi

# A shared Docker host may legitimately have unrelated services on these
# ports. Warn rather than reject the host. After deploy, the isolation gate
# proves that Mágina's own API/PostgreSQL/worker containers publish no ports.
if command -v ss >/dev/null 2>&1; then
  if ss -ltnH | awk '{print $4}' | grep -Eq '(^|:)(3001|5432)$'; then
    warn "another host service already listens on 3001 or 5432; allowed on a shared host, but Mágina containers must remain private in post-deploy gate"
  fi
else
  warn "ss unavailable; Mágina host-port exposure will be verified after deploy via Docker inspect"
fi

log "PASS linux=$(uname -m) docker=yes compose=yes env_mode=$ENV_MODE free_kb=$AVAILABLE_KB aemet=yes"
