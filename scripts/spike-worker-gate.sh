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
STALE_JOB='90000000-0000-4000-8000-000000000003'
FRESH_JOB='90000000-0000-4000-8000-000000000004'
EXHAUSTED_JOB='90000000-0000-4000-8000-000000000005'

psql_exec "delete from job_queue where id in ('$SUCCESS_JOB', '$RETRY_JOB', '$STALE_JOB', '$FRESH_JOB', '$EXHAUSTED_JOB')"
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

log "Recovering a job abandoned by a dead worker after its lease expires"
psql_exec "
  insert into job_queue (
    id, kind, payload, status, attempts, max_attempts, run_after,
    locked_at, locked_by, dedupe_key
  ) values (
    '$STALE_JOB', 'spike.noop', '{}'::jsonb, 'running', 1, 3, now() - interval '10 minutes',
    now() - interval '10 minutes', 'dead-worker', 'spike-stale-recovery'
  )
"

RUN_ONCE=1 WORKER_ID='ci-worker-recovery' WORKER_LEASE_SECONDS=60 npm run start --workspace @magina/worker > /tmp/worker-recovery.log 2>&1
cat /tmp/worker-recovery.log

STALE_STATE="$(psql_exec "select status || '|' || attempts || '|' || coalesce(locked_by, '') from job_queue where id='$STALE_JOB'")"
[[ "$STALE_STATE" = "succeeded|2|" ]] || fail "stale job was not safely reclaimed: $STALE_STATE"
grep -q 'job_succeeded' /tmp/worker-recovery.log || fail "recovered job did not emit success log"

log "Keeping a fresh lease fenced while failing an expired exhausted job"
psql_exec "
  insert into job_queue (
    id, kind, payload, status, attempts, max_attempts, run_after,
    locked_at, locked_by, dedupe_key
  ) values
    ('$FRESH_JOB', 'spike.noop', '{}'::jsonb, 'running', 1, 3, now(), now(), 'live-worker', 'spike-fresh-lease'),
    ('$EXHAUSTED_JOB', 'spike.noop', '{}'::jsonb, 'running', 2, 2, now() - interval '10 minutes', now() - interval '10 minutes', 'dead-worker-maxed', 'spike-exhausted-lease')
"

RUN_ONCE=1 WORKER_ID='ci-worker-fence' WORKER_LEASE_SECONDS=60 npm run start --workspace @magina/worker > /tmp/worker-fence.log 2>&1
cat /tmp/worker-fence.log

FRESH_STATE="$(psql_exec "select status || '|' || attempts || '|' || coalesce(locked_by, '') from job_queue where id='$FRESH_JOB'")"
[[ "$FRESH_STATE" = "running|1|live-worker" ]] || fail "fresh worker lease was stolen or mutated: $FRESH_STATE"

EXHAUSTED_STATE="$(psql_exec "select status || '|' || attempts || '|' || coalesce(locked_by, '') || '|' || (last_error like 'Worker lease expired%')::text from job_queue where id='$EXHAUSTED_JOB'")"
[[ "$EXHAUSTED_STATE" = "failed|2||true" ]] || fail "expired exhausted job did not fail cleanly: $EXHAUSTED_STATE"

psql_exec "delete from job_queue where id in ('$SUCCESS_JOB', '$RETRY_JOB', '$STALE_JOB', '$FRESH_JOB', '$EXHAUSTED_JOB')"

log "WORKER GATE PASS"
