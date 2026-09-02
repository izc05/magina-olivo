#!/usr/bin/env bash
set -euo pipefail

POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:18-alpine}"
POSTGRES_USER="${POSTGRES_USER:-magina}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-magina_ci}"
SOURCE_DB="${SOURCE_DB:-magina_olivo}"

log() {
  printf '[worker-gate] %s\n' "$*"
}

fail() {
  printf '[worker-gate] ERROR: %s\n' "$*" >&2
  exit 1
}

PG_CONTAINER="$(docker ps --filter "ancestor=${POSTGRES_IMAGE}" --format '{{.ID}}' | head -n 1)"
[[ -n "$PG_CONTAINER" ]] || fail "PostgreSQL service container not found"

psql_exec() {
  docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$PG_CONTAINER" \
    psql -U "$POSTGRES_USER" -d "$SOURCE_DB" -Atqc "$1" | tr -d '\r'
}

SUCCESS_JOB='90000000-0000-4000-8000-000000000001'
RETRY_JOB='90000000-0000-4000-8000-000000000002'

psql_exec "delete from job_queue where id in ('$SUCCESS_JOB', '$RETRY_JOB')"
psql_exec "insert into job_queue (id, kind, payload, max_attempts, dedupe_key) values ('$SUCCESS_JOB', 'spike.noop', '{\"message\":\"worker-ok\"}'::jsonb, 3, 'spike-success')"

log "Processing one durable success job"
RUN_ONCE=1 WORKER_ID='ci-worker-success' npm run start --workspace @magina/worker > /tmp/worker-success.log 2>&1
cat /tmp/worker-success.log

SUCCESS_STATE="$(psql_exec "select status || '|' || attempts || '|' || coalesce(locked_by, '') from job_queue where id='$SUCCESS_JOB'")"
[[ "$SUCCESS_STATE" = "succeeded|1|" ]] || fail "success job state unexpected: $SUCCESS_STATE"

grep -q 'job_succeeded' /tmp/worker-success.log || fail "success job did not emit structured completion log"

psql_exec "insert into job_queue (id, kind, payload, max_attempts, dedupe_key) values ('$RETRY_JOB', 'spike.unsupported', '{}'::jsonb, 2, 'spike-retry')"

log "Processing one failing job into retry state"
RUN_ONCE=1 WORKER_ID='ci-worker-retry' WORKER_RETRY_SECONDS=30 npm run start --workspace @magina/worker > /tmp/worker-retry.log 2>&1
cat /tmp/worker-retry.log

RETRY_STATE="$(psql_exec "select status || '|' || attempts || '|' || (last_error like 'Unsupported job kind:%')::text from job_queue where id='$RETRY_JOB'")"
[[ "$RETRY_STATE" = "retry|1|true" ]] || fail "retry job state unexpected: $RETRY_STATE"

grep -q 'job_failed' /tmp/worker-retry.log || fail "failed job did not emit structured failure log"

READY_NOW="$(psql_exec "select count(*) from job_queue where id='$RETRY_JOB' and status='retry' and run_after <= now()")"
[[ "$READY_NOW" = "0" ]] || fail "retry backoff was not scheduled into the future"

log "WORKER GATE PASS"
