import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';
import pg from 'pg';
import { augmentAccountExportWithTasks } from './account-export-tasks.ts';
import { expireAccountExports, generateAccountExport } from './account-export.ts';
import { inspectMarketSources } from './market-source.ts';
import { inspectRaifOlivarSource } from './raif-source.ts';
import { captureRadarFrame } from './radar-capture.ts';
import { scanRainAlerts } from './rain-alert-scan.ts';

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
const accountExportTtlHours = Number(process.env.ACCOUNT_EXPORT_TTL_HOURS ?? '24');
const rainAlertScanMinutes = Number(process.env.RAIN_ALERT_SCAN_MINUTES ?? '30');
const radarCaptureMinutes = Number(process.env.WEATHER_RADAR_CAPTURE_MINUTES ?? '10');

if (!Number.isFinite(pollMilliseconds) || pollMilliseconds < 100) {
  throw new Error('WORKER_POLL_MS must be at least 100');
}
if (!Number.isFinite(retrySeconds) || retrySeconds < 1) {
  throw new Error('WORKER_RETRY_SECONDS must be at least 1');
}
if (!Number.isFinite(leaseSeconds) || leaseSeconds < 10) {
  throw new Error('WORKER_LEASE_SECONDS must be at least 10');
}
if (!Number.isFinite(accountExportTtlHours) || accountExportTtlHours < 1 || accountExportTtlHours > 168) {
  throw new Error('ACCOUNT_EXPORT_TTL_HOURS must be between 1 and 168');
}
if (!Number.isFinite(rainAlertScanMinutes) || rainAlertScanMinutes < 5 || rainAlertScanMinutes > 1440) {
  throw new Error('RAIN_ALERT_SCAN_MINUTES must be between 5 and 1440');
}
if (!Number.isFinite(radarCaptureMinutes) || radarCaptureMinutes < 5 || radarCaptureMinutes > 60) {
  throw new Error('WEATHER_RADAR_CAPTURE_MINUTES must be between 5 and 60');
}

const rainScheduleReconcileMilliseconds = Math.min(rainAlertScanMinutes * 60_000, 60_000);
const radarScheduleReconcileMilliseconds = Math.min(radarCaptureMinutes * 60_000, 60_000);
let nextRainScheduleReconcileAt = 0;
let nextRadarScheduleReconcileAt = 0;

const pool = new Pool({ connectionString: databaseUrl });

type JobRow = {
  id: string;
  kind: string;
  payload: unknown;
  attempts: number;
  max_attempts: number;
};

type AccountExportJobPayload = {
  exportId: string;
  userId: string;
};

function parseAccountExportPayload(payload: unknown): AccountExportJobPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid account export job payload');
  }
  const value = payload as Record<string, unknown>;
  if (typeof value.exportId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.exportId)) {
    throw new Error('Invalid account export id');
  }
  if (typeof value.userId !== 'string' || value.userId.length < 1 || value.userId.length > 255) {
    throw new Error('Invalid account export user id');
  }
  return { exportId: value.exportId, userId: value.userId };
}

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

async function renewJobLease(jobId: string): Promise<void> {
  const renewed = await pool.query(
    `
      update job_queue
      set locked_at = now(),
          updated_at = now()
      where id = $1
        and status = 'running'
        and locked_by = $2
      returning id
    `,
    [jobId, workerId],
  );
  if (renewed.rowCount === 0) {
    throw new Error(`Worker lease lost for job ${jobId}`);
  }
}

async function withJobLeaseHeartbeat<T>(jobId: string, task: () => Promise<T>): Promise<T> {
  const heartbeatMilliseconds = Math.max(1000, Math.min(30_000, Math.floor((leaseSeconds * 1000) / 3)));
  let heartbeatError: unknown = null;

  await renewJobLease(jobId);
  const timer = setInterval(() => {
    void renewJobLease(jobId).catch((error) => {
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

async function inspectRaifPublicSource(): Promise<void> {
  try {
    const inspection = await inspectRaifOlivarSource();

    await pool.query(
      `
        update public_data_sources
        set source_url = $1,
            last_checked_at = $2::timestamptz,
            last_success_at = $2::timestamptz,
            last_error = null,
            metadata = metadata || $3::jsonb,
            updated_at = now()
        where source_key = 'raif-olivar-observations'
      `,
      [
        inspection.url,
        inspection.checkedAt,
        JSON.stringify({
          remoteEtag: inspection.etag,
          remoteLastModified: inspection.lastModified,
          remoteContentLength: inspection.contentLength,
          remoteContentType: inspection.contentType,
          inspectionMode: 'HEAD',
          sourceDatePolicy: 'catalog-or-validated-snapshot-only',
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

async function inspectMarketPublicSource(): Promise<void> {
  try {
    const inspections = await inspectMarketSources();
    const checkedAt = inspections.reduce((latest, item) => item.checkedAt > latest ? item.checkedAt : latest, inspections[0]?.checkedAt ?? new Date().toISOString());
    const metadata = Object.fromEntries(inspections.map((item) => [item.kind, {
      url: item.url,
      remoteEtag: item.etag,
      remoteLastModified: item.lastModified,
      remoteContentLength: item.contentLength,
      remoteContentType: item.contentType,
    }]));

    await pool.query(
      `
        update public_data_sources
        set last_checked_at = $1::timestamptz,
            last_success_at = $1::timestamptz,
            last_error = null,
            metadata = metadata || $2::jsonb || '{"inspectionMode":"HEAD","currentness":"inspected-headers-only"}'::jsonb,
            updated_at = now()
        where source_key = 'observatorio-agricultural-prices'
      `,
      [checkedAt, JSON.stringify({ inspectedResources: metadata })],
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
        'observatorio-agricultural-prices',
        (error instanceof Error ? error.message : String(error)).slice(0, 4000),
      ],
    );
    throw error;
  }
}

async function ensureRainAlertScanScheduled(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query("select pg_advisory_xact_lock(hashtext('magina-weather-rain-scheduler'))");

    const active = await client.query<{ count: string }>(
      `
        select count(*)::text as count
        from job_queue
        where kind = 'weather.rain.scan'
          and status in ('queued', 'retry', 'running')
      `,
    );

    if (Number(active.rows[0]?.count ?? '0') === 0) {
      const revived = await client.query(
        `
          update job_queue
          set status = 'queued',
              attempts = 0,
              run_after = now(),
              locked_at = null,
              locked_by = null,
              last_error = null,
              completed_at = null,
              updated_at = now()
          where dedupe_key = 'weather.rain.scan:bootstrap'
            and status in ('succeeded', 'failed')
          returning id
        `,
      );

      if (revived.rowCount === 0) {
        await client.query(
          `
            insert into job_queue (id, kind, payload, dedupe_key, run_after)
            values ($1, 'weather.rain.scan', '{}'::jsonb, 'weather.rain.scan:bootstrap', now())
            on conflict (dedupe_key) do nothing
          `,
          [randomUUID()],
        );
      }
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function reconcileRainAlertSchedule(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now < nextRainScheduleReconcileAt) return;
  await ensureRainAlertScanScheduled();
  nextRainScheduleReconcileAt = now + rainScheduleReconcileMilliseconds;
}

async function scheduleNextRainAlertScan(currentJobId: string): Promise<void> {
  await pool.query(
    `
      insert into job_queue (id, kind, payload, dedupe_key, run_after)
      values ($1, 'weather.rain.scan', '{}'::jsonb, $2, now() + ($3 * interval '1 minute'))
      on conflict do nothing
    `,
    [randomUUID(), `weather.rain.scan:after:${currentJobId}`, rainAlertScanMinutes],
  );
}

async function ensureRadarCaptureScheduled(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query("select pg_advisory_xact_lock(hashtext('magina-weather-radar-scheduler'))");

    const active = await client.query<{ count: string }>(
      `
        select count(*)::text as count
        from job_queue
        where kind = 'weather.radar.capture'
          and status in ('queued', 'retry', 'running')
      `,
    );

    if (Number(active.rows[0]?.count ?? '0') === 0) {
      const revived = await client.query(
        `
          update job_queue
          set status = 'queued',
              attempts = 0,
              max_attempts = 1,
              run_after = now(),
              locked_at = null,
              locked_by = null,
              last_error = null,
              completed_at = null,
              updated_at = now()
          where dedupe_key = 'weather.radar.capture:bootstrap'
            and status in ('succeeded', 'failed')
          returning id
        `,
      );

      if (revived.rowCount === 0) {
        await client.query(
          `
            insert into job_queue (id, kind, payload, max_attempts, dedupe_key, run_after)
            values ($1, 'weather.radar.capture', '{}'::jsonb, 1, 'weather.radar.capture:bootstrap', now())
            on conflict (dedupe_key) do nothing
          `,
          [randomUUID()],
        );
      }
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function reconcileRadarCaptureSchedule(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now < nextRadarScheduleReconcileAt) return;
  await ensureRadarCaptureScheduled();
  nextRadarScheduleReconcileAt = now + radarScheduleReconcileMilliseconds;
}

async function scheduleNextRadarCapture(currentJobId: string): Promise<void> {
  await pool.query(
    `
      insert into job_queue (id, kind, payload, max_attempts, dedupe_key, run_after)
      values ($1, 'weather.radar.capture', '{}'::jsonb, 1, $2, now() + ($3 * interval '1 minute'))
      on conflict (dedupe_key) do nothing
    `,
    [randomUUID(), `weather.radar.capture:after:${currentJobId}`, radarCaptureMinutes],
  );
}

async function executeJob(job: JobRow): Promise<void> {
  switch (job.kind) {
    case 'spike.noop':
      return;
    case 'account.export.generate': {
      const payload = parseAccountExportPayload(job.payload);
      await generateAccountExport(pool, payload.exportId, payload.userId, accountExportTtlHours);
      await augmentAccountExportWithTasks(pool, payload.exportId, payload.userId);
      return;
    }
    case 'public.raif.inspect':
      await inspectRaifPublicSource();
      return;
    case 'public.market.inspect':
      await inspectMarketPublicSource();
      return;
    case 'weather.rain.scan': {
      try {
        const result = await withJobLeaseHeartbeat(job.id, () => scanRainAlerts(pool));
        console.log(JSON.stringify({ event: 'rain_alert_scan_completed', ...result }));
      } finally {
        await scheduleNextRainAlertScan(job.id);
      }
      return;
    }
    case 'weather.radar.capture': {
      try {
        const result = await withJobLeaseHeartbeat(job.id, () => captureRadarFrame(pool));
        console.log(JSON.stringify({ event: 'weather_radar_capture_completed', ...result }));
      } finally {
        await scheduleNextRadarCapture(job.id);
      }
      return;
    }
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
  await expireAccountExports(pool);
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

function logLoopFailure(event: string, error: unknown): void {
  console.warn(JSON.stringify({
    event,
    error: error instanceof Error ? error.message : String(error),
  }));
}

async function bootstrapWeatherSchedules(): Promise<void> {
  while (true) {
    let rainReady = true;
    let radarReady = true;

    try {
      await reconcileRainAlertSchedule(true);
    } catch (error) {
      rainReady = false;
      logLoopFailure('rain_alert_scheduler_bootstrap_failed', error);
    }

    try {
      await reconcileRadarCaptureSchedule(true);
    } catch (error) {
      radarReady = false;
      logLoopFailure('radar_scheduler_bootstrap_failed', error);
    }

    if (rainReady && radarReady) return;
    await sleep(Math.max(pollMilliseconds, 1000));
  }
}

async function reconcileWeatherSchedules(): Promise<void> {
  try {
    await reconcileRainAlertSchedule();
  } catch (error) {
    logLoopFailure('rain_alert_scheduler_reconcile_failed', error);
  }

  try {
    await reconcileRadarCaptureSchedule();
  } catch (error) {
    logLoopFailure('radar_scheduler_reconcile_failed', error);
  }
}

async function main(): Promise<void> {
  if (runOnce) {
    try {
      await runWorkerIteration();
    } finally {
      await pool.end();
    }
    return;
  }

  await bootstrapWeatherSchedules();

  while (true) {
    try {
      const processed = await runWorkerIteration();
      await reconcileWeatherSchedules();
      if (!processed) {
        await sleep(pollMilliseconds);
      }
    } catch (error) {
      logLoopFailure('worker_iteration_failed', error);
      await sleep(Math.max(pollMilliseconds, 1000));
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
