import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { isConfiguredPlatformAdmin } from './platform-admin-policy.ts';
import { getAuthenticatedSession, type AuthenticatedSession } from './session.ts';

type ApplicationDecisionBody = {
  status: 'approved' | 'rejected';
  notes?: string | null;
};

type ApplicationParams = {
  applicationId: string;
};

type SponsorshipParams = {
  sponsorshipId: string;
};

type SponsorshipCreateBody = {
  advertiserId: string;
  planCode: 'featured' | 'premium';
  status: 'draft' | 'pending' | 'active';
  startsAt?: string | null;
  endsAt?: string | null;
  municipalities?: string[];
  publicLabel?: string;
  priorityOverride?: number | null;
};

type SponsorshipStatusBody = {
  status: 'active' | 'paused' | 'cancelled';
};

type MetricRow = {
  event_type: 'impression' | 'profile_view' | 'phone_click' | 'whatsapp_click' | 'website_click';
  total: string;
};

type ApplicationRow = {
  id: string;
  business_name: string;
  category: string;
  municipality: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  requested_plan_code: string | null;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  created_at: Date;
};

type AdvertiserRow = {
  id: string;
  destination_id: string;
  official_name: string;
  brand_name: string | null;
  municipality: string | null;
  category: string;
  profile_status: string;
  contact_email: string | null;
  phone: string | null;
  sponsorship_id: string | null;
  plan_code: 'featured' | 'premium' | null;
  sponsorship_status: string | null;
  starts_at: Date | null;
  ends_at: Date | null;
  public_label: string | null;
  sponsorship_municipalities: string[] | null;
};

type PlanRow = {
  code: 'free' | 'featured' | 'premium';
  name: string;
  public_label: string;
  priority: number;
  active: boolean;
};

function advertisingIsEnabled(): boolean {
  return process.env.MAGINA_ADVERTISING_ENABLED?.trim().toLowerCase() === 'true';
}

async function requirePlatformAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthenticatedSession | null> {
  const session = await getAuthenticatedSession(request);
  if (!session) {
    reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    return null;
  }

  if (!isConfiguredPlatformAdmin(session.user.email)) {
    reply.code(403).send(apiError(request, 'PLATFORM_ADMIN_REQUIRED', 'Platform administrator access required'));
    return null;
  }

  return session;
}

function normalizedMunicipalities(values: string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

export function registerAdvertisingAdminRoutes(app: FastifyInstance): void {
  app.get('/api/v1/admin/advertising/dashboard', async (request, reply) => {
    const session = await requirePlatformAdmin(request, reply);
    if (!session) return;

    const db = getPool();
    const [countsResult, metricsResult, applicationsResult, advertisersResult, plansResult] = await Promise.all([
      db.query<{
        active_advertisers: string;
        active_sponsorships: string;
        pending_applications: string;
      }>(
        `
          select
            (select count(*) from advertiser_profiles where status = 'active')::text as active_advertisers,
            (
              select count(*)
              from sponsorships
              where status = 'active'
                and (starts_at is null or starts_at <= now())
                and (ends_at is null or ends_at > now())
            )::text as active_sponsorships,
            (select count(*) from advertiser_applications where status = 'pending')::text as pending_applications
        `,
      ),
      db.query<MetricRow>(
        `
          select event_type, count(*)::text as total
          from advertising_events
          where occurred_at >= now() - interval '30 days'
          group by event_type
        `,
      ),
      db.query<ApplicationRow>(
        `
          select
            id, business_name, category, municipality, contact_name, contact_email,
            contact_phone, requested_plan_code, description, status, created_at
          from advertiser_applications
          where status = 'pending'
          order by created_at asc
          limit 50
        `,
      ),
      db.query<AdvertiserRow>(
        `
          select
            ap.id,
            ap.destination_id,
            c.official_name,
            c.brand_name,
            c.municipality,
            ap.category,
            ap.status as profile_status,
            ap.contact_email,
            ap.phone,
            s.id as sponsorship_id,
            case when s.plan_code in ('featured', 'premium') then s.plan_code else null end as plan_code,
            s.status as sponsorship_status,
            s.starts_at,
            s.ends_at,
            s.public_label,
            case when s.id is null then null else coalesce((
              select array_agg(sm.municipality order by sm.municipality)
              from sponsorship_municipalities sm
              where sm.sponsorship_id = s.id
            ), array[]::text[]) end as sponsorship_municipalities
          from advertiser_profiles ap
          join cooperatives c on c.id = ap.destination_id
          left join lateral (
            select sponsorship.*
            from sponsorships sponsorship
            where sponsorship.advertiser_id = ap.id
              and sponsorship.status in ('active', 'pending', 'paused', 'draft')
            order by
              case sponsorship.status
                when 'active' then 0
                when 'pending' then 1
                when 'paused' then 2
                else 3
              end,
              sponsorship.updated_at desc
            limit 1
          ) s on true
          order by c.official_name
          limit 100
        `,
      ),
      db.query<PlanRow>(
        `
          select code, name, public_label, priority, active
          from advertising_plans
          order by priority asc
        `,
      ),
    ]);

    const counts = countsResult.rows[0] ?? {
      active_advertisers: '0',
      active_sponsorships: '0',
      pending_applications: '0',
    };
    const metrics = Object.fromEntries(metricsResult.rows.map((row) => [row.event_type, Number(row.total)]));

    return {
      advertisingEnabled: advertisingIsEnabled(),
      admin: {
        email: session.user.email,
      },
      counts: {
        activeAdvertisers: Number(counts.active_advertisers),
        activeSponsorships: Number(counts.active_sponsorships),
        pendingApplications: Number(counts.pending_applications),
      },
      metrics30d: {
        impressions: metrics.impression ?? 0,
        profileViews: metrics.profile_view ?? 0,
        phoneClicks: metrics.phone_click ?? 0,
        whatsappClicks: metrics.whatsapp_click ?? 0,
        websiteClicks: metrics.website_click ?? 0,
      },
      applications: applicationsResult.rows.map((row) => ({
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
      advertisers: advertisersResult.rows.map((row) => ({
        id: row.id,
        destinationId: row.destination_id,
        officialName: row.official_name,
        brandName: row.brand_name,
        municipality: row.municipality,
        category: row.category,
        profileStatus: row.profile_status,
        contactEmail: row.contact_email,
        phone: row.phone,
        sponsorship: row.sponsorship_id ? {
          id: row.sponsorship_id,
          planCode: row.plan_code,
          status: row.sponsorship_status,
          startsAt: row.starts_at,
          endsAt: row.ends_at,
          label: row.public_label,
          municipalities: row.sponsorship_municipalities ?? [],
        } : null,
      })),
      plans: plansResult.rows.map((row) => ({
        code: row.code,
        name: row.name,
        publicLabel: row.public_label,
        priority: row.priority,
        active: row.active,
      })),
    };
  });

  app.patch<{ Params: ApplicationParams; Body: ApplicationDecisionBody }>(
    '/api/v1/admin/advertising/applications/:applicationId',
    {
      schema: {
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['applicationId'],
          properties: {
            applicationId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['approved', 'rejected'] },
            notes: {
              anyOf: [
                { type: 'string', maxLength: 1000 },
                { type: 'null' },
              ],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await requirePlatformAdmin(request, reply);
      if (!session) return;

      const result = await getPool().query<{
        id: string;
        business_name: string;
        status: 'approved' | 'rejected';
        reviewed_at: Date;
      }>(
        `
          update advertiser_applications
          set
            status = $2,
            review_notes = nullif(trim($3), ''),
            reviewed_by_user_id = $4,
            reviewed_at = now(),
            updated_at = now()
          where id = $1
            and status = 'pending'
          returning id, business_name, status, reviewed_at
        `,
        [
          request.params.applicationId,
          request.body.status,
          request.body.notes ?? '',
          session.user.id,
        ],
      );

      const row = result.rows[0];
      if (!row) {
        return reply.code(409).send(apiError(
          request,
          'APPLICATION_NOT_PENDING',
          'Application does not exist or has already been reviewed',
        ));
      }

      return {
        application: {
          id: row.id,
          businessName: row.business_name,
          status: row.status,
          reviewedAt: row.reviewed_at,
        },
      };
    },
  );

  app.post<{ Body: SponsorshipCreateBody }>(
    '/api/v1/admin/advertising/sponsorships',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['advertiserId', 'planCode', 'status'],
          properties: {
            advertiserId: { type: 'string', format: 'uuid' },
            planCode: { type: 'string', enum: ['featured', 'premium'] },
            status: { type: 'string', enum: ['draft', 'pending', 'active'] },
            startsAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
            endsAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
            municipalities: {
              type: 'array',
              maxItems: 30,
              uniqueItems: true,
              items: { type: 'string', minLength: 1, maxLength: 120 },
            },
            publicLabel: { type: 'string', minLength: 1, maxLength: 40 },
            priorityOverride: { anyOf: [{ type: 'integer', minimum: 0, maximum: 10000 }, { type: 'null' }] },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await requirePlatformAdmin(request, reply);
      if (!session) return;

      const db = getPool();
      const municipalities = normalizedMunicipalities(request.body.municipalities);
      const startsAt = request.body.startsAt ?? null;
      const endsAt = request.body.endsAt ?? null;
      if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
        return reply.code(400).send(apiError(request, 'INVALID_SPONSORSHIP_WINDOW', 'End date must be after start date'));
      }

      const client = await db.connect();
      try {
        await client.query('begin');
        const advertiser = await client.query<{ id: string }>(
          `select id from advertiser_profiles where id = $1 and status = 'active' limit 1`,
          [request.body.advertiserId],
        );
        if (!advertiser.rows[0]) {
          await client.query('rollback');
          return reply.code(400).send(apiError(request, 'ADVERTISER_NOT_ACTIVE', 'Advertiser must be active before creating a sponsorship'));
        }

        const existing = await client.query<{ id: string }>(
          `
            select id
            from sponsorships
            where advertiser_id = $1
              and status in ('draft', 'pending', 'active')
            limit 1
          `,
          [request.body.advertiserId],
        );
        if (existing.rows[0]) {
          await client.query('rollback');
          return reply.code(409).send(apiError(request, 'SPONSORSHIP_ALREADY_OPEN', 'Pause or cancel the existing sponsorship before creating another'));
        }

        const plan = await client.query<{ code: string }>(
          `select code from advertising_plans where code = $1 and active = true limit 1`,
          [request.body.planCode],
        );
        if (!plan.rows[0]) {
          await client.query('rollback');
          return reply.code(400).send(apiError(request, 'ADVERTISING_PLAN_UNAVAILABLE', 'Advertising plan is not available'));
        }

        const sponsorshipId = randomUUID();
        await client.query(
          `
            insert into sponsorships (
              id, advertiser_id, plan_code, status, starts_at, ends_at,
              priority_override, public_label, internal_notes
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `,
          [
            sponsorshipId,
            request.body.advertiserId,
            request.body.planCode,
            request.body.status,
            startsAt,
            endsAt,
            request.body.priorityOverride ?? null,
            request.body.publicLabel?.trim() || 'Patrocinado',
            `Creado desde panel admin por ${session.user.id}`,
          ],
        );

        for (const municipality of municipalities) {
          await client.query(
            `insert into sponsorship_municipalities (sponsorship_id, municipality) values ($1, $2)`,
            [sponsorshipId, municipality],
          );
        }

        await client.query('commit');
        return reply.code(201).send({
          sponsorship: {
            id: sponsorshipId,
            advertiserId: request.body.advertiserId,
            planCode: request.body.planCode,
            status: request.body.status,
            startsAt,
            endsAt,
            municipalities,
          },
        });
      } catch (error) {
        try {
          await client.query('rollback');
        } catch {
          // Preserve the original failure.
        }
        throw error;
      } finally {
        client.release();
      }
    },
  );

  app.patch<{ Params: SponsorshipParams; Body: SponsorshipStatusBody }>(
    '/api/v1/admin/advertising/sponsorships/:sponsorshipId/status',
    {
      schema: {
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['sponsorshipId'],
          properties: {
            sponsorshipId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['active', 'paused', 'cancelled'] },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await requirePlatformAdmin(request, reply);
      if (!session) return;

      const result = await getPool().query<{
        id: string;
        advertiser_id: string;
        status: string;
        updated_at: Date;
      }>(
        `
          update sponsorships
          set status = $2, updated_at = now(), internal_notes = concat_ws(E'\n', internal_notes, $3)
          where id = $1
            and status <> 'expired'
          returning id, advertiser_id, status, updated_at
        `,
        [
          request.params.sponsorshipId,
          request.body.status,
          `Estado cambiado a ${request.body.status} desde panel admin por ${session.user.id}`,
        ],
      );

      const row = result.rows[0];
      if (!row) {
        return reply.code(404).send(apiError(request, 'SPONSORSHIP_NOT_FOUND', 'Sponsorship does not exist or is expired'));
      }

      return {
        sponsorship: {
          id: row.id,
          advertiserId: row.advertiser_id,
          status: row.status,
          updatedAt: row.updated_at,
        },
      };
    },
  );
}
