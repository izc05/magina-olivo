import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

type ExportParams = { exportId: string };

type ExportRow = {
  id: string;
  schema_version: number;
  status: 'requested' | 'generating' | 'ready' | 'expired' | 'failed';
  filename: string;
  size_bytes: string | null;
  sha256: string | null;
  error_message: string | null;
  requested_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  expires_at: Date | null;
};

type DownloadRow = ExportRow & {
  artifact_text: string | null;
};

function responseFor(row: ExportRow) {
  const ready = row.status === 'ready' && row.expires_at && row.expires_at.getTime() > Date.now();
  return {
    id: row.id,
    schemaVersion: row.schema_version,
    status: row.status,
    filename: row.filename,
    sizeBytes: row.size_bytes,
    sha256: row.sha256,
    error: row.status === 'failed' ? row.error_message : null,
    requestedAt: row.requested_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    expiresAt: row.expires_at,
    downloadUrl: ready ? `/api/v1/account/exports/${row.id}/download` : null,
  };
}

async function expireReadyExports(userId: string): Promise<void> {
  await getPool().query(
    `
      update account_exports
      set status = 'expired',
          artifact_text = null,
          updated_at = now()
      where user_id = $1
        and status = 'ready'
        and expires_at <= now()
    `,
    [userId],
  );
}

export function registerAccountExportRoutes(app: FastifyInstance): void {
  app.get('/api/v1/account/exports', async (request, reply) => {
    const session = await getAuthenticatedSession(request);
    if (!session) {
      return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    }

    await expireReadyExports(session.user.id);
    const result = await getPool().query<ExportRow>(
      `
        select
          id, schema_version, status, filename, size_bytes, sha256, error_message,
          requested_at, started_at, completed_at, expires_at
        from account_exports
        where user_id = $1
        order by requested_at desc, id desc
        limit 10
      `,
      [session.user.id],
    );

    return { items: result.rows.map(responseFor) };
  });

  app.post('/api/v1/account/exports', async (request, reply) => {
    const session = await getAuthenticatedSession(request);
    if (!session) {
      return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    }

    await expireReadyExports(session.user.id);
    const existing = await getPool().query<ExportRow>(
      `
        select
          id, schema_version, status, filename, size_bytes, sha256, error_message,
          requested_at, started_at, completed_at, expires_at
        from account_exports
        where user_id = $1
          and (
            status in ('requested', 'generating')
            or (status = 'ready' and expires_at > now())
          )
        order by requested_at desc, id desc
        limit 1
      `,
      [session.user.id],
    );

    if (existing.rows[0]) {
      return reply.code(200).send({ export: responseFor(existing.rows[0]) });
    }

    const exportId = randomUUID();
    const jobId = randomUUID();
    const date = new Date().toISOString().slice(0, 10);
    const filename = `magina-olivo-portabilidad-${date}-${exportId.slice(0, 8)}.json`;
    const requesterSnapshot = {
      id: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
    };

    const client = await getPool().connect();
    try {
      await client.query('begin');
      const inserted = await client.query<ExportRow>(
        `
          insert into account_exports (
            id, user_id, requester_snapshot, schema_version, status, filename
          )
          values ($1, $2, $3::jsonb, 1, 'requested', $4)
          returning
            id, schema_version, status, filename, size_bytes, sha256, error_message,
            requested_at, started_at, completed_at, expires_at
        `,
        [exportId, session.user.id, JSON.stringify(requesterSnapshot), filename],
      );

      await client.query(
        `
          insert into job_queue (
            id, kind, payload, status, max_attempts, dedupe_key
          )
          values ($1, 'account.export.generate', $2::jsonb, 'queued', 5, $3)
        `,
        [
          jobId,
          JSON.stringify({ exportId, userId: session.user.id }),
          `account-export:${exportId}`,
        ],
      );
      await client.query('commit');

      const row = inserted.rows[0];
      if (!row) throw new Error('Account export insert returned no row');
      return reply.code(202).send({ export: responseFor(row) });
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  });

  app.get<{ Params: ExportParams }>(
    '/api/v1/account/exports/:exportId/download',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const result = await getPool().query<DownloadRow>(
        `
          select
            id, schema_version, status, filename, artifact_text, size_bytes, sha256,
            error_message, requested_at, started_at, completed_at, expires_at
          from account_exports
          where id = $1 and user_id = $2
          limit 1
        `,
        [request.params.exportId, session.user.id],
      );
      const row = result.rows[0];
      if (!row) {
        return reply.code(404).send(apiError(request, 'EXPORT_NOT_FOUND', 'Export not found'));
      }

      if (row.status === 'ready' && row.expires_at && row.expires_at.getTime() <= Date.now()) {
        await getPool().query(
          `
            update account_exports
            set status = 'expired', artifact_text = null, updated_at = now()
            where id = $1 and user_id = $2 and status = 'ready'
          `,
          [row.id, session.user.id],
        );
        return reply.code(410).send(apiError(request, 'EXPORT_EXPIRED', 'Export has expired'));
      }

      if (row.status === 'expired') {
        return reply.code(410).send(apiError(request, 'EXPORT_EXPIRED', 'Export has expired'));
      }
      if (row.status !== 'ready' || !row.artifact_text) {
        return reply.code(409).send(apiError(request, 'EXPORT_NOT_READY', 'Export is not ready yet'));
      }

      reply.header('Cache-Control', 'private, no-store');
      reply.header('Content-Disposition', `attachment; filename="${row.filename}"`);
      reply.header('X-Content-SHA256', row.sha256 ?? '');
      reply.type('application/json; charset=utf-8');
      return reply.send(row.artifact_text);
    },
  );
}
