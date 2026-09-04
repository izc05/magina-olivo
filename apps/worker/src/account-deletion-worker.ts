import { hostname } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';
import type pg from 'pg';
import { auth } from '../../api/src/auth.ts';
import { closeDatabase, getPool } from '../../api/src/db.ts';
import { getPrivateStorage } from '../../api/src/private-storage.ts';

const pool = getPool();
const storage = getPrivateStorage();

const workerId = process.env.ACCOUNT_DELETION_WORKER_ID?.trim()
  || `account-deletion:${hostname()}:${process.pid}`;
const pollMilliseconds = Number(process.env.ACCOUNT_DELETION_WORKER_POLL_MS ?? '5000');
const retrySeconds = Number(process.env.ACCOUNT_DELETION_WORKER_RETRY_SECONDS ?? '15');
const leaseSeconds = Number(process.env.ACCOUNT_DELETION_WORKER_LEASE_SECONDS ?? '180');
const runOnce = process.env.RUN_ONCE === '1';

if (!Number.isFinite(pollMilliseconds) || pollMilliseconds < 250) {
  throw new Error('ACCOUNT_DELETION_WORKER_POLL_MS must be at least 250');
}
if (!Number.isFinite(retrySeconds) || retrySeconds < 1) {
  throw new Error('ACCOUNT_DELETION_WORKER_RETRY_SECONDS must be at least 1');
}
if (!Number.isFinite(leaseSeconds) || leaseSeconds < 30) {
  throw new Error('ACCOUNT_DELETION_WORKER_LEASE_SECONDS must be at least 30');
}

type DeletionJob = {
  request_id: string;
  attempts: number;
  max_attempts: number;
};

type DeletionRequestRow = {
  id: string;
  user_id: string;
  status: 'requested' | 'processing' | 'completed' | 'cancelled' | 'failed';
};

type MembershipRow = {
  holding_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'collaborator' | 'viewer';
  status: 'active' | 'suspended' | 'revoked';
};

type CleanupObjectRow = {
  object_key: string;
};

type BetterAuthDeletionAdapter = {
  deleteUserSessions(userId: string): Promise<unknown>;
  deleteUser(userId: string): Promise<unknown>;
};

function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 4000);
}

async function markExpiredExhaustedJobs(client: pg.PoolClient): Promise<void> {
  const expired = await client.query<{ request_id: string }>(
    `
      update account_deletion_jobs
      set status = 'failed',
          locked_at = null,
          locked_by = null,
          last_error = coalesce(last_error, 'Deletion worker lease expired after maximum attempts'),
          completed_at = now(),
          updated_at = now()
      where status = 'running'
        and locked_at <= now() - ($1 * interval '1 second')
        and attempts >= max_attempts
      returning request_id
    `,
    [leaseSeconds],
  );

  for (const row of expired.rows) {
    await client.query(
      `
        update account_deletion_requests
        set status = 'failed',
            failed_at = coalesce(failed_at, now()),
            failure_code = coalesce(failure_code, 'WORKER_RETRIES_EXHAUSTED'),
            version = version + 1,
            updated_at = now()
        where id = $1
          and status in ('requested', 'processing')
      `,
      [row.request_id],
    );
  }
}

async function claimNextJob(): Promise<DeletionJob | null> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await markExpiredExhaustedJobs(client);

    const selected = await client.query<DeletionJob>(
      `
        select request_id, attempts, max_attempts
        from account_deletion_jobs
        where attempts < max_attempts
          and (
            (status in ('queued', 'retry') and run_after <= now())
            or (
              status = 'running'
              and locked_at <= now() - ($1 * interval '1 second')
            )
          )
        order by
          case when status = 'running' then 0 else 1 end,
          coalesce(locked_at, run_after) asc,
          created_at asc,
          request_id asc
        for update skip locked
        limit 1
      `,
      [leaseSeconds],
    );

    const job = selected.rows[0];
    if (!job) {
      await client.query('commit');
      return null;
    }

    const claimed = await client.query<DeletionJob>(
      `
        update account_deletion_jobs
        set status = 'running',
            attempts = attempts + 1,
            locked_at = now(),
            locked_by = $2,
            last_error = null,
            completed_at = null,
            updated_at = now()
        where request_id = $1
        returning request_id, attempts, max_attempts
      `,
      [job.request_id, workerId],
    );

    await client.query('commit');
    return claimed.rows[0] ?? null;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function renewLease(requestId: string): Promise<void> {
  const renewed = await pool.query(
    `
      update account_deletion_jobs
      set locked_at = now(), updated_at = now()
      where request_id = $1
        and status = 'running'
        and locked_by = $2
      returning request_id
    `,
    [requestId, workerId],
  );
  if (renewed.rowCount === 0) {
    throw new Error(`Deletion worker lease lost for request ${requestId}`);
  }
}

async function withLeaseHeartbeat<T>(requestId: string, task: () => Promise<T>): Promise<T> {
  const heartbeatMilliseconds = Math.max(2_000, Math.min(30_000, Math.floor((leaseSeconds * 1000) / 3)));
  let heartbeatError: unknown = null;

  await renewLease(requestId);
  const timer = setInterval(() => {
    void renewLease(requestId).catch((error) => {
      if (heartbeatError == null) heartbeatError = error;
    });
  }, heartbeatMilliseconds);
  timer.unref();

  try {
    const result = await task();
    if (heartbeatError != null) throw heartbeatError;
    return result;
  } finally {
    clearInterval(timer);
  }
}

async function failForManualReview(
  client: pg.PoolClient,
  requestId: string,
  failureCode: 'SHARED_HOLDING_REVIEW_REQUIRED' | 'HOLDING_OWNERSHIP_REVIEW_REQUIRED',
): Promise<void> {
  await client.query(
    `
      update account_deletion_requests
      set status = 'failed',
          failed_at = now(),
          failure_code = $2,
          version = version + 1,
          updated_at = now()
      where id = $1
        and status in ('requested', 'processing')
    `,
    [requestId, failureCode],
  );
}

async function preparePrivateDataDeletion(requestId: string): Promise<{ terminal: boolean; userId: string | null }> {
  const client = await pool.connect();
  try {
    await client.query('begin');

    const requestResult = await client.query<DeletionRequestRow>(
      `
        select id, user_id, status
        from account_deletion_requests
        where id = $1
        for update
      `,
      [requestId],
    );
    const request = requestResult.rows[0];
    if (!request) throw new Error(`Account deletion request ${requestId} does not exist`);

    if (request.status === 'completed' || request.status === 'cancelled' || request.status === 'failed') {
      await client.query('commit');
      return { terminal: true, userId: request.user_id.startsWith('deleted:') ? null : request.user_id };
    }

    await client.query(
      `
        update account_deletion_requests
        set status = 'processing',
            failure_code = null,
            failed_at = null,
            version = version + 1,
            updated_at = now()
        where id = $1
      `,
      [requestId],
    );

    const ownMemberships = await client.query<MembershipRow>(
      `
        select holding_id::text, user_id, role, status
        from holding_members
        where user_id = $1
          and status <> 'revoked'
      `,
      [request.user_id],
    );
    const holdingIds = [...new Set(ownMemberships.rows.map((row) => row.holding_id))];

    if (holdingIds.length > 0) {
      // Lock parent rows first. New holding_members inserts need an FK key-share lock
      // on holdings and therefore cannot race this ownership decision and delete.
      await client.query(
        `select id from holdings where id = any($1::uuid[]) for update`,
        [holdingIds],
      );

      const memberships = await client.query<MembershipRow>(
        `
          select holding_id::text, user_id, role, status
          from holding_members
          where holding_id = any($1::uuid[])
          for update
        `,
        [holdingIds],
      );

      const requesterMemberships = memberships.rows.filter(
        (row) => row.user_id === request.user_id && row.status !== 'revoked',
      );
      if (requesterMemberships.some((row) => row.role !== 'owner')) {
        await failForManualReview(client, requestId, 'HOLDING_OWNERSHIP_REVIEW_REQUIRED');
        await client.query('commit');
        return { terminal: true, userId: request.user_id };
      }

      const hasOtherMember = memberships.rows.some(
        (row) => row.user_id !== request.user_id && row.status !== 'revoked',
      );
      if (hasOtherMember) {
        await failForManualReview(client, requestId, 'SHARED_HOLDING_REVIEW_REQUIRED');
        await client.query('commit');
        return { terminal: true, userId: request.user_id };
      }

      const documents = await client.query<CleanupObjectRow>(
        `
          select object_key
          from documents
          where holding_id = any($1::uuid[])
          order by object_key asc
        `,
        [holdingIds],
      );

      for (const document of documents.rows) {
        await client.query(
          `
            insert into account_deletion_cleanup_objects (request_id, object_key)
            values ($1, $2)
            on conflict (request_id, object_key) do nothing
          `,
          [requestId, document.object_key],
        );
      }

      await client.query(`delete from holdings where id = any($1::uuid[])`, [holdingIds]);
    }

    // User-scoped rows that are not owned by the holdings cascade.
    await client.query(`delete from user_preferences where user_id = $1`, [request.user_id]);
    await client.query(`delete from account_exports where user_id = $1`, [request.user_id]);
    await client.query(`delete from idempotency_keys where actor_user_id = $1`, [request.user_id]);

    await client.query('commit');
    return { terminal: false, userId: request.user_id };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function deletePrivateObjects(requestId: string): Promise<void> {
  const pending = await pool.query<CleanupObjectRow>(
    `
      select object_key
      from account_deletion_cleanup_objects
      where request_id = $1
        and deleted_at is null
      order by object_key asc
    `,
    [requestId],
  );

  for (const row of pending.rows) {
    try {
      await storage.delete(row.object_key);
      await pool.query(
        `
          update account_deletion_cleanup_objects
          set deleted_at = now(),
              attempts = attempts + 1,
              last_error = null,
              updated_at = now()
          where request_id = $1 and object_key = $2
        `,
        [requestId, row.object_key],
      );
    } catch (error) {
      await pool.query(
        `
          update account_deletion_cleanup_objects
          set attempts = attempts + 1,
              last_error = $3,
              updated_at = now()
          where request_id = $1 and object_key = $2
        `,
        [requestId, row.object_key, errorMessage(error)],
      );
      throw error;
    }
  }
}

async function deleteBetterAuthIdentity(userId: string): Promise<void> {
  const context = await auth.$context;
  const adapter = context.internalAdapter as unknown as BetterAuthDeletionAdapter;

  // Explicit session removal keeps the operation safe if Better Auth changes
  // deleteUser cascade behavior; both adapter calls are expected to be idempotent.
  await adapter.deleteUserSessions(userId);
  await adapter.deleteUser(userId);
}

async function completeDeletion(requestId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(
      `
        update account_deletion_requests
        set status = 'completed',
            completed_at = coalesce(completed_at, now()),
            failed_at = null,
            failure_code = null,
            user_id = 'deleted:' || id::text,
            source_session_id = 'deleted',
            version = version + 1,
            updated_at = now()
        where id = $1
          and status in ('requested', 'processing')
      `,
      [requestId],
    );
    await client.query(`delete from account_deletion_cleanup_objects where request_id = $1`, [requestId]);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function executeDeletion(requestId: string): Promise<void> {
  const prepared = await preparePrivateDataDeletion(requestId);
  if (prepared.terminal) return;
  if (!prepared.userId) throw new Error('Deletion request lost its user identity before auth cleanup');

  await deletePrivateObjects(requestId);
  await deleteBetterAuthIdentity(prepared.userId);
  await completeDeletion(requestId);
}

async function markSucceeded(requestId: string): Promise<void> {
  await pool.query(
    `
      update account_deletion_jobs
      set status = 'succeeded',
          locked_at = null,
          locked_by = null,
          last_error = null,
          completed_at = now(),
          updated_at = now()
      where request_id = $1
        and status = 'running'
        and locked_by = $2
    `,
    [requestId, workerId],
  );
}

async function markFailed(job: DeletionJob, error: unknown): Promise<void> {
  const message = errorMessage(error);
  const finalFailure = job.attempts >= job.max_attempts;
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(
      `
        update account_deletion_jobs
        set status = $3,
            run_after = case when $3 = 'retry' then now() + ($4 * interval '1 second') else run_after end,
            locked_at = null,
            locked_by = null,
            last_error = $5,
            completed_at = case when $3 = 'failed' then now() else null end,
            updated_at = now()
        where request_id = $1
          and status = 'running'
          and locked_by = $2
      `,
      [job.request_id, workerId, finalFailure ? 'failed' : 'retry', retrySeconds, message],
    );

    if (finalFailure) {
      await client.query(
        `
          update account_deletion_requests
          set status = 'failed',
              failed_at = now(),
              failure_code = 'WORKER_RETRIES_EXHAUSTED',
              version = version + 1,
              updated_at = now()
          where id = $1
            and status in ('requested', 'processing')
        `,
        [job.request_id],
      );
    }
    await client.query('commit');
  } catch (transactionError) {
    await client.query('rollback');
    throw transactionError;
  } finally {
    client.release();
  }
}

export async function runAccountDeletionWorkerIteration(): Promise<boolean> {
  const job = await claimNextJob();
  if (!job) return false;

  try {
    await withLeaseHeartbeat(job.request_id, () => executeDeletion(job.request_id));
    await markSucceeded(job.request_id);
    console.log(JSON.stringify({
      event: 'account_deletion_job_succeeded',
      request_id: job.request_id,
      attempts: job.attempts,
    }));
  } catch (error) {
    await markFailed(job, error);
    console.warn(JSON.stringify({
      event: 'account_deletion_job_failed',
      request_id: job.request_id,
      attempts: job.attempts,
      error: errorMessage(error),
    }));
  }
  return true;
}

let stopping = false;
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    stopping = true;
  });
}

async function main(): Promise<void> {
  do {
    const processed = await runAccountDeletionWorkerIteration();
    if (runOnce || stopping) break;
    if (!processed) await sleep(pollMilliseconds);
  } while (!stopping);
}

void main()
  .catch((error) => {
    console.error(JSON.stringify({ event: 'account_deletion_worker_fatal', error: errorMessage(error) }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
