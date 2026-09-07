import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { apiError } from './http-errors.ts';
import { canAccessPlatformConsole, canManagePlatformSources, canManagePublicContent } from './platform-admin-access.ts';
import { getActivePlatformAdminRole, writePlatformAdminAudit } from './platform-admin.ts';
import { getAuthenticatedSession } from './session.ts';
import { getPool } from './db.ts';

type CountRow = { total: string };
type PublicSourceRow = {
  source_key: string;
  label: string;
  provider: string;
  update_frequency: string | null;
  active: boolean;
  last_checked_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
};
type AdminNewsRow = {
  id: string;
  source_key: string;
  source_label: string;
  title: string;
  source_url: string;
  published_at: Date;
  topic: string | null;
  active: boolean;
};

const inspectablePublicSources = {
  'raif-olivar-observations': 'public.raif.inspect',
  'observatorio-agricultural-prices': 'public.market.inspect',
} as const;

function publicSourceStatus(source: PublicSourceRow): 'healthy' | 'degraded' | 'pending' | 'paused' {
  if (!source.active) return 'paused';
  if (source.last_error) return 'degraded';
  if (!source.last_success_at) return 'pending';
  return 'healthy';
}

async function requirePlatformAdmin(request: FastifyRequest, reply: FastifyReply) {
  const session = await getAuthenticatedSession(request);
  if (!session) {
    reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    return null;
  }

  const role = await getActivePlatformAdminRole(session.user.id);
  if (!canAccessPlatformConsole(role)) {
    reply.code(403).send(apiError(request, 'PLATFORM_ADMIN_REQUIRED', 'Platform administration access required'));
    return null;
  }

  return { session, role };
}

function count(result: { rows: CountRow[] }): number {
  return Number(result.rows[0]?.total ?? 0);
}

export function registerAdminRoutes(app: FastifyInstance): void {
  app.get('/api/v1/admin/session', async (request, reply) => {
    const access = await requirePlatformAdmin(request, reply);
    if (!access) return reply;
    return { role: access.role };
  });

  app.get('/api/v1/admin/overview', async (request, reply) => {
    const access = await requirePlatformAdmin(request, reply);
    if (!access) return reply;

    const db = getPool();
    const [users, holdings, farms, plots, cooperatives, activeCampaigns] = await Promise.all([
      db.query<CountRow>('select count(*)::text as total from "user"'),
      db.query<CountRow>('select count(*)::text as total from holdings'),
      db.query<CountRow>('select count(*)::text as total from farms where active = true'),
      db.query<CountRow>('select count(*)::text as total from plots where active = true'),
      db.query<CountRow>("select count(*)::text as total from cooperatives where verification_status <> 'stale'"),
      db.query<CountRow>("select count(*)::text as total from campaigns where status = 'active'"),
    ]);

    await writePlatformAdminAudit({
      actorUserId: access.session.user.id,
      action: 'admin.overview.read',
      requestId: request.id,
      metadata: { role: access.role },
    });

    return {
      role: access.role,
      generatedAt: new Date().toISOString(),
      metrics: {
        users: count(users),
        holdings: count(holdings),
        activeFarms: count(farms),
        activePlots: count(plots),
        publicCooperatives: count(cooperatives),
        activeCampaigns: count(activeCampaigns),
      },
    };
  });

  app.get('/api/v1/admin/public-sources', async (request, reply) => {
    const access = await requirePlatformAdmin(request, reply);
    if (!access) return reply;

    const result = await getPool().query<PublicSourceRow>(
      `
        select source_key, label, provider, update_frequency, active,
               last_checked_at, last_success_at, last_error
        from public_data_sources
        order by label asc
      `,
    );

    await writePlatformAdminAudit({
      actorUserId: access.session.user.id,
      action: 'admin.public_sources.read',
      requestId: request.id,
      metadata: { role: access.role },
    });

    return {
      canManage: canManagePlatformSources(access.role),
      sources: result.rows.map((source) => ({
        key: source.source_key,
        label: source.label,
        provider: source.provider,
        frequency: source.update_frequency,
        active: source.active,
        status: publicSourceStatus(source),
        lastCheckedAt: source.last_checked_at,
        lastSuccessAt: source.last_success_at,
        lastError: source.last_error ? source.last_error.slice(0, 240) : null,
        canInspect: Object.hasOwn(inspectablePublicSources, source.source_key),
      })),
    };
  });

  app.get('/api/v1/admin/news', async (request, reply) => {
    const access = await requirePlatformAdmin(request, reply);
    if (!access) return reply;

    const result = await getPool().query<AdminNewsRow>(
      `
        select n.id, n.source_key, s.label as source_label, n.title, n.source_url,
               n.published_at, n.topic, n.active
        from public_news_items n
        join public_data_sources s on s.source_key = n.source_key
        order by n.published_at desc, n.external_id desc
        limit 50
      `,
    );

    await writePlatformAdminAudit({
      actorUserId: access.session.user.id,
      action: 'admin.news.read',
      requestId: request.id,
      metadata: { role: access.role },
    });

    return {
      canManage: canManagePublicContent(access.role),
      items: result.rows.map((item) => ({
        id: item.id,
        sourceKey: item.source_key,
        sourceLabel: item.source_label,
        title: item.title,
        sourceUrl: item.source_url,
        publishedAt: item.published_at,
        topic: item.topic,
        active: item.active,
      })),
    };
  });

  app.post<{ Params: { newsId: string }; Body: { active?: unknown } }>('/api/v1/admin/news/:newsId/visibility', async (request, reply) => {
    const access = await requirePlatformAdmin(request, reply);
    if (!access) return reply;
    if (!canManagePublicContent(access.role)) {
      return reply.code(403).send(apiError(request, 'PLATFORM_ADMIN_CONTENT_REQUIRED', 'Platform content editor access required'));
    }
    if (typeof request.body?.active !== 'boolean') {
      return reply.code(400).send(apiError(request, 'INVALID_NEWS_VISIBILITY', 'active must be a boolean'));
    }

    const result = await getPool().query<{ id: string; active: boolean }>(
      `update public_news_items set active = $2, updated_at = now() where id = $1 returning id, active`,
      [request.params.newsId, request.body.active],
    );
    const item = result.rows[0];
    if (!item) return reply.code(404).send(apiError(request, 'PUBLIC_NEWS_NOT_FOUND', 'Public news item was not found'));

    await writePlatformAdminAudit({
      actorUserId: access.session.user.id,
      action: 'admin.news.visibility.updated',
      requestId: request.id,
      targetType: 'public_news_item',
      targetId: item.id,
      metadata: { role: access.role, active: item.active },
    });

    return { id: item.id, active: item.active };
  });

  app.post<{ Params: { sourceKey: string } }>('/api/v1/admin/public-sources/:sourceKey/inspect', async (request, reply) => {
    const access = await requirePlatformAdmin(request, reply);
    if (!access) return reply;
    if (!canManagePlatformSources(access.role)) {
      return reply.code(403).send(apiError(request, 'PLATFORM_ADMIN_MANAGE_REQUIRED', 'Platform administrator access required'));
    }

    const kind = inspectablePublicSources[request.params.sourceKey as keyof typeof inspectablePublicSources];
    if (!kind) return reply.code(404).send(apiError(request, 'PUBLIC_SOURCE_NOT_INSPECTABLE', 'This public source cannot be inspected automatically'));

    const db = getPool();
    const dedupeKey = `admin.inspect:${request.params.sourceKey}`;
    const queued = await db.query<{ id: string }>(
      `
        insert into job_queue (id, kind, payload, dedupe_key, run_after)
        values ($1, $2, '{}'::jsonb, $3, now())
        on conflict (dedupe_key) do update
        set status = 'queued', attempts = 0, run_after = now(), locked_at = null,
            locked_by = null, last_error = null, completed_at = null, updated_at = now()
        where job_queue.status in ('succeeded', 'failed')
        returning id
      `,
      [randomUUID(), kind, dedupeKey],
    );
    const wasQueued = (queued.rowCount ?? 0) > 0;

    await writePlatformAdminAudit({
      actorUserId: access.session.user.id,
      action: 'admin.public_source.inspect.requested',
      requestId: request.id,
      targetType: 'public_data_source',
      targetId: request.params.sourceKey,
      metadata: { role: access.role, jobKind: kind, queued: wasQueued },
    });

    return reply.code(202).send({ queued: wasQueued, message: wasQueued ? 'Inspection queued' : 'Inspection already queued or running' });
  });
}
