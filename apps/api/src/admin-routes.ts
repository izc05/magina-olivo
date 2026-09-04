import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { requirePlatformAdmin } from './admin-access.ts';

type AdvertisingCategory =
  | 'cooperative'
  | 'oil_mill'
  | 'machinery'
  | 'workshop'
  | 'harvest'
  | 'nursery'
  | 'irrigation'
  | 'pruning'
  | 'phytosanitary'
  | 'insurance'
  | 'advisory'
  | 'other';

type AdvertisingPlanCode = 'free' | 'featured' | 'premium';
type SponsorshipStatus = 'draft' | 'pending' | 'active' | 'paused' | 'expired' | 'cancelled';

type CreateAdvertisingCampaignBody = {
  destinationId: string;
  category: AdvertisingCategory;
  description?: string;
  phone?: string;
  whatsappPhone?: string;
  contactEmail?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  planCode: AdvertisingPlanCode;
  status: SponsorshipStatus;
  startsAt?: string;
  endsAt?: string;
  publicLabel?: string;
  priorityOverride?: number;
  internalNotes?: string;
};

type UpdateSponsorshipBody = {
  status: SponsorshipStatus;
};

type ReviewApplicationBody = {
  status: 'approved' | 'rejected';
  reviewNotes?: string;
};

function advertisingEnabled(): boolean {
  return process.env.MAGINA_ADVERTISING_ENABLED?.trim().toLowerCase() === 'true';
}

export function registerAdminRoutes(app: FastifyInstance): void {
  app.get('/api/v1/admin/dashboard', async (request, reply) => {
    const session = await requirePlatformAdmin(request, reply);
    if (!session) return;

    const db = getPool();
    const [users, holdings, farms, plots, campaigns, destinations, advertisers, sponsorships, applications, events] = await Promise.all([
      db.query<{ count: number }>("select count(distinct user_id)::int as count from holding_members where status = 'active'"),
      db.query<{ count: number }>('select count(*)::int as count from holdings where active = true'),
      db.query<{ count: number }>('select count(*)::int as count from farms where active = true'),
      db.query<{ count: number }>('select count(*)::int as count from plots where active = true'),
      db.query<{ count: number }>("select count(*)::int as count from campaigns where status in ('planned', 'active')"),
      db.query<{ count: number }>("select count(*)::int as count from cooperatives where verification_status <> 'stale'"),
      db.query<{ count: number }>("select count(*)::int as count from advertiser_profiles where status = 'active'"),
      db.query<{ count: number }>(`
        select count(*)::int as count
        from sponsorships
        where status = 'active'
          and (starts_at is null or starts_at <= now())
          and (ends_at is null or ends_at > now())
      `),
      db.query<{ count: number }>("select count(*)::int as count from advertiser_applications where status = 'pending'"),
      db.query<{ count: number }>("select count(*)::int as count from advertising_events where occurred_at >= now() - interval '30 days'"),
    ]);

    reply.header('cache-control', 'private, no-store');
    return {
      administrator: {
        email: session.user.email,
      },
      advertisingEnabled: advertisingEnabled(),
      agriculture: {
        usersWithHolding: users.rows[0]?.count ?? 0,
        activeHoldings: holdings.rows[0]?.count ?? 0,
        activeFarms: farms.rows[0]?.count ?? 0,
        activePlots: plots.rows[0]?.count ?? 0,
        openCampaigns: campaigns.rows[0]?.count ?? 0,
      },
      publicContent: {
        directoryEntries: destinations.rows[0]?.count ?? 0,
      },
      advertising: {
        activeAdvertisers: advertisers.rows[0]?.count ?? 0,
        activeSponsorships: sponsorships.rows[0]?.count ?? 0,
        pendingApplications: applications.rows[0]?.count ?? 0,
        eventsLast30Days: events.rows[0]?.count ?? 0,
      },
      system: {
        api: 'operational',
        database: 'operational',
      },
    };
  });

  app.get('/api/v1/admin/advertising/options', async (request, reply) => {
    const session = await requirePlatformAdmin(request, reply);
    if (!session) return;

    const [destinations, plans] = await Promise.all([
      getPool().query<{ id: string; official_name: string; municipality: string | null; province: string | null }>(`
        select id, official_name, municipality, province
        from cooperatives
        where verification_status <> 'stale'
        order by municipality nulls last, official_name
      `),
      getPool().query<{ code: AdvertisingPlanCode; name: string; public_label: string; priority: number }>(`
        select code, name, public_label, priority
        from advertising_plans
        where active = true
        order by priority asc
      `),
    ]);

    reply.header('cache-control', 'private, no-store');
    return {
      destinations: destinations.rows.map((row) => ({
        id: row.id,
        name: row.official_name,
        municipality: row.municipality,
        province: row.province,
      })),
      plans: plans.rows.map((row) => ({
        code: row.code,
        name: row.name,
        publicLabel: row.public_label,
        priority: row.priority,
      })),
    };
  });

  app.get('/api/v1/admin/advertising/campaigns', async (request, reply) => {
    const session = await requirePlatformAdmin(request, reply);
    if (!session) return;

    const result = await getPool().query<{
      advertiser_id: string;
      destination_id: string;
      business_name: string;
      municipality: string | null;
      category: AdvertisingCategory;
      description: string | null;
      profile_status: string;
      sponsorship_id: string | null;
      plan_code: AdvertisingPlanCode | null;
      sponsorship_status: SponsorshipStatus | null;
      starts_at: Date | null;
      ends_at: Date | null;
      public_label: string | null;
      priority_override: number | null;
      events_30d: number;
      impressions_30d: number;
      clicks_30d: number;
    }>(`
      select
        ap.id as advertiser_id,
        ap.destination_id,
        c.official_name as business_name,
        c.municipality,
        ap.category,
        ap.description,
        ap.status as profile_status,
        s.id as sponsorship_id,
        s.plan_code,
        s.status as sponsorship_status,
        s.starts_at,
        s.ends_at,
        s.public_label,
        s.priority_override,
        coalesce(metrics.events_30d, 0)::int as events_30d,
        coalesce(metrics.impressions_30d, 0)::int as impressions_30d,
        coalesce(metrics.clicks_30d, 0)::int as clicks_30d
      from advertiser_profiles ap
      join cooperatives c on c.id = ap.destination_id
      left join lateral (
        select sponsorship.*
        from sponsorships sponsorship
        where sponsorship.advertiser_id = ap.id
        order by sponsorship.updated_at desc
        limit 1
      ) s on true
      left join lateral (
        select
          count(*) as events_30d,
          count(*) filter (where event_type = 'impression') as impressions_30d,
          count(*) filter (where event_type in ('profile_view', 'phone_click', 'whatsapp_click', 'website_click')) as clicks_30d
        from advertising_events event
        where event.advertiser_id = ap.id
          and event.occurred_at >= now() - interval '30 days'
      ) metrics on true
      order by
        case when s.status = 'active' then 0 else 1 end,
        c.municipality nulls last,
        c.official_name
    `);

    reply.header('cache-control', 'private, no-store');
    return {
      items: result.rows.map((row) => ({
        advertiserId: row.advertiser_id,
        destinationId: row.destination_id,
        businessName: row.business_name,
        municipality: row.municipality,
        category: row.category,
        description: row.description,
        profileStatus: row.profile_status,
        sponsorshipId: row.sponsorship_id,
        planCode: row.plan_code ?? 'free',
        sponsorshipStatus: row.sponsorship_status,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        publicLabel: row.public_label,
        priorityOverride: row.priority_override,
        metrics30Days: {
          events: row.events_30d,
          impressions: row.impressions_30d,
          clicks: row.clicks_30d,
        },
      })),
    };
  });

  app.post<{ Body: CreateAdvertisingCampaignBody }>(
    '/api/v1/admin/advertising/campaigns',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['destinationId', 'category', 'planCode', 'status'],
          properties: {
            destinationId: { type: 'string', format: 'uuid' },
            category: {
              type: 'string',
              enum: ['cooperative', 'oil_mill', 'machinery', 'workshop', 'harvest', 'nursery', 'irrigation', 'pruning', 'phytosanitary', 'insurance', 'advisory', 'other'],
            },
            description: { type: 'string', maxLength: 2000 },
            phone: { type: 'string', maxLength: 80 },
            whatsappPhone: { type: 'string', maxLength: 80 },
            contactEmail: { type: 'string', format: 'email', maxLength: 320 },
            logoUrl: { type: 'string', maxLength: 2000 },
            heroImageUrl: { type: 'string', maxLength: 2000 },
            planCode: { type: 'string', enum: ['free', 'featured', 'premium'] },
            status: { type: 'string', enum: ['draft', 'pending', 'active', 'paused', 'expired', 'cancelled'] },
            startsAt: { type: 'string', format: 'date-time' },
            endsAt: { type: 'string', format: 'date-time' },
            publicLabel: { type: 'string', minLength: 1, maxLength: 80 },
            priorityOverride: { type: 'integer', minimum: 0, maximum: 100000 },
            internalNotes: { type: 'string', maxLength: 4000 },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await requirePlatformAdmin(request, reply);
      if (!session) return;

      const body = request.body;
      if (body.startsAt && body.endsAt && new Date(body.endsAt) <= new Date(body.startsAt)) {
        return reply.code(400).send(apiError(request, 'INVALID_SPONSORSHIP_WINDOW', 'End date must be after start date'));
      }

      const db = getPool();
      const client = await db.connect();
      try {
        await client.query('begin');
        const destination = await client.query<{ id: string }>(
          "select id from cooperatives where id = $1 and verification_status <> 'stale' limit 1",
          [body.destinationId],
        );
        if (!destination.rows[0]) {
          await client.query('rollback');
          return reply.code(400).send(apiError(request, 'INVALID_ADVERTISING_DESTINATION', 'Directory destination does not exist or is stale'));
        }

        const profile = await client.query<{ id: string }>(`
          insert into advertiser_profiles (
            id, destination_id, category, description, phone, whatsapp_phone,
            logo_url, hero_image_url, contact_email, status
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
          on conflict (destination_id) do update set
            category = excluded.category,
            description = excluded.description,
            phone = excluded.phone,
            whatsapp_phone = excluded.whatsapp_phone,
            logo_url = excluded.logo_url,
            hero_image_url = excluded.hero_image_url,
            contact_email = excluded.contact_email,
            status = 'active',
            updated_at = now()
          returning id
        `, [
          randomUUID(),
          body.destinationId,
          body.category,
          body.description?.trim() || null,
          body.phone?.trim() || null,
          body.whatsappPhone?.trim() || null,
          body.logoUrl?.trim() || null,
          body.heroImageUrl?.trim() || null,
          body.contactEmail?.trim().toLowerCase() || null,
        ]);

        const advertiserId = profile.rows[0]?.id;
        if (!advertiserId) throw new Error('Advertiser profile upsert returned no id');

        if (body.status === 'active') {
          await client.query(
            "update sponsorships set status = 'paused', updated_at = now() where advertiser_id = $1 and status = 'active'",
            [advertiserId],
          );
        }

        const sponsorshipId = randomUUID();
        await client.query(`
          insert into sponsorships (
            id, advertiser_id, plan_code, status, starts_at, ends_at,
            priority_override, public_label, internal_notes
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          sponsorshipId,
          advertiserId,
          body.planCode,
          body.status,
          body.startsAt ?? null,
          body.endsAt ?? null,
          body.priorityOverride ?? null,
          body.publicLabel?.trim() || 'Patrocinado',
          body.internalNotes?.trim() || null,
        ]);

        await client.query('commit');
        reply.code(201).header('cache-control', 'private, no-store');
        return { advertiserId, sponsorshipId };
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },
  );

  app.patch<{ Params: { sponsorshipId: string }; Body: UpdateSponsorshipBody }>(
    '/api/v1/admin/advertising/sponsorships/:sponsorshipId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['sponsorshipId'],
          properties: { sponsorshipId: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['draft', 'pending', 'active', 'paused', 'expired', 'cancelled'] },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await requirePlatformAdmin(request, reply);
      if (!session) return;

      const client = await getPool().connect();
      try {
        await client.query('begin');
        const current = await client.query<{ advertiser_id: string }>(
          'select advertiser_id from sponsorships where id = $1 for update',
          [request.params.sponsorshipId],
        );
        const advertiserId = current.rows[0]?.advertiser_id;
        if (!advertiserId) {
          await client.query('rollback');
          return reply.code(404).send(apiError(request, 'SPONSORSHIP_NOT_FOUND', 'Sponsorship not found'));
        }

        if (request.body.status === 'active') {
          await client.query(
            "update sponsorships set status = 'paused', updated_at = now() where advertiser_id = $1 and id <> $2 and status = 'active'",
            [advertiserId, request.params.sponsorshipId],
          );
        }

        await client.query(
          'update sponsorships set status = $2, updated_at = now() where id = $1',
          [request.params.sponsorshipId, request.body.status],
        );
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

  app.get('/api/v1/admin/advertising/applications', async (request, reply) => {
    const session = await requirePlatformAdmin(request, reply);
    if (!session) return;

    const result = await getPool().query<{
      id: string;
      business_name: string;
      category: string;
      municipality: string | null;
      contact_name: string;
      contact_email: string;
      contact_phone: string | null;
      requested_plan_code: AdvertisingPlanCode | null;
      description: string | null;
      status: string;
      created_at: Date;
    }>(`
      select id, business_name, category, municipality, contact_name, contact_email,
        contact_phone, requested_plan_code, description, status, created_at
      from advertiser_applications
      order by case when status = 'pending' then 0 else 1 end, created_at desc
      limit 100
    `);

    reply.header('cache-control', 'private, no-store');
    return {
      items: result.rows.map((row) => ({
        id: row.id,
        businessName: row.business_name,
        category: row.category,
        municipality: row.municipality,
        contactName: row.contact_name,
        contactEmail: row.contact_email,
        contactPhone: row.contact_phone,
        requestedPlanCode: row.requested_plan_code,
        description: row.description,
        status: row.status,
        createdAt: row.created_at,
      })),
    };
  });

  app.patch<{ Params: { applicationId: string }; Body: ReviewApplicationBody }>(
    '/api/v1/admin/advertising/applications/:applicationId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['applicationId'],
          properties: { applicationId: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['approved', 'rejected'] },
            reviewNotes: { type: 'string', maxLength: 4000 },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await requirePlatformAdmin(request, reply);
      if (!session) return;

      const result = await getPool().query<{ id: string }>(`
        update advertiser_applications
        set status = $2,
            reviewed_by_user_id = $3,
            reviewed_at = now(),
            review_notes = $4,
            updated_at = now()
        where id = $1 and status = 'pending'
        returning id
      `, [
        request.params.applicationId,
        request.body.status,
        session.user.id,
        request.body.reviewNotes?.trim() || null,
      ]);

      if (!result.rows[0]) {
        return reply.code(404).send(apiError(request, 'APPLICATION_NOT_PENDING', 'Advertising application is not pending or does not exist'));
      }

      reply.header('cache-control', 'private, no-store');
      return { ok: true };
    },
  );
}
