import { hostname } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';
import pg from 'pg';
import { inspectRaifOlivarSource } from './raif-source.ts';

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const workerId = process.env.WORKER_ID?.trim() || `${hostname()}:${process.pid}`;
const runOnce = process.env.RUN_ONCE === '1';
const pollMilliseconds = Number(process.env.WORKER_POLL_MS ?? '5000');
const retrySeconds = Number(process.env.WORKER_RETRY_SECONDS ?? '5');
const leaseSeconds = Number(process.env.WORKER_LEASE_SECONDS ?? '120');

if (!Number.isFinite(pollMilliseconds) || pollMilliseconds < 100) {
  throw new Error('WORKER_POLL_MS must be at least 100');
}
if (!Number.isFinite(retrySeconds) || retrySeconds < 1) {
  throw new Error('WORKER_RETRY_SECONDS must be at least 1');
}
if (!Number.isFinite(leaseSeconds) || leaseSeconds < 10) {
  throw new Error('WORKER_LEASE_SECONDS must be at least 10');
}

const pool = new Pool({ connectionString: databaseUrl });

type JobRow = {
  id: string;
  kind: string;
  payload: unknown;
  attempts: number;
  max_attempts: number;
};

async function markExpiredExhaustedJobs(client: pg.PoolClient): Promise<void> {
  await client.query(
    `
      update job_queue
      set status = 'failed',
          locked_at = null,
          locked_by = null,
          last_error = coalesce(last_error, 'Worker lease expired after maximum attempts'),
          completed_at = now(),
          updated_at = now()
      where status = 'running'
        and locked_at <= now() - ($1 * interval '1 second')
        and attempts >= max_attempts
    `,
    [leaseSeconds],
  );
}

async function claimNextJob(): Promise<JobRow | null> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await markExpiredExhaustedJobs(client);

    const selected = await client.query<JobRow>(
      `
        select id, kind, payload, attempts, max_attempts
        from job_queue
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
          id asc
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

    const claimed = await client.query<JobRow>(
      `
        update job_queue
        set status = 'running',
            attempts = attempts + 1,
            locked_at = now(),
            locked_by = $2,
            last_error = null,
            completed_at = null,
            updated_at = now()
        where id = $1
        returning id, kind, payload, attempts, max_attempts
      `,
      [job.id, workerId],
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

async function inspectRaifPublicSource(): Promise<void> {
  try {
    const inspection = await inspectRaifOlivarSource();
    const parsedLastModified = inspection.lastModified ? new Date(inspection.lastModified) : null;
    const sourceUpdatedAt = parsedLastModified && Number.isFinite(parsedLastModified.getTime())
      ? parsedLastModified.toISOString()
      : null;

    await pool.query(
      `
        update public_data_sources
        set source_url = $1,
            source_updated_at = coalesce($2::timestamptz, source_updated_at),
            last_checked_at = $3::timestamptz,
            last_success_at = $3::timestamptz,
            last_error = null,
            metadata = metadata || $4::jsonb,
            updated_at = now()
        where source_key = 'raif-olivar-observations'
      `,
      [
        inspection.url,
        sourceUpdatedAt,
        inspection.checkedAt,
        JSON.stringify({
          remoteEtag: inspection.etag,
          remoteLastModified: inspection.lastModified,
          remoteContentLength: inspection.contentLength,
          remoteContentType: inspection.contentType,
          inspectionMode: 'HEAD',
        }),
      ],
    );
  } catch (error) {
    await pool.query(
      `
        update public_data_sources
        set last_checked_at = now(),
            last_error = $2,
            updated_at = now()
        where source_key = $1
      `,
      [
        'raif-olivar-observations',
        (error instanceof Error ? error.message : String(error)).slice(0, 4000),
      ],
    );
    throw error;
  }
}

async function executeJob(job: JobRow): Promise<void> {
  switch (job.kind) {
    case 'spike.noop':
      return;
    case 'public.raif.inspect':
      await inspectRaifPublicSource();
      return;
    default:
      throw new Error(`Unsupported job kind: ${job.kind}`);
  }
}

async function markSucceeded(jobId: string): Promise<void> {
  await pool.query(
    `
      update job_queue
      set status = 'succeeded',
          locked_at = null,
          locked_by = null,
          completed_at = now(),
          updated_at = now()
      where id = $1 and status = 'running' and locked_by = $2
    `,
    [jobId, workerId],
  );
}

async function markFailed(job: JobRow, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const finalFailure = job.attempts >= job.max_attempts;

  await pool.query(
    `
      update job_queue
      set status = $3,
          run_after = case when $3 = 'retry' then now() + ($4 * interval '1 second') else run_after end,
          locked_at = null,
          locked_by = null,
          last_error = $5,
          completed_at = case when $3 = 'failed' then now() else null end,
          updated_at = now()
      where id = $1 and status = 'running' and locked_by = $2
    `,
    [job.id, workerId, finalFailure ? 'failed' : 'retry', retrySeconds, message.slice(0, 4000)],
  );
}

export async function runWorkerIteration(): Promise<boolean> {
  const job = await claimNextJob();
  if (!job) return false;

  try {
    await executeJob(job);
    await markSucceeded(job.id);
    console.log(JSON.stringify({ event: 'job_succeeded', job_id: job.id, kind: job.kind, attempts: job.attempts }));
  } catch (error) {
    await markFailed(job, error);
    console.warn(
      JSON.stringify({
        event: 'job_failed',
        job_id: job.id,
        kind: job.kind,
        attempts: job.attempts,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  return true;
}

async function main(): Promise<void> {
  try {
    if (runOnce) {
      await runWorkerIteration();
      return;
    }

    while (true) {
      const processed = await runWorkerIteration();
      if (!processed) {
        await sleep(pollMilliseconds);
      }
    }
  } finally {
    if (runOnce) {
      await pool.end();
    }
  }
}

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

await main();
