#!/usr/bin/env bash
set -euo pipefail

RUN_ID="${PILOT_RUN_ID:?set PILOT_RUN_ID, e.g. round-01}"
PARTICIPANT_IDS="${PILOT_PARTICIPANT_IDS:-p01,p02}"
EVIDENCE_ROOT="${PILOT_EVIDENCE_DIR:-.deploy/pilot-evidence}"
BASE_URL="${STAGING_BASE_URL:-unset}"

fail() {
  printf '[pilot-evidence] ERROR: %s\n' "$*" >&2
  exit 1
}

log() {
  printf '[pilot-evidence] %s\n' "$*"
}

[[ "$RUN_ID" =~ ^[a-z0-9][a-z0-9-]{1,47}$ ]] \
  || fail "PILOT_RUN_ID must match ^[a-z0-9][a-z0-9-]{1,47}$"

if [[ "$BASE_URL" != "unset" ]]; then
  case "$BASE_URL" in
    https://*) ;;
    *) fail "STAGING_BASE_URL must use https:// when provided" ;;
  esac
fi

IFS=',' read -r -a PARTICIPANTS <<< "$PARTICIPANT_IDS"
[[ ${#PARTICIPANTS[@]} -ge 1 && ${#PARTICIPANTS[@]} -le 5 ]] \
  || fail "PILOT_PARTICIPANT_IDS must contain between 1 and 5 aliases"

for participant in "${PARTICIPANTS[@]}"; do
  [[ "$participant" =~ ^[a-z0-9][a-z0-9-]{1,31}$ ]] \
    || fail "invalid participant alias: $participant"
done

RUN_DIR="$EVIDENCE_ROOT/$RUN_ID"
[[ ! -e "$RUN_DIR" ]] || fail "pilot evidence run already exists: $RUN_DIR"

umask 077
mkdir -p "$RUN_DIR"
chmod 700 "$EVIDENCE_ROOT" "$RUN_DIR" 2>/dev/null || true

SOURCE_SHA="$(git rev-parse HEAD 2>/dev/null || printf 'unavailable')"
STARTED_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

cat > "$RUN_DIR/manifest.txt" <<EOF
Mágina Olivo · Pilot evidence manifest
Run ID: $RUN_ID
Started UTC: $STARTED_UTC
Source SHA: $SOURCE_SHA
Staging URL: $BASE_URL
Participant aliases: ${PARTICIPANTS[*]}

Privacy rule: aliases only. Do not add names, emails, phone numbers, credentials, cookies, tokens, DNI, real farm identifiers or document contents.
EOF

cat > "$RUN_DIR/results.csv" <<'EOF'
participant_id,task,completed,help,time_seconds,ui_error,technical_error,retry,confidence_1_5,severity,notes
EOF

cat > "$RUN_DIR/findings.csv" <<'EOF'
finding_id,participant_id,task,severity,area,summary,reproducible,blocking,fix_commit,status
EOF

cat > "$RUN_DIR/round-checks.csv" <<'EOF'
check,value,required,notes
data_loss_count,,0,
duplicate_count,,0,
cross_user_access_count,,0,
market_understanding_percent,,100,
source_understanding_percent,,100,
critical_mobile_accessibility_blockers,,0,
EOF

cat > "$RUN_DIR/README.txt" <<'EOF'
Use participant aliases only (p01..p05).

For every task T1..T10 add one row to results.csv.
Allowed values:
- completed: yes/no
- help: none/hint/guided
- ui_error: yes/no
- technical_error: yes/no
- retry: yes/no
- confidence_1_5: 1..5
- severity: none/P0/P1/P2

Complete round-checks.csv before calculating GO/NO-GO. Do not leave a required round check blank.

Record concise behavioral observations, not personal information.
Never copy participant credentials into this directory.
EOF

chmod 600 "$RUN_DIR"/*

log "PASS run=$RUN_ID participants=${#PARTICIPANTS[@]} source_sha=$SOURCE_SHA"
log "Evidence directory: $RUN_DIR"
log "This directory is under .deploy/ by default and must remain uncommitted."
