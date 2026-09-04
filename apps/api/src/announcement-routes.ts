import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';
import { getAuthenticatedSession } from './session.ts';

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  severity: 'info' | 'notice' | 'warning' | 'urgent';
  audience: 'all' | 'authenticated';
  starts_at: Date | null;
  ends_at: Date | null;
};

function mapAnnouncement(row: AnnouncementRow) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    severity: row.severity,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    source: 'Mágina Olivo',
    officialWarning: false,
  };
}

export function registerAnnouncementRoutes(app: FastifyInstance): void {
  app.get('/api/v1/public/announcements', async (_request, reply) => {
    const result = await getPool().query<AnnouncementRow>(`
      select id, title, body, severity, audience, starts_at, ends_at
      from platform_announcements
      where status = 'active'
        and audience = 'all'
        and municipality_slug is null
        and (starts_at is null or starts_at <= now())
        and (ends_at is null or ends_at > now())
      order by case severity when 'urgent' then 0 when 'warning' then 1 when 'notice' then 2 else 3 end,
        coalesce(starts_at, created_at) desc
      limit 5
    `);

    reply.header('cache-control', 'public, max-age=60, stale-while-revalidate=120');
    return {
      items: result.rows.map(mapAnnouncement),
      policy: 'first-party-platform-notices-not-official-emergency-alerts',
    };
  });

  app.get('/api/v1/account/announcements', async (request, reply) => {
    const session = await getAuthenticatedSession(request);
    if (!session) return reply.code(401).send({ code: 'AUTH_REQUIRED', message: 'Authentication required' });

    const result = await getPool().query<AnnouncementRow>(`
      select id, title, body, severity, audience, starts_at, ends_at
      from platform_announcements
      where status = 'active'
        and audience in ('all', 'authenticated')
        and municipality_slug is null
        and (starts_at is null or starts_at <= now())
        and (ends_at is null or ends_at > now())
      order by case severity when 'urgent' then 0 when 'warning' then 1 when 'notice' then 2 else 3 end,
        coalesce(starts_at, created_at) desc
      limit 8
    `);

    reply.header('cache-control', 'private, no-store');
    return {
      items: result.rows.map(mapAnnouncement),
      policy: 'first-party-platform-notices-not-official-emergency-alerts',
    };
  });
}
