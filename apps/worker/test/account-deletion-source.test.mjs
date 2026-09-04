import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repoRoot = new URL('../../../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, repoRoot), 'utf8');
}

function includesAll(text, needles) {
  for (const needle of needles) {
    assert.ok(text.includes(needle), `expected source to include: ${needle}`);
  }
}

test('account deletion request is atomically queued outside the generic worker queue', async () => {
  const route = await source('apps/api/src/account-deletion-routes.ts');

  includesAll(route, [
    "pg_advisory_xact_lock",
    "insert into account_deletion_jobs",
    "WORKER_RETRIES_EXHAUSTED",
    "await client.query('begin')",
    "await client.query('commit')",
  ]);
  assert.equal(route.includes('job_queue'), false, 'destructive deletion must not use generic job_queue');
});

test('physical deletion worker preserves shared holdings and revokes auth after storage cleanup', async () => {
  const worker = await source('apps/worker/src/account-deletion-worker.ts');

  includesAll(worker, [
    'account_deletion_jobs',
    'account_deletion_cleanup_objects',
    'getPrivateStorage',
    'SHARED_HOLDING_REVIEW_REQUIRED',
    'HOLDING_OWNERSHIP_REVIEW_REQUIRED',
    'deleteUserSessions',
    'deleteUser',
    'delete from holdings',
    'deletePrivateObjects',
    'deleteBetterAuthIdentity',
  ]);
  assert.equal(worker.includes('job_queue'), false, 'dedicated deletion worker must not claim generic jobs');
  assert.ok(
    worker.indexOf('await deletePrivateObjects(requestId)') < worker.indexOf('await deleteBetterAuthIdentity(prepared.userId)'),
    'private objects must be cleaned before Better Auth identity removal',
  );
});

test('deletion migrations keep a durable object manifest and block membership races', async () => {
  const cleanup = await source('db/migrations/0022_account_deletion_cleanup_objects.sql');
  const jobs = await source('db/migrations/0023_account_deletion_jobs.sql');
  const membershipGuard = await source('db/migrations/0024_block_memberships_during_account_deletion.sql');

  includesAll(cleanup, ['account_deletion_cleanup_objects', 'object_key', 'deleted_at', 'last_error']);
  includesAll(jobs, ['account_deletion_jobs', "'queued'", "'running'", "'retry'", "'succeeded'", "'failed'"]);
  includesAll(membershipGuard, [
    'holding_members_block_during_account_deletion',
    "status in ('requested', 'processing')",
    'before insert or update of user_id, status, role on holding_members',
  ]);
});

test('staging runs deletion in an isolated service with storage and auth credentials', async () => {
  const compose = await source('infra/docker/compose.staging.yml');

  includesAll(compose, [
    'account-deletion-worker:',
    'apps/worker/src/account-deletion-worker.ts',
    'BETTER_AUTH_SECRET:',
    'PRIVATE_STORAGE_DRIVER: s3',
    'OBJECT_STORAGE_ENDPOINT:',
    'OBJECT_STORAGE_BUCKET:',
    'OBJECT_STORAGE_ACCESS_KEY_ID:',
    'OBJECT_STORAGE_SECRET_ACCESS_KEY:',
    'ACCOUNT_DELETION_WORKER_LEASE_SECONDS:',
  ]);
});
