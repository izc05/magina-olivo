import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { requirePlatformAdmin } from './admin-access.ts';
import { recordAdminAudit } from './admin-audit.ts';

type NewsPatchBody = {
  active?: boolean;
  featured?: boolean;
  editorialNote?: string | null;
};

type AnnouncementBody = {
  title: string;
  body: string;
  severity: 'info' | 'notice' | 'warning' | 'urgent';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'expired';
  audience: 'all' | 'authenticated';
  startsAt?: string | null;
  endsAt?: string | null;
};

type AnnouncementPatchBody = Partial<AnnouncementBody>;

const announcementProperties = {
  title: { type: 'string', minLength: 1, maxLength: 180 },
  body: { type: 'string', minLength: 1, maxLength: 1600 },
  severity: { type: 'string', enum: ['info', 'notice', 'warning', 'urgent'] },
  status: { type: 'string', enum: ['draft', 'scheduled', 'active', 'paused', 'expired'] },
  audience: { type: 'string', enum: ['all', 'authenticated'] },
  startsAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
  endsAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
} as const;

function validateWindow(startsAt?: string | null, endsAt?: string | null): boolean {
  if (!startsAt || !endsAt) return true;
  return new Date(endsAt) > new Date(startsAt);
}

export function registerAdminContentRoutes(app: FastifyInstance): void {
  app.get('/api/v1/admin/content/news', async (request, reply) => {
    const session = await requirePlatformAdmin(request, reply);
    if (!session) return;

    const result = await getPool().query<{
      id: string;
      external_id: string;
      title: string;
      source_url: string;
      published_at: Date;
      topic: string | null;
      active: boolean;
      featured: boolean;
      editorial_note: string | null;
      provider: string;
    }>(`
      select n.id, n.external_id, n.title, n.source_url, n.published_at, n.topic,
        n.active, n.featured, n.editorial_note, s.provider
      from public_news_items n
      join public_data_sources s on s.source_key = n.source_key
      order by n.featured desc, n.published_at desc, n.external_id desc
      limit 150
    `);

    reply.header('cache-control', 'private, no-store');
    return {
      items: result.rows.map((row) => ({
        id: row.id,
        externalId: row.external_id,
        title: row.title,
        sourceUrl: row.source_url,
        publishedAt: row.published_at,
        topic: row.topic,
        active: row.active,
        featured: row.featured,
        editorialNote: row.editorial_note,
        provider: row.provider,
      })),
    };
  });

  app.patch<{ Params: { newsId: string }; Body: NewsPatchBody }>(
    '/api/v1/admin/content/news/:newsId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['newsId'],
          properties: { newsId: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          properties: {
            active: { type: 'boolean' },
            featured: { type: 'boolean' },
            editorialNote: { anyOf: [{ type: 'string', maxLength: 1000 }, { type: 'null' }] },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await requirePlatformAdmin(request, reply);
      if (!session) return;

      const current = await getPool().query<{ title: string }>(
        'select title from public_news_items where id = $1 limit 1',
        [request.params.newsId],
      );
      if (!current.rows[0]) {
        return reply.code(404).send(apiError(request, 'NEWS_NOT_FOUND', 'News item not found'));
      }

      const result = await getPool().query<{ id: string }>(`
        update public_news_items
        set active = coalesce($2, active),
            featured = coalesce($3, featured),
            editorial_note = case when $4::boolean then $5 else editorial_note end,
            updated_at = now()
        where id = $1
        returning id
      `, [
        request.params.newsId,
        request.body.active ?? null,
        request.body.featured ?? null,
        Object.prototype.hasOwnProperty.call(request.body, 'editorialNote'),
        request.body.editorialNote?.trim() || null,
      ]);

      await recordAdminAudit(getPool(), session, {
        action: 'news.update_visibility',
        entityType: 'public_news_item',
        entityId: request.params.newsId,
        summary: `Actualizada noticia: ${current.rows[0].title}`,
        metadata: {
          active: request.body.active ?? null,
          featured: request.body.featured ?? null,
        },
      });

      reply.header('cache-control', 'private, no-store');
      return { ok: Boolean(result.rows[0]) };
    },
  );

  app.get('/api/v1/admin/alerts/overview', async (request, reply) => {
    const session = await requirePlatformAdmin(request, reply);
    if (!session) return;

    const [summary, municipalities] = await Promise.all([
      getPool().query<{
        active_alerts: number;
        affected_users: number;
        affected_holdings: number;
        upcoming_days: number;
      }>(`
        select
          count(*)::int as active_alerts,
          count(distinct user_id)::int as affected_users,
          count(distinct holding_id)::int as affected_holdings,
          count(distinct forecast_date)::int as upcoming_days
        from weather_alert_events
        where status = 'active' and forecast_date >= current_date
      `),
      getPool().query<{
        municipality_slug: string;
        municipality_name: string;
        active_alerts: number;
        max_probability: string;
        next_forecast_date: string;
      }>(`
        select e.municipality_slug, pm.name as municipality_name,
          count(*)::int as active_alerts,
          max(e.precipitation_probability_percent)::text as max_probability,
          min(e.forecast_date)::text as next_forecast_date
        from weather_alert_events e
        join public_municipalities pm on pm.slug = e.municipality_slug
        where e.status = 'active' and e.forecast_date >= current_date
        group by e.municipality_slug, pm.name
        order by max(e.precipitation_probability_percent) desc, pm.name
        limit 30
      `),
    ]);

    reply.header('cache-control', 'private, no-store');
    return {
      summary: summary.rows[0] ?? { active_alerts: 0, affected_users: 0, affected_holdings: 0, upcoming_days: 0 },
      municipalities: municipalities.rows.map((row) => ({
        municipalitySlug: row.municipality_slug,
        municipalityName: row.municipality_name,
        activeAlerts: row.active_alerts,
        maxProbabilityPercent: Number(row.max_probability),
        nextForecastDate: row.next_forecast_date,
      })),
      policy: 'contextual-rain-probability-not-official-warning',
    };
  });

  app.get('/api/v1/admin/content/announcements', async (request, reply) => {
    const session = await requirePlatformAdmin(request, reply);
    if (!session) return;

    const result = await getPool().query<{
      id: string;
      title: string;
      body: string;
      severity: AnnouncementBody['severity'];
      status: AnnouncementBody['status'];
      audience: AnnouncementBody['audience'];
      starts_at: Date | null;
      ends_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(`
      select id, title, body, severity, status, audience, starts_at, ends_at, created_at, updated_at
      from platform_announcements
      order by case when status = 'active' then 0 when status = 'scheduled' then 1 else 2 end,
        coalesce(starts_at, created_at) desc
      limit 100
    `);

    reply.header('cache-control', 'private, no-store');
    return {
      items: result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        severity: row.severity,
        status: row.status,
        audience: row.audience,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    };
  });

  app.post<{ Body: AnnouncementBody }>(
    '/api/v1/admin/content/announcements',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'body', 'severity', 'status', 'audience'],
          properties: announcementProperties,
        },
      },
    },
    async (request, reply) => {
      const session = await requirePlatformAdmin(request, reply);
      if (!session) return;
      if (!validateWindow(request.body.startsAt, request.body.endsAt)) {
        return reply.code(400).send(apiError(request, 'INVALID_ANNOUNCEMENT_WINDOW', 'End date must be after start date'));
      }

      const id = randomUUID();
      await getPool().query(`
        insert into platform_announcements (
          id, title, body, severity, status, audience, starts_at, ends_at, created_by_user_id
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        id,
        request.body.title.trim(),
        request.body.body.trim(),
        request.body.severity,
        request.body.status,
        request.body.audience,
        request.body.startsAt ?? null,
        request.body.endsAt ?? null,
        session.user.id,
      ]);

      await recordAdminAudit(getPool(), session, {
        action: 'announcement.create',
        entityType: 'platform_announcement',
        entityId: id,
        summary: `Creado aviso: ${request.body.title.trim()}`,
        metadata: { severity: request.body.severity, status: request.body.status, audience: request.body.audience },
      });

      reply.code(201).header('cache-control', 'private, no-store');
      return { id };
    },
  );

  app.patch<{ Params: { announcementId: string }; Body: AnnouncementPatchBody }>(
    '/api/v1/admin/content/announcements/:announcementId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['announcementId'],
          properties: { announcementId: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          properties: announcementProperties,
        },
      },
    },
    async (request, reply) => {
      const session = await requirePlatformAdmin(request, reply);
      if (!session) return;

      const current = await getPool().query<{
        title: string;
        starts_at: Date | null;
        ends_at: Date | null;
      }>('select title, starts_at, ends_at from platform_announcements where id = $1 limit 1', [request.params.announcementId]);
      const row = current.rows[0];
      if (!row) return reply.code(404).send(apiError(request, 'ANNOUNCEMENT_NOT_FOUND', 'Announcement not found'));

      const nextStartsAt = Object.prototype.hasOwnProperty.call(request.body, 'startsAt')
        ? request.body.startsAt ?? null
        : row.starts_at?.toISOString() ?? null;
      const nextEndsAt = Object.prototype.hasOwnProperty.call(request.body, 'endsAt')
        ? request.body.endsAt ?? null
        : row.ends_at?.toISOString() ?? null;
      if (!validateWindow(nextStartsAt, nextEndsAt)) {
        return reply.code(400).send(apiError(request, 'INVALID_ANNOUNCEMENT_WINDOW', 'End date must be after start date'));
      }

      await getPool().query(`
        update platform_announcements
        set title = coalesce($2, title),
            body = coalesce($3, body),
            severity = coalesce($4, severity),
            status = coalesce($5, status),
            audience = coalesce($6, audience),
            starts_at = case when $7::boolean then $8 else starts_at end,
            ends_at = case when $9::boolean then $10 else ends_at end,
            updated_at = now()
        where id = $1
      `, [
        request.params.announcementId,
        request.body.title?.trim() || null,
        request.body.body?.trim() || null,
        request.body.severity ?? null,
        request.body.status ?? null,
        request.body.audience ?? null,
        Object.prototype.hasOwnProperty.call(request.body, 'startsAt'),
        request.body.startsAt ?? null,
        Object.prototype.hasOwnProperty.call(request.body, 'endsAt'),
        request.body.endsAt ?? null,
      ]);

      await recordAdminAudit(getPool(), session, {
        action: 'announcement.update',
        entityType: 'platform_announcement',
        entityId: request.params.announcementId,
        summary: `Actualizado aviso: ${request.body.title?.trim() || row.title}`,
        metadata: { status: request.body.status ?? null, severity: request.body.severity ?? null },
      });

      reply.header('cache-control', 'private, no-store');
      return { ok: true };
    },
  );
}
