import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import {
  hasAdminRole,
  requireAdminSessionRole,
  requireAnyAdmin,
} from './admin-role-access.ts';
import { recordAdminAudit } from './admin-audit.ts';
import { normalizePublicHttpsUrl } from './public-directory-trust.ts';

type TicketPatchBody = {
  status?: 'new' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
  priority?: 'normal' | 'high' | 'urgent';
};

type UpdateDirectoryBody = {
  officialName: string;
  brandName?: string | null;
  entityType: 'cooperative' | 'sat' | 'company' | 'other';
  municipality?: string | null;
  province?: string | null;
  address?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  sourceUrl?: string | null;
  sourceCheckedAt?: string | null;
  verificationStatus: 'unverified' | 'verified' | 'stale';
};

type EvidencePatchBody = {
  status: 'unknown' | 'ok' | 'warning' | 'failed';
  summary?: string | null;
  checkedAt?: string | null;
};

function clean(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function safeHttps(value: string | null | undefined): string | null {
  const normalized = clean(value);
  if (!normalized) return null;
  return normalizePublicHttpsUrl(normalized);
}

export function registerAdminDelegatedRoutes(app: FastifyInstance): void {
  app.get('/api/v1/admin/access', async (request, reply) => {
    const access = await requireAnyAdmin(request, reply);
    if (!access) return;

    const superadmin = access.roles.includes('superadmin');
    reply.header('cache-control', 'private, no-store');
    return {
      administrator: { email: access.session.user.email },
      roles: access.roles,
      bootstrapSuperadmin: access.bootstrapSuperadmin,
      capabilities: {
        commandCenter: true,
        finance: superadmin || hasAdminRole(access, 'commercial'),
        advertising: superadmin,
        content: superadmin || hasAdminRole(access, 'content'),
        support: superadmin || hasAdminRole(access, 'support'),
        operations: superadmin || hasAdminRole(access, 'operations'),
        systemEvidence: superadmin || hasAdminRole(access, 'operations'),
        legal: superadmin,
        users: superadmin,
        roles: superadmin,
      },
    };
  });

  app.get('/api/v1/admin/scoped-summary', async (request, reply) => {
    const access = await requireAnyAdmin(request, reply);
    if (!access) return;

    const superadmin = access.roles.includes('superadmin');
    const canCommercial = superadmin || hasAdminRole(access, 'commercial');
    const canContent = superadmin || hasAdminRole(access, 'content');
    const canSupport = superadmin || hasAdminRole(access, 'support');
    const canOperations = superadmin || hasAdminRole(access, 'operations');

    const result: {
      commercial?: { activeContracts: number; billingNeedsAttention: number };
      content?: { activeAnnouncements: number; featuredNews: number };
      support?: { openTickets: number; urgentTickets: number };
      operations?: { sourcesWithErrors: number; directoryStale: number; evidencePending: number };
    } = {};

    if (canCommercial) {
      const [contracts, billing] = await Promise.all([
        getPool().query<{ count: number }>("select count(*)::int as count from advertising_commercial_contracts where status = 'active'"),
        getPool().query<{ count: number }>("select count(*)::int as count from advertising_billing_entries where status in ('pending', 'issued', 'overdue')"),
      ]);
      result.commercial = {
        activeContracts: contracts.rows[0]?.count ?? 0,
        billingNeedsAttention: billing.rows[0]?.count ?? 0,
      };
    }

    if (canContent) {
      const [announcements, news] = await Promise.all([
        getPool().query<{ count: number }>(`
          select count(*)::int as count
          from platform_announcements
          where status = 'active'
            and (starts_at is null or starts_at <= now())
            and (ends_at is null or ends_at > now())
        `),
        getPool().query<{ count: number }>("select count(*)::int as count from public_news_items where active = true and featured = true"),
      ]);
      result.content = {
        activeAnnouncements: announcements.rows[0]?.count ?? 0,
        featuredNews: news.rows[0]?.count ?? 0,
      };
    }

    if (canSupport) {
      const support = await getPool().query<{ open_count: number; urgent_count: number }>(`
        select
          count(*) filter (where status in ('new', 'in_progress', 'waiting_user'))::int as open_count,
          count(*) filter (where status in ('new', 'in_progress', 'waiting_user') and priority = 'urgent')::int as urgent_count
        from support_tickets
      `);
      result.support = {
        openTickets: support.rows[0]?.open_count ?? 0,
        urgentTickets: support.rows[0]?.urgent_count ?? 0,
      };
    }

    if (canOperations) {
      const [sources, directory, evidence] = await Promise.all([
        getPool().query<{ count: number }>("select count(*)::int as count from public_data_sources where active = true and last_error is not null"),
        getPool().query<{ count: number }>("select count(*)::int as count from cooperatives where verification_status = 'stale'"),
        getPool().query<{ count: number }>("select count(*)::int as count from system_operational_evidence where status <> 'ok'"),
      ]);
      result.operations = {
        sourcesWithErrors: sources.rows[0]?.count ?? 0,
        directoryStale: directory.rows[0]?.count ?? 0,
        evidencePending: evidence.rows[0]?.count ?? 0,
      };
    }

    reply.header('cache-control', 'private, no-store');
    return result;
  });

  app.get('/api/v1/admin/delegated/support/tickets', async (request, reply) => {
    const session = await requireAdminSessionRole(request, reply, 'support');
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
    '/api/v1/admin/delegated/support/tickets/:ticketId',
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
      const session = await requireAdminSessionRole(request, reply, 'support');
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
    '/api/v1/admin/delegated/support/tickets/:ticketId/notes',
    {
      schema: {
        params: { type: 'object', required: ['ticketId'], properties: { ticketId: { type: 'string', format: 'uuid' } } },
        body: { type: 'object', additionalProperties: false, required: ['note'], properties: { note: { type: 'string', minLength: 1, maxLength: 4000 } } },
      },
    },
    async (request, reply) => {
      const session = await requireAdminSessionRole(request, reply, 'support');
      if (!session) return;

      const exists = await getPool().query<{ id: string }>('select id from support_tickets where id = $1 limit 1', [request.params.ticketId]);
      if (!exists.rows[0]) return reply.code(404).send(apiError(request, 'SUPPORT_TICKET_NOT_FOUND', 'Support ticket not found'));

      await getPool().query(
        'insert into support_ticket_notes (id, ticket_id, author_admin_user_id, note) values ($1, $2, $3, $4)',
        [randomUUID(), request.params.ticketId, session.user.id, request.body.note.trim()],
      );
      await getPool().query('update support_tickets set updated_at = now() where id = $1', [request.params.ticketId]);
      await recordAdminAudit(getPool(), session, {
        action: 'support.note_add',
        entityType: 'support_ticket',
        entityId: request.params.ticketId,
        summary: 'Añadida nota interna de soporte.',
        metadata: {},
      });

      reply.code(201).header('cache-control', 'private, no-store');
      return { ok: true };
    },
  );

  app.get('/api/v1/admin/delegated/operations/directory', async (request, reply) => {
    const session = await requireAdminSessionRole(request, reply, 'operations');
    if (!session) return;

    const result = await getPool().query<{
      id: string;
      official_name: string;
      brand_name: string | null;
      entity_type: 'cooperative' | 'sat' | 'company' | 'other';
      municipality: string | null;
      province: string | null;
      address: string | null;
      phone: string | null;
      website_url: string | null;
      source_url: string | null;
      source_checked_at: Date | null;
      verification_status: 'unverified' | 'verified' | 'stale';
      updated_at: Date;
    }>(`
      select id, official_name, brand_name, entity_type, municipality, province,
        address, phone, website_url, source_url, source_checked_at, verification_status, updated_at
      from cooperatives
      order by municipality nulls last, official_name
      limit 250
    `);

    reply.header('cache-control', 'private, no-store');
    return { items: result.rows.map((row) => ({
      id: row.id,
      officialName: row.official_name,
      brandName: row.brand_name,
      entityType: row.entity_type,
      municipality: row.municipality,
      province: row.province,
      address: row.address,
      phone: row.phone,
      websiteUrl: row.website_url,
      sourceUrl: row.source_url,
      sourceCheckedAt: row.source_checked_at,
      verificationStatus: row.verification_status,
      updatedAt: row.updated_at,
    })) };
  });

  app.patch<{ Params: { destinationId: string }; Body: UpdateDirectoryBody }>(
    '/api/v1/admin/delegated/operations/directory/:destinationId',
    {
      schema: {
        params: {
          type: 'object', additionalProperties: false, required: ['destinationId'],
          properties: { destinationId: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['officialName', 'entityType', 'verificationStatus'],
          properties: {
            officialName: { type: 'string', minLength: 1, maxLength: 240 },
            brandName: { anyOf: [{ type: 'string', maxLength: 240 }, { type: 'null' }] },
            entityType: { type: 'string', enum: ['cooperative', 'sat', 'company', 'other'] },
            municipality: { anyOf: [{ type: 'string', maxLength: 160 }, { type: 'null' }] },
            province: { anyOf: [{ type: 'string', maxLength: 160 }, { type: 'null' }] },
            address: { anyOf: [{ type: 'string', maxLength: 500 }, { type: 'null' }] },
            phone: { anyOf: [{ type: 'string', maxLength: 80 }, { type: 'null' }] },
            websiteUrl: { anyOf: [{ type: 'string', maxLength: 2000 }, { type: 'null' }] },
            sourceUrl: { anyOf: [{ type: 'string', maxLength: 2000 }, { type: 'null' }] },
            sourceCheckedAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
            verificationStatus: { type: 'string', enum: ['unverified', 'verified', 'stale'] },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await requireAdminSessionRole(request, reply, 'operations');
      if (!session) return;

      const websiteUrl = safeHttps(request.body.websiteUrl);
      const sourceUrl = safeHttps(request.body.sourceUrl);
      if (clean(request.body.websiteUrl) && !websiteUrl) {
        return reply.code(400).send(apiError(request, 'INVALID_PUBLIC_WEBSITE_URL', 'Website URL must be public HTTPS without embedded credentials'));
      }
      if (clean(request.body.sourceUrl) && !sourceUrl) {
        return reply.code(400).send(apiError(request, 'INVALID_PUBLIC_SOURCE_URL', 'Source URL must be public HTTPS without embedded credentials'));
      }

      const client = await getPool().connect();
      try {
        await client.query('begin');
        const updated = await client.query<{ id: string }>(`
          update cooperatives
          set official_name = $2,
              brand_name = $3,
              entity_type = $4,
              municipality = $5,
              province = $6,
              address = $7,
              phone = $8,
              website_url = $9,
              source_url = $10,
              source_checked_at = $11,
              verification_status = $12,
              updated_at = now()
          where id = $1
          returning id
        `, [
          request.params.destinationId,
          request.body.officialName.trim(),
          clean(request.body.brandName),
          request.body.entityType,
          clean(request.body.municipality),
          clean(request.body.province),
          clean(request.body.address),
          clean(request.body.phone),
          websiteUrl,
          sourceUrl,
          request.body.sourceCheckedAt ?? null,
          request.body.verificationStatus,
        ]);
        if (!updated.rows[0]) {
          await client.query('rollback');
          return reply.code(404).send(apiError(request, 'DIRECTORY_ENTRY_NOT_FOUND', 'Directory entry not found'));
        }
        await recordAdminAudit(client, session, {
          action: 'directory.update',
          entityType: 'directory_entry',
          entityId: request.params.destinationId,
          summary: `Ficha pública actualizada: ${request.body.officialName.trim()}`,
          metadata: { verificationStatus: request.body.verificationStatus, entityType: request.body.entityType },
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

  app.get('/api/v1/admin/delegated/operations/sources', async (request, reply) => {
    const session = await requireAdminSessionRole(request, reply, 'operations');
    if (!session) return;

    const result = await getPool().query<{
      source_key: string;
      label: string;
      provider: string;
      active: boolean;
      source_updated_at: Date | null;
      last_checked_at: Date | null;
      last_success_at: Date | null;
      last_error: string | null;
      update_frequency: string | null;
    }>(`
      select source_key, label, provider, active, source_updated_at, last_checked_at,
        last_success_at, last_error, update_frequency
      from public_data_sources
      order by case when last_error is not null then 0 else 1 end, label
    `);

    reply.header('cache-control', 'private, no-store');
    return { items: result.rows.map((row) => ({
      sourceKey: row.source_key,
      label: row.label,
      provider: row.provider,
      active: row.active,
      sourceUpdatedAt: row.source_updated_at,
      lastCheckedAt: row.last_checked_at,
      lastSuccessAt: row.last_success_at,
      lastError: row.last_error,
      updateFrequency: row.update_frequency,
    })) };
  });

  app.get('/api/v1/admin/delegated/operations/audit', async (request, reply) => {
    const session = await requireAdminSessionRole(request, reply, 'operations');
    if (!session) return;

    const result = await getPool().query<{
      id: string;
      action: string;
      entity_type: string;
      summary: string;
      occurred_at: Date;
    }>(`
      select id, action, entity_type, summary, occurred_at
      from platform_admin_audit_log
      order by occurred_at desc
      limit 100
    `);

    reply.header('cache-control', 'private, no-store');
    return { items: result.rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entity_type,
      summary: row.summary,
      occurredAt: row.occurred_at,
    })) };
  });

  app.get('/api/v1/admin/delegated/operations/system', async (request, reply) => {
    const session = await requireAdminSessionRole(request, reply, 'operations');
    if (!session) return;

    const result = await getPool().query<{
      evidence_key: string;
      status: EvidencePatchBody['status'];
      last_checked_at: Date | null;
      summary: string | null;
      source: string;
      updated_at: Date;
    }>('select evidence_key, status, last_checked_at, summary, source, updated_at from system_operational_evidence order by evidence_key');

    reply.header('cache-control', 'private, no-store');
    return {
      items: result.rows.map((row) => ({
        key: row.evidence_key,
        status: row.status,
        lastCheckedAt: row.last_checked_at,
        summary: row.summary,
        source: row.source,
        updatedAt: row.updated_at,
      })),
      capabilities: {
        browserRestoreExecution: false,
      },
      safety: 'Restore operations are CLI/operations-only and cannot be launched from the admin browser.',
    };
  });

  app.patch<{ Params: { evidenceKey: string }; Body: EvidencePatchBody }>(
    '/api/v1/admin/delegated/operations/system/:evidenceKey',
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
      const session = await requireAdminSessionRole(request, reply, 'operations');
      if (!session) return;

      const updated = await getPool().query<{ evidence_key: string }>(`
        update system_operational_evidence
        set status = $2,
            summary = $3,
            last_checked_at = $4,
            source = 'manual',
            updated_by_user_id = $5,
            updated_at = now()
        where evidence_key = $1
        returning evidence_key
      `, [
        request.params.evidenceKey,
        request.body.status,
        request.body.summary?.trim() || null,
        request.body.checkedAt ?? new Date().toISOString(),
        session.user.id,
      ]);
      if (!updated.rows[0]) return reply.code(404).send(apiError(request, 'EVIDENCE_NOT_FOUND', 'Operational evidence not found'));

      await recordAdminAudit(getPool(), session, {
        action: 'system.evidence_update',
        entityType: 'system_operational_evidence',
        entityId: request.params.evidenceKey,
        summary: `Actualizada evidencia operativa: ${request.params.evidenceKey}.`,
        metadata: { status: request.body.status },
      });

      reply.header('cache-control', 'private, no-store');
      return { ok: true };
    },
  );
}
