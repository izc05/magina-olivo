#!/usr/bin/env bash
set -euo pipefail

BACKUP_SCRIPT="scripts/staging-backup.sh"
RESTORE_SCRIPT="scripts/staging-restore-gate.sh"

fail() {
  printf '[staging-backup-restore-contract] ERROR: %s\n' "$*" >&2
  exit 1
}

for script in "$BACKUP_SCRIPT" "$RESTORE_SCRIPT"; do
  [[ -f "$script" ]] || fail "missing script: $script"
  grep -Fq 'docker exec -i "$PG_CONTAINER" sh -c' "$script" \
    || fail "$script must send manifest SQL through docker exec stdin"
  grep -Fq 'exec psql -U "$POSTGRES_USER"' "$script" \
    || fail "$script must exec psql for manifest generation"
  grep -Fq "<<'SQL'" "$script" \
    || fail "$script must retain a literal SQL heredoc"
  grep -Fq "select 'activities', count(*) from activities;" "$script" \
    || fail "$script must verify activities in the relational manifest"
  grep -Fq "select 'tasks', count(*) from tasks;" "$script" \
    || fail "$script must verify tasks in the relational manifest"
done

grep -Fq 'sh "$RESTORE_DB"' "$RESTORE_SCRIPT" \
  || fail "restore manifest must pass the isolated database as a positional argument"

if grep -Fq "<<'\"'\"'SQL'\"'\"'" "$BACKUP_SCRIPT" "$RESTORE_SCRIPT"; then
  fail "manifest SQL heredocs must not be nested inside a quoted sh -c argument"
fi

grep -Fq 'ACTIVE_BUCKET="$(read_env_value OBJECT_STORAGE_BUCKET)"' "$RESTORE_SCRIPT" \
  || fail "restore gate must read the active staging bucket"
grep -Fq '[[ "$RESTORE_BUCKET" != "$ACTIVE_BUCKET" ]]' "$RESTORE_SCRIPT" \
  || fail "restore gate must reject the active staging bucket"
grep -Fq 'restore bucket must differ from active staging bucket' "$RESTORE_SCRIPT" \
  || fail "restore gate must expose an explicit active-bucket failure"

grep -Fq "manifest.bucket === targetBucket" scripts/import-private-objects.mjs \
  || fail "object importer must retain source-bucket protection"
grep -Fq "Restore target bucket" scripts/import-private-objects.mjs \
  || fail "object importer must retain empty-target validation"

printf '[staging-backup-restore-contract] PASS stdin_sql=yes activities=yes tasks=yes isolated_bucket=yes importer_defense=yes\n'
