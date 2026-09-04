import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
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

    const existing = await getPool().query<DeletionRow>(
      `
        select
          id, status, requested_at, confirmed_at, completed_at,
          cancelled_at, failed_at, failure_code
        from account_deletion_requests
        where user_id = $1
          and status in ('requested', 'processing')
        order by requested_at desc, id desc
        limit 1
      `,
      [session.user.id],
    );

    if (existing.rows[0]) {
      return reply.code(200).send({ request: responseFor(existing.rows[0]) });
    }

    const id = randomUUID();
    const inserted = await getPool().query<DeletionRow>(
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

    // Physical deletion is intentionally not triggered here. A dedicated worker
    // must first delete private object-storage files, resolve shared holdings and
    // then revoke sessions/auth data atomically enough to avoid partial deletion.
    return reply.code(202).send({ request: responseFor(row) });
  });
}
