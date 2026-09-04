import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { PoolClient } from 'pg';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

type DeletionStatus = 'requested' | 'processing' | 'completed' | 'cancelled' | 'failed';

type DeletionRow = {
  id: string;
  status: DeletionStatus;
  requested_at: Date;
  confirmed_at: Date;
  completed_at: Date | null;
  cancelled_at: Date | null;
  failed_at: Date | null;
  failure_code: string | null;
};

type DeletionBody = {
  email: string;
  confirmation: string;
};

function responseFor(row: DeletionRow) {
  return {
    id: row.id,
    status: row.status,
    requestedAt: row.requested_at,
    confirmedAt: row.confirmed_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    failedAt: row.failed_at,
    failureCode: row.status === 'failed' ? row.failure_code : null,
  };
}

function recentSessionLimitMs(): number {
  const configuredMinutes = Number(process.env.ACCOUNT_DELETION_RECENT_AUTH_MINUTES ?? '30');
  const minutes = Number.isFinite(configuredMinutes) && configuredMinutes > 0
    ? configuredMinutes
    : 30;
  return minutes * 60_000;
}

async function ensureDeletionJob(client: PoolClient, requestId: string): Promise<void> {
  await client.query(
    `
      insert into account_deletion_jobs (request_id, status, max_attempts, run_after)
      values ($1, 'queued', 25, now())
      on conflict (request_id) do update
      set status = case
            when account_deletion_jobs.status = 'failed' then 'queued'
            else account_deletion_jobs.status
          end,
          attempts = case
            when account_deletion_jobs.status = 'failed' then 0
            else account_deletion_jobs.attempts
          end,
          max_attempts = greatest(account_deletion_jobs.max_attempts, 25),
          run_after = case
            when account_deletion_jobs.status = 'failed' then now()
            else account_deletion_jobs.run_after
          end,
          locked_at = case
            when account_deletion_jobs.status = 'failed' then null
            else account_deletion_jobs.locked_at
          end,
          locked_by = case
            when account_deletion_jobs.status = 'failed' then null
            else account_deletion_jobs.locked_by
          end,
          last_error = case
            when account_deletion_jobs.status = 'failed' then null
            else account_deletion_jobs.last_error
          end,
          completed_at = case
            when account_deletion_jobs.status = 'failed' then null
            else account_deletion_jobs.completed_at
          end,
          updated_at = now()
    `,
    [requestId],
  );
}

export function registerAccountDeletionRoutes(app: FastifyInstance): void {
  app.get('/api/v1/account/deletion-request', async (request, reply) => {
    const session = await getAuthenticatedSession(request);
    if (!session) {
      return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    }

    const result = await getPool().query<DeletionRow>(
      `
        select
          id, status, requested_at, confirmed_at, completed_at,
          cancelled_at, failed_at, failure_code
        from account_deletion_requests
        where user_id = $1
        order by requested_at desc, id desc
        limit 1
      `,
      [session.user.id],
    );

    return { request: result.rows[0] ? responseFor(result.rows[0]) : null };
  });

  app.post<{ Body: DeletionBody }>('/api/v1/account/deletion-request', async (request, reply) => {
    const session = await getAuthenticatedSession(request);
    if (!session) {
      return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    }

    const expectedEmail = String(session.user.email ?? '').trim().toLocaleLowerCase('es');
    const suppliedEmail = String(request.body?.email ?? '').trim().toLocaleLowerCase('es');
    const confirmation = String(request.body?.confirmation ?? '').trim().toLocaleUpperCase('es');

    if (!expectedEmail || suppliedEmail !== expectedEmail || confirmation !== 'ELIMINAR') {
      return reply.code(400).send(
        apiError(
          request,
          'DELETION_CONFIRMATION_INVALID',
          'Escribe el correo de tu cuenta y la palabra ELIMINAR para confirmar la solicitud.',
        ),
      );
    }

    const createdAt = new Date(session.session.createdAt).getTime();
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > recentSessionLimitMs()) {
      return reply.code(409).send(
        apiError(
          request,
          'RECENT_AUTH_REQUIRED',
          'Por seguridad, vuelve a iniciar sesión antes de solicitar la eliminación de la cuenta.',
        ),
      );
    }

    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('begin');

      // Serialize requests for this user before consulting the partial unique
      // index. This gives deterministic idempotency even under double-submit.
      await client.query(
        `select pg_advisory_xact_lock(hashtext('account-deletion:' || $1::text))`,
        [session.user.id],
      );

      const existing = await client.query<DeletionRow>(
        `
          select
            id, status, requested_at, confirmed_at, completed_at,
            cancelled_at, failed_at, failure_code
          from account_deletion_requests
          where user_id = $1
            and status in ('requested', 'processing')
          order by requested_at desc, id desc
          limit 1
          for update
        `,
        [session.user.id],
      );

      if (existing.rows[0]) {
        await ensureDeletionJob(client, existing.rows[0].id);
        await client.query('commit');
        return reply.code(200).send({ request: responseFor(existing.rows[0]) });
      }

      // Operational retry exhaustion is resumable. Reuse the same request so
      // its durable object-cleanup manifest cannot become orphaned by a second
      // deletion request.
      const resumable = await client.query<DeletionRow>(
        `
          select
            id, status, requested_at, confirmed_at, completed_at,
            cancelled_at, failed_at, failure_code
          from account_deletion_requests
          where user_id = $1
            and status = 'failed'
            and failure_code = 'WORKER_RETRIES_EXHAUSTED'
          order by requested_at desc, id desc
          limit 1
          for update
        `,
        [session.user.id],
      );

      if (resumable.rows[0]) {
        const resumed = await client.query<DeletionRow>(
          `
            update account_deletion_requests
            set status = 'processing',
                failed_at = null,
                failure_code = null,
                version = version + 1,
                updated_at = now()
            where id = $1
            returning
              id, status, requested_at, confirmed_at, completed_at,
              cancelled_at, failed_at, failure_code
          `,
          [resumable.rows[0].id],
        );
        const row = resumed.rows[0];
        if (!row) throw new Error('Account deletion request resume returned no row');
        await ensureDeletionJob(client, row.id);
        await client.query('commit');
        return reply.code(202).send({ request: responseFor(row) });
      }

      const id = randomUUID();
      const inserted = await client.query<DeletionRow>(
        `
          insert into account_deletion_requests (
            id, user_id, status, source_session_id
          )
          values ($1, $2, 'requested', $3)
          returning
            id, status, requested_at, confirmed_at, completed_at,
            cancelled_at, failed_at, failure_code
        `,
        [id, session.user.id, session.session.id],
      );

      const row = inserted.rows[0];
      if (!row) throw new Error('Account deletion request insert returned no row');

      // Queue creation is in the same database transaction as the request, so
      // we cannot persist a confirmed deletion request that has no executor.
      await ensureDeletionJob(client, id);
      await client.query('commit');

      return reply.code(202).send({ request: responseFor(row) });
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  });
}
