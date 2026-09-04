import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { requirePlatformAdmin } from './admin-access.ts';
import { recordAdminAudit } from './admin-audit.ts';
import { getAuthenticatedSession } from './session.ts';

type ContactBody = {
  name: string;
  email: string;
  category: 'support' | 'commercial' | 'privacy' | 'data_rights' | 'other';
  subject: string;
  message: string;
};

type TicketPatchBody = {
  status?: 'new' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
  priority?: 'normal' | 'high' | 'urgent';
};

type LegalBody = {
  documentKey: 'privacy' | 'cookies' | 'terms';
  version: string;
  title: string;
  contentText: string;
  status: 'draft' | 'active' | 'archived';
  effectiveAt?: string | null;
};

type EvidencePatchBody = {
  status: 'unknown' | 'ok' | 'warning' | 'failed';
  summary?: string | null;
  checkedAt?: string | null;
};

const contactSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'email', 'category', 'subject', 'message'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 120 },
    email: { type: 'string', format: 'email', maxLength: 320 },
    category: { type: 'string', enum: ['support', 'commercial', 'privacy', 'data_rights', 'other'] },
    subject: { type: 'string', minLength: 3, maxLength: 180 },
    message: { type: 'string', minLength: 10, maxLength: 5000 },
  },
} as const;

function legalKeyLabel(key: LegalBody['documentKey']): string {
  if (key === 'privacy') return 'Privacidad';
  if (key === 'cookies') return 'Cookies';
  return 'Términos y condiciones';
}

export function registerSupportLegalSystemRoutes(app: FastifyInstance): void {
  app.post<{ Body: ContactBody }>(
    '/api/v1/public/contact',
    { schema: { body: contactSchema } },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      const id = randomUUID();
      await getPool().query(`
        insert into support_tickets (
          id, requester_user_id, requester_name, requester_email, category, subject, message
        ) values ($1, $2, $3, $4, $5, $6, $7)
      `, [
        id,
        session?.user.id ?? null,
        request.body.name.trim(),
        request.body.email.trim().toLowerCase(),
        request.body.category,
        request.body.subject.trim(),
        request.body.message.trim(),
      ]);

      reply.code(201).header('cache-control', 'no-store');
      return {
        id,
        status: 'received',
        guidance: 'No envíes contraseñas, códigos de acceso ni tokens por este canal.',
      };
    },
  );

  app.get('/api/v1/admin/support/tickets', async (request, reply) => {
    const session = await requirePlatformAdmin(request, reply);
    if (!session) return;

    const result = await getPool().query<{
      id: string;
      requester_name: string;
      requester_email: string;
      category: string;
      subject: string;
      message: string;
      status: string;
      priority: string;
      created_at: Date;
      updated_at: Date;
      notes_count: number;
    }>(`
      select t.id, t.requester_name, t.requester_email, t.category, t.subject, t.message,
        t.status, t.priority, t.created_at, t.updated_at,
        count(n.id)::int as notes_count
      from support_tickets t
      left join support_ticket_notes n on n.ticket_id = t.id
      group by t.id
      order by
        case t.status when 'new' then 0 when 'in_progress' then 1 when 'waiting_user' then 2 else 3 end,
        case t.priority when 'urgent' then 0 when 'high' then 1 else 2 end,
        t.created_at desc
      limit 200
    `);

    reply.header('cache-control', 'private, no-store');
    return {
      items: result.rows.map((row) => ({
        id: row.id,
        requesterName: row.requester_name,
        requesterEmail: row.requester_email,
        category: row.category,
        subject: row.subject,
        message: row.message,
        status: row.status,
        priority: row.priority,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        notesCount: row.notes_count,
      })),
    };
  });

  app.patch<{ Params: { ticketId: string }; Body: TicketPatchBody }>(
    '/api/v1/admin/support/tickets/:ticketId',
    {
      schema: {
        params: { type: 'object', required: ['ticketId'], properties: { ticketId: { type: 'string', format: 'uuid' } } },
        body: {
          type: 'object', additionalProperties: false, minProperties: 1,
          properties: {
            status: { type: 'string', enum: ['new', 'in_progress', 'waiting_user', 'resolved', 'closed'] },
            priority: { type: 'string', enum: ['normal', 'high', 'urgent'] },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await requirePlatformAdmin(request, reply);
      if (!session) return;

      const result = await getPool().query<{ id: string; subject: string }>(`
        update support_tickets
        set status = coalesce($2, status),
            priority = coalesce($3, priority),
            assigned_admin_user_id = $4,
            resolved_at = case
              when $2 in ('resolved', 'closed') then coalesce(resolved_at, now())
              when $2 is not null then null
              else resolved_at
            end,
            updated_at = now()
        where id = $1
        returning id, subject
      `, [request.params.ticketId, request.body.status ?? null, request.body.priority ?? null, session.user.id]);
      const ticket = result.rows[0];
      if (!ticket) return reply.code(404).send(apiError(request, 'SUPPORT_TICKET_NOT_FOUND', 'Support ticket not found'));

      await recordAdminAudit(getPool(), session, {
        action: 'support.ticket_update',
        entityType: 'support_ticket',
        entityId: ticket.id,
        summary: `Actualizado ticket: ${ticket.subject}`,
        metadata: { status: request.body.status ?? null, priority: request.body.priority ?? null },
      });

      reply.header('cache-control', 'private, no-store');
      return { ok: true };
    },
  );

  app.post<{ Params: { ticketId: string }; Body: { note: string } }>(
    '/api/v1/admin/support/tickets/:ticketId/notes',
    {
      schema: {
        params: { type: 'object', required: ['ticketId'], properties: { ticketId: { type: 'string', format: 'uuid' } } },
        body: { type: 'object', additionalProperties: false, required: ['note'], properties: { note: { type: 'string', minLength: 1, maxLength: 4000 } } },
      },
    },
    async (request, reply) => {
      const session = await requirePlatformAdmin(request, reply);
      if (!session) return;
      const exists = await getPool().query<{ id: string }>('select id from support_tickets where id = $1 limit 1', [request.params.ticketId]);
      if (!exists.rows[0]) return reply.code(404).send(apiError(request, 'SUPPORT_TICKET_NOT_FOUND', 'Support ticket not found'));

      await getPool().query(
        'insert into support_ticket_notes (id, ticket_id, author_admin_user_id, note) values ($1, $2, $3, $4)',
        [randomUUID(), request.params.ticketId, session.user.id, request.body.note.trim()],
      );
      await getPool().query('update support_tickets set updated_at = now() where id = $1', [request.params.ticketId]);
      await recordAdminAudit(getPool(), session, {
        action: 'support.note_add', entityType: 'support_ticket', entityId: request.params.ticketId,
        summary: 'Añadida nota interna de soporte.', metadata: {},
      });

      reply.code(201).header('cache-control', 'private, no-store');
      return { ok: true };
    },
  );

  app.get('/api/v1/admin/legal/documents', async (request, reply) => {
    const session = await requirePlatformAdmin(request, reply);
    if (!session) return;
    const result = await getPool().query<{
      id: string; document_key: LegalBody['documentKey']; version: string; title: string;
      content_text: string; status: LegalBody['status']; effective_at: Date | null; updated_at: Date;
    }>(`
      select id, document_key, version, title, content_text, status, effective_at, updated_at
      from legal_documents
      order by document_key, case status when 'active' then 0 when 'draft' then 1 else 2 end, updated_at desc
    `);
    reply.header('cache-control', 'private, no-store');
    return { items: result.rows.map((row) => ({
      id: row.id, documentKey: row.document_key, version: row.version, title: row.title,
      contentText: row.content_text, status: row.status, effectiveAt: row.effective_at, updatedAt: row.updated_at,
    })) };
  });

  app.post<{ Body: LegalBody }>(
    '/api/v1/admin/legal/documents',
    {
      schema: {
        body: {
          type: 'object', additionalProperties: false,
          required: ['documentKey', 'version', 'title', 'contentText', 'status'],
          properties: {
            documentKey: { type: 'string', enum: ['privacy', 'cookies', 'terms'] },
            version: { type: 'string', minLength: 1, maxLength: 40 },
            title: { type: 'string', minLength: 1, maxLength: 180 },
            contentText: { type: 'string', minLength: 20, maxLength: 50000 },
            status: { type: 'string', enum: ['draft', 'active', 'archived'] },
            effectiveAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await requirePlatformAdmin(request, reply);
      if (!session) return;
      const client = await getPool().connect();
      const id = randomUUID();
      try {
        await client.query('begin');
        if (request.body.status === 'active') {
          await client.query(
            "update legal_documents set status = 'archived', updated_at = now() where document_key = $1 and status = 'active'",
            [request.body.documentKey],
          );
        }
        await client.query(`
          insert into legal_documents (
            id, document_key, version, title, content_text, status, effective_at, created_by_user_id
          ) values ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          id, request.body.documentKey, request.body.version.trim(), request.body.title.trim(),
          request.body.contentText.trim(), request.body.status, request.body.effectiveAt ?? null, session.user.id,
        ]);
        await recordAdminAudit(client, session, {
          action: 'legal.document_create', entityType: 'legal_document', entityId: id,
          summary: `Creado ${legalKeyLabel(request.body.documentKey)} v${request.body.version.trim()}.`,
          metadata: { key: request.body.documentKey, status: request.body.status },
        });
        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
      reply.code(201).header('cache-control', 'private, no-store');
      return { id };
    },
  );

  app.patch<{ Params: { documentId: string }; Body: { status: LegalBody['status'] } }>(
    '/api/v1/admin/legal/documents/:documentId',
    {
      schema: {
        params: { type: 'object', required: ['documentId'], properties: { documentId: { type: 'string', format: 'uuid' } } },
        body: { type: 'object', additionalProperties: false, required: ['status'], properties: { status: { type: 'string', enum: ['draft', 'active', 'archived'] } } },
      },
    },
    async (request, reply) => {
      const session = await requirePlatformAdmin(request, reply);
      if (!session) return;
      const client = await getPool().connect();
      try {
        await client.query('begin');
        const current = await client.query<{ document_key: LegalBody['documentKey']; title: string }>(
          'select document_key, title from legal_documents where id = $1 for update', [request.params.documentId],
        );
        const document = current.rows[0];
        if (!document) {
          await client.query('rollback');
          return reply.code(404).send(apiError(request, 'LEGAL_DOCUMENT_NOT_FOUND', 'Legal document not found'));
        }
        if (request.body.status === 'active') {
          await client.query(
            "update legal_documents set status = 'archived', updated_at = now() where document_key = $1 and status = 'active' and id <> $2",
            [document.document_key, request.params.documentId],
          );
        }
        await client.query('update legal_documents set status = $2, updated_at = now() where id = $1', [request.params.documentId, request.body.status]);
        await recordAdminAudit(client, session, {
          action: 'legal.document_status', entityType: 'legal_document', entityId: request.params.documentId,
          summary: `Estado legal actualizado: ${document.title}.`, metadata: { status: request.body.status },
        });
        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
      reply.header('cache-control', 'private, no-store');
      return { ok: true };
    },
  );

  app.get<{ Params: { documentKey: LegalBody['documentKey'] } }>(
    '/api/v1/public/legal/:documentKey',
    {
      schema: { params: { type: 'object', required: ['documentKey'], properties: { documentKey: { type: 'string', enum: ['privacy', 'cookies', 'terms'] } } } },
    },
    async (request, reply) => {
      const result = await getPool().query<{
        id: string; document_key: string; version: string; title: string; content_text: string; effective_at: Date | null;
      }>(`
        select id, document_key, version, title, content_text, effective_at
        from legal_documents
        where document_key = $1 and status = 'active'
        limit 1
      `, [request.params.documentKey]);
      const document = result.rows[0];
      if (!document) return reply.code(404).send({ code: 'LEGAL_DOCUMENT_NOT_PUBLISHED', message: 'Legal document not published' });
      reply.header('cache-control', 'public, max-age=300');
      return {
        id: document.id, documentKey: document.document_key, version: document.version,
        title: document.title, contentText: document.content_text, effectiveAt: document.effective_at,
      };
    },
  );

  app.get('/api/v1/account/legal', async (request, reply) => {
    const session = await getAuthenticatedSession(request);
    if (!session) return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    const result = await getPool().query<{
      id: string; document_key: string; version: string; title: string; effective_at: Date | null; accepted_at: Date | null;
    }>(`
      select d.id, d.document_key, d.version, d.title, d.effective_at, a.accepted_at
      from legal_documents d
      left join legal_acceptances a on a.legal_document_id = d.id and a.user_id = $1
      where d.status = 'active'
      order by d.document_key
    `, [session.user.id]);
    reply.header('cache-control', 'private, no-store');
    return { items: result.rows.map((row) => ({
      id: row.id, documentKey: row.document_key, version: row.version, title: row.title,
      effectiveAt: row.effective_at, acceptedAt: row.accepted_at,
    })) };
  });

  app.post<{ Params: { documentId: string } }>(
    '/api/v1/account/legal/:documentId/accept',
    {
      schema: { params: { type: 'object', required: ['documentId'], properties: { documentId: { type: 'string', format: 'uuid' } } } },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      const active = await getPool().query<{ id: string }>(
        "select id from legal_documents where id = $1 and status = 'active' limit 1", [request.params.documentId],
      );
      if (!active.rows[0]) return reply.code(404).send(apiError(request, 'LEGAL_DOCUMENT_NOT_ACTIVE', 'Legal document is not active'));
      await getPool().query(`
        insert into legal_acceptances (id, user_id, legal_document_id, source)
        values ($1, $2, $3, 'web')
        on conflict (user_id, legal_document_id) do nothing
      `, [randomUUID(), session.user.id, request.params.documentId]);
      reply.code(201).header('cache-control', 'private, no-store');
      return { ok: true };
    },
  );

  app.get('/api/v1/admin/system/operations', async (request, reply) => {
    const session = await requirePlatformAdmin(request, reply);
    if (!session) return;
    const result = await getPool().query<{
      evidence_key: string; status: EvidencePatchBody['status']; last_checked_at: Date | null;
      summary: string | null; source: string; updated_at: Date;
    }>('select evidence_key, status, last_checked_at, summary, source, updated_at from system_operational_evidence order by evidence_key');
    reply.header('cache-control', 'private, no-store');
    return {
      items: result.rows.map((row) => ({
        key: row.evidence_key, status: row.status, lastCheckedAt: row.last_checked_at,
        summary: row.summary, source: row.source, updatedAt: row.updated_at,
      })),
      capabilities: {
        databaseBackup: 'scripts/staging-backup.sh',
        restoreDrill: 'scripts/staging-restore-gate.sh',
        browserRestoreExecution: false,
      },
      safety: 'Restore operations are CLI/operations-only and cannot be launched from the admin browser.',
    };
  });

  app.patch<{ Params: { evidenceKey: string }; Body: EvidencePatchBody }>(
    '/api/v1/admin/system/operations/:evidenceKey',
    {
      schema: {
        params: {
          type: 'object', required: ['evidenceKey'],
          properties: { evidenceKey: { type: 'string', enum: ['database_backup', 'private_objects_backup', 'restore_drill', 'release_rollback'] } },
        },
        body: {
          type: 'object', additionalProperties: false, required: ['status'],
          properties: {
            status: { type: 'string', enum: ['unknown', 'ok', 'warning', 'failed'] },
            summary: { anyOf: [{ type: 'string', maxLength: 1000 }, { type: 'null' }] },
            checkedAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await requirePlatformAdmin(request, reply);
      if (!session) return;
      const result = await getPool().query<{ evidence_key: string }>(`
        update system_operational_evidence
        set status = $2, summary = $3, last_checked_at = $4, source = 'manual',
            updated_by_user_id = $5, updated_at = now()
        where evidence_key = $1
        returning evidence_key
      `, [
        request.params.evidenceKey, request.body.status, request.body.summary?.trim() || null,
        request.body.checkedAt ?? new Date().toISOString(), session.user.id,
      ]);
      if (!result.rows[0]) return reply.code(404).send(apiError(request, 'EVIDENCE_NOT_FOUND', 'Operational evidence not found'));
      await recordAdminAudit(getPool(), session, {
        action: 'system.evidence_update', entityType: 'system_operational_evidence', entityId: request.params.evidenceKey,
        summary: `Actualizada evidencia operativa: ${request.params.evidenceKey}.`, metadata: { status: request.body.status },
      });
      reply.header('cache-control', 'private, no-store');
      return { ok: true };
    },
  );
}
