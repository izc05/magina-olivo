import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';
import { requireAdminRole } from './admin-role-access.ts';

type PortalRole = 'owner' | 'editor' | 'viewer';
type RangeDays = 30 | 90 | 365;

function parseRangeDays(value: unknown): RangeDays {
  const parsed = Number(value ?? 90);
  return parsed === 30 || parsed === 365 ? parsed : 90;
}

async function requireAdvertiserAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  advertiserId: string,
): Promise<{ userId: string; role: PortalRole } | null> {
  const session = await getAuthenticatedSession(request);
  if (!session) {
    reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    return null;
  }
  const result = await getPool().query<{ role: PortalRole }>(`
    select role
    from advertiser_portal_memberships
    where advertiser_id = $1 and user_id = $2 and status = 'active'
    limit 1
  `, [advertiserId, session.user.id]);
  const role = result.rows[0]?.role;
  if (!role) {
    reply.code(403).send(apiError(request, 'ADVERTISER_ACCESS_REQUIRED', 'Advertiser access required'));
    return null;
  }
  return { userId: session.user.id, role };
}

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function registerAdvertiserAnalyticsRoutes(app: FastifyInstance): void {
  app.get<{ Querystring: { advertiserId: string; days?: string } }>(
    '/api/v1/advertiser/analytics',
    {
      schema: {
        querystring: {
          type: 'object', additionalProperties: false, required: ['advertiserId'],
          properties: {
            advertiserId: { type: 'string', format: 'uuid' },
            days: { type: 'string', enum: ['30', '90', '365'] },
          },
        },
      },
    },
    async (request, reply) => {
      const access = await requireAdvertiserAccess(request, reply, request.query.advertiserId);
      if (!access) return;
      const days = parseRangeDays(request.query.days);
      const db = getPool();

      const [profile, summary, daily, weekly, monthly, actions, municipalities, placements, campaigns] = await Promise.all([
        db.query<{ official_name: string; municipality: string | null; province: string | null }>(`
          select c.official_name, c.municipality, c.province
          from advertiser_profiles ap join cooperatives c on c.id = ap.destination_id
          where ap.id = $1 limit 1
        `, [request.query.advertiserId]),
        db.query<{ impressions: number; actions: number; active_days: number }>(`
          select
            count(*) filter (where event_type = 'impression')::int as impressions,
            count(*) filter (where event_type in ('profile_view','phone_click','whatsapp_click','website_click'))::int as actions,
            count(distinct occurred_at::date)::int as active_days
          from advertising_events
          where advertiser_id = $1 and occurred_at >= now() - ($2 * interval '1 day')
        `, [request.query.advertiserId, days]),
        db.query<{ bucket: string; impressions: number; actions: number }>(`
          select occurred_at::date::text as bucket,
            count(*) filter (where event_type='impression')::int as impressions,
            count(*) filter (where event_type in ('profile_view','phone_click','whatsapp_click','website_click'))::int as actions
          from advertising_events
          where advertiser_id=$1 and occurred_at >= now() - ($2 * interval '1 day')
          group by occurred_at::date order by occurred_at::date
        `, [request.query.advertiserId, days]),
        db.query<{ bucket: string; impressions: number; actions: number }>(`
          select to_char(date_trunc('week', occurred_at), 'YYYY-MM-DD') as bucket,
            count(*) filter (where event_type='impression')::int as impressions,
            count(*) filter (where event_type in ('profile_view','phone_click','whatsapp_click','website_click'))::int as actions
          from advertising_events
          where advertiser_id=$1 and occurred_at >= now() - interval '12 weeks'
          group by date_trunc('week', occurred_at) order by date_trunc('week', occurred_at)
        `, [request.query.advertiserId]),
        db.query<{ bucket: string; impressions: number; actions: number }>(`
          select to_char(date_trunc('month', occurred_at), 'YYYY-MM') as bucket,
            count(*) filter (where event_type='impression')::int as impressions,
            count(*) filter (where event_type in ('profile_view','phone_click','whatsapp_click','website_click'))::int as actions
          from advertising_events
          where advertiser_id=$1 and occurred_at >= now() - interval '12 months'
          group by date_trunc('month', occurred_at) order by date_trunc('month', occurred_at)
        `, [request.query.advertiserId]),
        db.query<{ event_type: string; total: number }>(`
          select event_type, count(*)::int as total
          from advertising_events
          where advertiser_id=$1 and occurred_at >= now() - ($2 * interval '1 day')
          group by event_type order by total desc, event_type
        `, [request.query.advertiserId, days]),
        db.query<{ municipality: string; impressions: number; actions: number }>(`
          select coalesce(nullif(trim(municipality), ''), 'Sin municipio') as municipality,
            count(*) filter (where event_type='impression')::int as impressions,
            count(*) filter (where event_type in ('profile_view','phone_click','whatsapp_click','website_click'))::int as actions
          from advertising_events
          where advertiser_id=$1 and occurred_at >= now() - ($2 * interval '1 day')
          group by 1 order by impressions desc, actions desc limit 12
        `, [request.query.advertiserId, days]),
        db.query<{ placement: string; impressions: number; actions: number }>(`
          select coalesce(nullif(trim(placement), ''), 'directorio') as placement,
            count(*) filter (where event_type='impression')::int as impressions,
            count(*) filter (where event_type in ('profile_view','phone_click','whatsapp_click','website_click'))::int as actions
          from advertising_events
          where advertiser_id=$1 and occurred_at >= now() - ($2 * interval '1 day')
          group by 1 order by impressions desc, actions desc limit 12
        `, [request.query.advertiserId, days]),
        db.query<{ sponsorship_id: string; plan_code: string; status: string; starts_at: Date | null; ends_at: Date | null; impressions: number; actions: number }>(`
          select s.id as sponsorship_id, s.plan_code, s.status, s.starts_at, s.ends_at,
            count(e.id) filter (where e.event_type='impression')::int as impressions,
            count(e.id) filter (where e.event_type in ('profile_view','phone_click','whatsapp_click','website_click'))::int as actions
          from sponsorships s
          left join advertising_events e on e.sponsorship_id=s.id and e.occurred_at >= now() - ($2 * interval '1 day')
          where s.advertiser_id=$1
          group by s.id, s.plan_code, s.status, s.starts_at, s.ends_at
          order by coalesce(s.starts_at, s.created_at) desc limit 12
        `, [request.query.advertiserId, days]),
      ]);

      const business = profile.rows[0];
      if (!business) return reply.code(404).send(apiError(request, 'ADVERTISER_NOT_FOUND', 'Advertiser not found'));
      const totals = summary.rows[0] ?? { impressions: 0, actions: 0, active_days: 0 };

      reply.header('cache-control', 'private, no-store');
      return {
        advertiser: { id: request.query.advertiserId, businessName: business.official_name, municipality: business.municipality, province: business.province },
        rangeDays: days,
        summary: {
          impressions: totals.impressions,
          actions: totals.actions,
          actionRate: totals.impressions > 0 ? totals.actions / totals.impressions : null,
          activeDays: totals.active_days,
        },
        series: { daily: daily.rows, weekly: weekly.rows, monthly: monthly.rows },
        breakdown: { actions: actions.rows, municipalities: municipalities.rows, placements: placements.rows },
        campaigns: campaigns.rows.map((row) => ({
          id: row.sponsorship_id, planCode: row.plan_code, status: row.status, startsAt: row.starts_at, endsAt: row.ends_at,
          impressions: row.impressions, actions: row.actions,
          actionRate: row.impressions > 0 ? row.actions / row.impressions : null,
        })),
        privacy: 'Estadísticas agregadas del propio anunciante; no incluyen IP, identidad del visitante, sesión, explotación, parcela ni coordenadas precisas.',
      };
    },
  );

  app.get<{ Querystring: { advertiserId: string; days?: string } }>(
    '/api/v1/advertiser/analytics/export.csv',
    {
      schema: {
        querystring: {
          type: 'object', additionalProperties: false, required: ['advertiserId'],
          properties: { advertiserId: { type: 'string', format: 'uuid' }, days: { type: 'string', enum: ['30','90','365'] } },
        },
      },
    },
    async (request, reply) => {
      const access = await requireAdvertiserAccess(request, reply, request.query.advertiserId);
      if (!access) return;
      const days = parseRangeDays(request.query.days);
      const rows = await getPool().query<{ day: string; event_type: string; total: number }>(`
        select occurred_at::date::text as day, event_type, count(*)::int as total
        from advertising_events
        where advertiser_id=$1 and occurred_at >= now() - ($2 * interval '1 day')
        group by occurred_at::date, event_type order by occurred_at::date, event_type
      `, [request.query.advertiserId, days]);
      const header = ['fecha','tipo_evento','total'];
      const csv = [header.join(','), ...rows.rows.map((row) => [row.day, row.event_type, row.total].map(csvCell).join(','))].join('\n');
      reply.header('cache-control', 'private, no-store');
      reply.header('content-disposition', `attachment; filename="magina-olivo-publicidad-${days}d.csv"`);
      reply.type('text/csv; charset=utf-8');
      return `\uFEFF${csv}\n`;
    },
  );

  app.get<{ Querystring: { days?: string } }>(
    '/api/v1/admin/advertising/analytics/benchmark',
    {
      schema: { querystring: { type: 'object', additionalProperties: false, properties: { days: { type: 'string', enum: ['30','90','365'] } } } },
    },
    async (request, reply) => {
      const access = await requireAdminRole(request, reply, 'commercial');
      if (!access) return;
      const days = parseRangeDays(request.query.days);
      const result = await getPool().query<{
        plan_code: string; advertisers: number; impressions: number; actions: number;
      }>(`
        select s.plan_code,
          count(distinct s.advertiser_id)::int as advertisers,
          count(e.id) filter (where e.event_type='impression')::int as impressions,
          count(e.id) filter (where e.event_type in ('profile_view','phone_click','whatsapp_click','website_click'))::int as actions
        from sponsorships s
        left join advertising_events e on e.sponsorship_id=s.id and e.occurred_at >= now() - ($1 * interval '1 day')
        where s.plan_code in ('featured','premium') and s.status in ('active','paused','expired')
        group by s.plan_code order by s.plan_code
      `, [days]);
      reply.header('cache-control', 'private, no-store');
      return {
        rangeDays: days,
        minimumCohortSize: 3,
        plans: ['featured','premium'].map((planCode) => {
          const row = result.rows.find((item) => item.plan_code === planCode);
          const advertisers = row?.advertisers ?? 0;
          if (!row || advertisers < 3) return { planCode, advertisers, suppressed: true };
          return {
            planCode, advertisers, suppressed: false,
            impressions: row.impressions, actions: row.actions,
            actionRate: row.impressions > 0 ? row.actions / row.impressions : null,
            impressionsPerAdvertiser: row.impressions / advertisers,
            actionsPerAdvertiser: row.actions / advertisers,
          };
        }),
        privacy: 'Benchmark agregado por plan; se suprime cuando hay menos de tres anunciantes en la cohorte y nunca muestra resultados individuales.',
      };
    },
  );
}
