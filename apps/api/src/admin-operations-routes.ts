import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { requirePlatformAdmin } from './admin-access.ts';
import { recordAdminAudit } from './admin-audit.ts';
import { normalizePublicHttpsUrl } from './public-directory-trust.ts';

type UserQuery = { q?: string };
type DirectoryQuery = { q?: string; municipality?: string; verificationStatus?: 'unverified' | 'verified' | 'stale' };
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

function clean(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function safeHttps(value: string | null | undefined): string | null {
  const normalized = clean(value);
  if (!normalized) return null;
  return normalizePublicHttpsUrl(normalized);
}

export function registerAdminOperationsRoutes(app: FastifyInstance): void {
  app.get<{ Querystring: UserQuery }>(
    '/api/v1/admin/users',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: { q: { type: 'string', maxLength: 120 } },
        },
      },
    },
    async (request, reply) => {
      const session = await requirePlatformAdmin(request, reply);
      if (!session) return;

      const values: unknown[] = [];
      let filter = '';
      const q = request.query.q?.trim();
      if (q) {
        values.push(`%${q}%`);
        filter = `where (
          coalesce(to_jsonb(u)->>'email', '') ilike $1
          or coalesce(to_jsonb(u)->>'name', '') ilike $1
        )`;
      }

      const result = await getPool().query<{
        id: string;
        name: string | null;
        email: string;
        created_at: string | null;
        updated_at: string | null;
        holdings_count: number;
        roles: string | null;
        last_membership_at: Date | null;
      }>(`
        select
          to_jsonb(u)->>'id' as id,
          nullif(to_jsonb(u)->>'name', '') as name,
          coalesce(to_jsonb(u)->>'email', '') as email,
          coalesce(to_jsonb(u)->>'createdAt', to_jsonb(u)->>'created_at') as created_at,
          coalesce(to_jsonb(u)->>'updatedAt', to_jsonb(u)->>'updated_at') as updated_at,
          coalesce(m.holdings_count, 0)::int as holdings_count,
          m.roles,
          m.last_membership_at
        from "user" u
        left join lateral (
          select
            count(*) filter (where hm.status = 'active') as holdings_count,
            string_agg(distinct hm.role, ', ' order by hm.role) filter (where hm.status = 'active') as roles,
            max(hm.updated_at) as last_membership_at
          from holding_members hm
          where hm.user_id = to_jsonb(u)->>'id'
        ) m on true
        ${filter}
        order by coalesce(to_jsonb(u)->>'createdAt', to_jsonb(u)->>'created_at') desc nulls last
        limit 200
      `, values);

      reply.header('cache-control', 'private, no-store');
      return {
        administratorUserId: session.user.id,
        items: result.rows.map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          holdingsCount: row.holdings_count,
          roles: row.roles ? row.roles.split(', ') : [],
          lastMembershipAt: row.last_membership_at,
        })),
      };
    },
  );

  app.post<{ Params: { userId: string } }>(
    '/api/v1/admin/users/:userId/revoke-sessions',
    {
      schema: {
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['userId'],
          properties: { userId: { type: 'string', minLength: 1, maxLength: 255 } },
        },
      },
    },
    async (request, reply) => {
      const session = await requirePlatformAdmin(request, reply);
      if (!session) return;
      if (request.params.userId === session.user.id) {
        return reply.code(400).send(apiError(request, 'ADMIN_SELF_SESSION_REVOKE_BLOCKED', 'Use normal sign-out for your own administrator session'));
      }

      const user = await getPool().query<{ email: string }>(`
        select coalesce(to_jsonb(u)->>'email', '') as email
        from "user" u
        where to_jsonb(u)->>'id' = $1
        limit 1
      `, [request.params.userId]);
      if (!user.rows[0]) {
        return reply.code(404).send(apiError(request, 'USER_NOT_FOUND', 'User not found'));
      }

      const client = await getPool().connect();
      try {
        await client.query('begin');
        const deleted = await client.query(
          `delete from "session" s where to_jsonb(s)->>'userId' = $1 or to_jsonb(s)->>'user_id' = $1`,
          [request.params.userId],
        );
        await recordAdminAudit(client, session, {
          action: 'user.sessions.revoke',
          entityType: 'user',
          entityId: request.params.userId,
          summary: 'Sesiones de usuario revocadas desde soporte',
          metadata: { sessionsRevoked: deleted.rowCount ?? 0 },
        });
        await client.query('commit');
        reply.header('cache-control', 'private, no-store');
        return { ok: true, sessionsRevoked: deleted.rowCount ?? 0 };
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },
  );

  app.get<{ Querystring: DirectoryQuery }>(
    '/api/v1/admin/directory',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            q: { type: 'string', maxLength: 120 },
            municipality: { type: 'string', maxLength: 120 },
            verificationStatus: { type: 'string', enum: ['unverified', 'verified', 'stale'] },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await requirePlatformAdmin(request, reply);
      if (!session) return;

      const values: unknown[] = [];
      const filters: string[] = [];
      if (request.query.q?.trim()) {
        values.push(`%${request.query.q.trim()}%`);
        filters.push(`(c.official_name ilike $${values.length} or coalesce(c.brand_name, '') ilike $${values.length})`);
      }
      if (request.query.municipality?.trim()) {
        values.push(request.query.municipality.trim());
        filters.push(`c.municipality = $${values.length}`);
      }
      if (request.query.verificationStatus) {
        values.push(request.query.verificationStatus);
        filters.push(`c.verification_status = $${values.length}`);
      }

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
        from cooperatives c
        ${filters.length ? `where ${filters.join(' and ')}` : ''}
        order by municipality nulls last, official_name
        limit 250
      `, values);

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
    },
  );

  app.patch<{ Params: { destinationId: string }; Body: UpdateDirectoryBody }>(
    '/api/v1/admin/directory/:destinationId',
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
      const session = await requirePlatformAdmin(request, reply);
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
        const result = await client.query<{ id: string }>(`
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
        if (!result.rows[0]) {
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
        reply.header('cache-control', 'private, no-store');
        return { ok: true };
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },
  );

  app.get('/api/v1/admin/sources', async (request, reply) => {
    const session = await requirePlatformAdmin(request, reply);
    if (!session) return;
    const result = await getPool().query<{
      source_key: string; label: string; provider: string; active: boolean;
      source_updated_at: Date | null; last_checked_at: Date | null; last_success_at: Date | null;
      last_error: string | null; update_frequency: string | null;
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

  app.get('/api/v1/admin/audit', async (request, reply) => {
    const session = await requirePlatformAdmin(request, reply);
    if (!session) return;
    const result = await getPool().query<{
      id: string; actor_email: string; action: string; entity_type: string;
      entity_id: string | null; summary: string; occurred_at: Date;
    }>(`
      select id, actor_email, action, entity_type, entity_id, summary, occurred_at
      from platform_admin_audit_log
      order by occurred_at desc
      limit 200
    `);
    reply.header('cache-control', 'private, no-store');
    return { items: result.rows.map((row) => ({
      id: row.id,
      actorEmail: row.actor_email,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      summary: row.summary,
      occurredAt: row.occurred_at,
    })) };
  });
}
