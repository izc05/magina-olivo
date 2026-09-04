import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession, type AuthenticatedSession } from './session.ts';
import { normalizePublicHttpsUrl } from './public-directory-trust.ts';
import { requireAdminSessionRole } from './admin-role-access.ts';
import { recordAdminAudit } from './admin-audit.ts';

type AdvertiserPortalRole = 'owner' | 'editor' | 'viewer';

type AdvertiserMembership = {
  advertiserId: string;
  role: AdvertiserPortalRole;
  businessName: string;
  municipality: string | null;
};

type ProfileChangeBody = {
  advertiserId: string;
  description?: string | null;
  phone?: string | null;
  whatsappPhone?: string | null;
  logoUrl?: string | null;
  heroImageUrl?: string | null;
};

type GrantPortalAccessBody = {
  email: string;
  role: AdvertiserPortalRole;
};

type ReviewProfileChangeBody = {
  status: 'approved' | 'rejected';
  reviewNotes?: string;
};

async function authenticatedOrReply(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthenticatedSession | null> {
  const session = await getAuthenticatedSession(request);
  if (!session) {
    reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    return null;
  }
  return session;
}

async function membershipsForUser(userId: string): Promise<AdvertiserMembership[]> {
  const result = await getPool().query<{
    advertiser_id: string;
    role: AdvertiserPortalRole;
    official_name: string;
    municipality: string | null;
  }>(`
    select m.advertiser_id, m.role, c.official_name, c.municipality
    from advertiser_portal_memberships m
    join advertiser_profiles ap on ap.id = m.advertiser_id
    join cooperatives c on c.id = ap.destination_id
    where m.user_id = $1
      and m.status = 'active'
    order by c.official_name
  `, [userId]);

  return result.rows.map((row) => ({
    advertiserId: row.advertiser_id,
    role: row.role,
    businessName: row.official_name,
    municipality: row.municipality,
  }));
}

async function requireAdvertiserMembership(
  request: FastifyRequest,
  reply: FastifyReply,
  advertiserId: string,
): Promise<{ session: AuthenticatedSession; role: AdvertiserPortalRole } | null> {
  const session = await authenticatedOrReply(request, reply);
  if (!session) return null;

  const result = await getPool().query<{ role: AdvertiserPortalRole }>(`
    select role
    from advertiser_portal_memberships
    where advertiser_id = $1
      and user_id = $2
      and status = 'active'
    limit 1
  `, [advertiserId, session.user.id]);

  const role = result.rows[0]?.role;
  if (!role) {
    reply.code(403).send(apiError(request, 'ADVERTISER_ACCESS_REQUIRED', 'Advertiser access required'));
    return null;
  }
  return { session, role };
}

function normalizeOptionalHttps(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || !value.trim()) return null;
  const normalized = normalizePublicHttpsUrl(value);
  if (!normalized) throw new Error('INVALID_PUBLIC_HTTPS_URL');
  return normalized;
}

export function registerAdvertiserPortalRoutes(app: FastifyInstance): void {
  app.get('/api/v1/advertiser/access', async (request, reply) => {
    const session = await authenticatedOrReply(request, reply);
    if (!session) return;
    const memberships = await membershipsForUser(session.user.id);
    reply.header('cache-control', 'private, no-store');
    return {
      user: { id: session.user.id, email: session.user.email, name: session.user.name },
      memberships,
    };
  });

  app.get<{ Querystring: { advertiserId: string } }>(
    '/api/v1/advertiser/dashboard',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          required: ['advertiserId'],
          properties: { advertiserId: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      const access = await requireAdvertiserMembership(request, reply, request.query.advertiserId);
      if (!access) return;

      const db = getPool();
      const [profileResult, sponsorshipResult, metricsResult, contractResult, billingResult, changeResult] = await Promise.all([
        db.query<{
          advertiser_id: string;
          official_name: string;
          municipality: string | null;
          province: string | null;
          website_url: string | null;
          category: string;
          description: string | null;
          phone: string | null;
          whatsapp_phone: string | null;
          logo_url: string | null;
          hero_image_url: string | null;
          profile_status: string;
        }>(`
          select ap.id as advertiser_id, c.official_name, c.municipality, c.province, c.website_url,
            ap.category, ap.description, ap.phone, ap.whatsapp_phone, ap.logo_url, ap.hero_image_url,
            ap.status as profile_status
          from advertiser_profiles ap
          join cooperatives c on c.id = ap.destination_id
          where ap.id = $1
          limit 1
        `, [request.query.advertiserId]),
        db.query<{
          id: string;
          plan_code: string;
          status: string;
          starts_at: Date | null;
          ends_at: Date | null;
          public_label: string;
        }>(`
          select id, plan_code, status, starts_at, ends_at, public_label
          from sponsorships
          where advertiser_id = $1
          order by case when status = 'active' then 0 else 1 end, updated_at desc
          limit 1
        `, [request.query.advertiserId]),
        db.query<{
          impressions_30d: number;
          phone_30d: number;
          whatsapp_30d: number;
          website_30d: number;
          impressions_90d: number;
          actions_90d: number;
        }>(`
          select
            count(*) filter (where event_type = 'impression' and occurred_at >= now() - interval '30 days')::int as impressions_30d,
            count(*) filter (where event_type = 'phone_click' and occurred_at >= now() - interval '30 days')::int as phone_30d,
            count(*) filter (where event_type = 'whatsapp_click' and occurred_at >= now() - interval '30 days')::int as whatsapp_30d,
            count(*) filter (where event_type = 'website_click' and occurred_at >= now() - interval '30 days')::int as website_30d,
            count(*) filter (where event_type = 'impression' and occurred_at >= now() - interval '90 days')::int as impressions_90d,
            count(*) filter (where event_type in ('phone_click', 'whatsapp_click', 'website_click', 'profile_view') and occurred_at >= now() - interval '90 days')::int as actions_90d
          from advertising_events
          where advertiser_id = $1
        `, [request.query.advertiserId]),
        db.query<{
          id: string;
          plan_code: string;
          agreed_amount_cents: number;
          currency: string;
          billing_cycle: string;
          status: string;
          starts_at: Date | null;
          ends_at: Date | null;
          renewal_at: Date | null;
        }>(`
          select id, plan_code, agreed_amount_cents, currency, billing_cycle, status, starts_at, ends_at, renewal_at
          from advertising_commercial_contracts
          where advertiser_id = $1
          order by case when status = 'active' then 0 else 1 end, updated_at desc
          limit 1
        `, [request.query.advertiserId]),
        db.query<{
          id: string;
          amount_cents: number;
          currency: string;
          status: string;
          due_at: Date | null;
          paid_at: Date | null;
          reference: string | null;
        }>(`
          select b.id, b.amount_cents, b.currency, b.status, b.due_at, b.paid_at, b.reference
          from advertising_billing_entries b
          join advertising_commercial_contracts c on c.id = b.contract_id
          where c.advertiser_id = $1
          order by b.created_at desc
          limit 12
        `, [request.query.advertiserId]),
        db.query<{
          id: string;
          status: string;
          created_at: Date;
          reviewed_at: Date | null;
          review_notes: string | null;
        }>(`
          select id, status, created_at, reviewed_at, review_notes
          from advertiser_profile_change_requests
          where advertiser_id = $1 and submitted_by_user_id = $2
          order by created_at desc
          limit 1
        `, [request.query.advertiserId, access.session.user.id]),
      ]);

      const profile = profileResult.rows[0];
      if (!profile) return reply.code(404).send(apiError(request, 'ADVERTISER_NOT_FOUND', 'Advertiser not found'));
      const metrics = metricsResult.rows[0] ?? {
        impressions_30d: 0,
        phone_30d: 0,
        whatsapp_30d: 0,
        website_30d: 0,
        impressions_90d: 0,
        actions_90d: 0,
      };
      const actions30d = metrics.phone_30d + metrics.whatsapp_30d + metrics.website_30d;

      reply.header('cache-control', 'private, no-store');
      return {
        access: { role: access.role, canRequestChanges: access.role !== 'viewer' },
        profile: {
          advertiserId: profile.advertiser_id,
          businessName: profile.official_name,
          municipality: profile.municipality,
          province: profile.province,
          websiteUrl: normalizePublicHttpsUrl(profile.website_url),
          category: profile.category,
          description: profile.description,
          phone: profile.phone,
          whatsappPhone: profile.whatsapp_phone,
          logoUrl: normalizePublicHttpsUrl(profile.logo_url),
          heroImageUrl: normalizePublicHttpsUrl(profile.hero_image_url),
          status: profile.profile_status,
        },
        campaign: sponsorshipResult.rows[0] ? {
          id: sponsorshipResult.rows[0].id,
          planCode: sponsorshipResult.rows[0].plan_code,
          status: sponsorshipResult.rows[0].status,
          startsAt: sponsorshipResult.rows[0].starts_at,
          endsAt: sponsorshipResult.rows[0].ends_at,
          publicLabel: sponsorshipResult.rows[0].public_label,
        } : null,
        metrics: {
          days30: {
            impressions: metrics.impressions_30d,
            phoneClicks: metrics.phone_30d,
            whatsappClicks: metrics.whatsapp_30d,
            websiteClicks: metrics.website_30d,
            actions: actions30d,
            actionRate: metrics.impressions_30d > 0 ? actions30d / metrics.impressions_30d : null,
          },
          days90: {
            impressions: metrics.impressions_90d,
            actions: metrics.actions_90d,
            actionRate: metrics.impressions_90d > 0 ? metrics.actions_90d / metrics.impressions_90d : null,
          },
          privacy: 'Métricas agregadas sin IP, usuario, sesión, explotación, parcela ni coordenadas precisas.',
        },
        contract: contractResult.rows[0] ? {
          id: contractResult.rows[0].id,
          planCode: contractResult.rows[0].plan_code,
          agreedAmountCents: contractResult.rows[0].agreed_amount_cents,
          currency: contractResult.rows[0].currency,
          billingCycle: contractResult.rows[0].billing_cycle,
          status: contractResult.rows[0].status,
          startsAt: contractResult.rows[0].starts_at,
          endsAt: contractResult.rows[0].ends_at,
          renewalAt: contractResult.rows[0].renewal_at,
        } : null,
        billing: billingResult.rows.map((row) => ({
          id: row.id,
          amountCents: row.amount_cents,
          currency: row.currency,
          status: row.status,
          dueAt: row.due_at,
          paidAt: row.paid_at,
          reference: row.reference,
        })),
        latestProfileChange: changeResult.rows[0] ? {
          id: changeResult.rows[0].id,
          status: changeResult.rows[0].status,
          createdAt: changeResult.rows[0].created_at,
          reviewedAt: changeResult.rows[0].reviewed_at,
          reviewNotes: changeResult.rows[0].review_notes,
        } : null,
        billingNotice: 'Este estado es control comercial interno; no constituye justificante bancario ni factura fiscal.',
      };
    },
  );

  app.post<{ Body: ProfileChangeBody }>(
    '/api/v1/advertiser/profile-change-requests',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['advertiserId'],
          properties: {
            advertiserId: { type: 'string', format: 'uuid' },
            description: { anyOf: [{ type: 'string', maxLength: 2000 }, { type: 'null' }] },
            phone: { anyOf: [{ type: 'string', maxLength: 80 }, { type: 'null' }] },
            whatsappPhone: { anyOf: [{ type: 'string', maxLength: 80 }, { type: 'null' }] },
            logoUrl: { anyOf: [{ type: 'string', maxLength: 2000 }, { type: 'null' }] },
            heroImageUrl: { anyOf: [{ type: 'string', maxLength: 2000 }, { type: 'null' }] },
          },
        },
      },
    },
    async (request, reply) => {
      const access = await requireAdvertiserMembership(request, reply, request.body.advertiserId);
      if (!access) return;
      if (access.role === 'viewer') {
        return reply.code(403).send(apiError(request, 'ADVERTISER_EDIT_REQUIRED', 'Advertiser editor access required'));
      }

      let logoUrl: string | null | undefined;
      let heroImageUrl: string | null | undefined;
      try {
        logoUrl = normalizeOptionalHttps(request.body.logoUrl);
        heroImageUrl = normalizeOptionalHttps(request.body.heroImageUrl);
      } catch {
        return reply.code(400).send(apiError(request, 'INVALID_PUBLIC_MEDIA_URL', 'Logo and hero URLs must be public HTTPS URLs'));
      }

      const pending = await getPool().query<{ id: string }>(`
        select id from advertiser_profile_change_requests
        where advertiser_id = $1 and submitted_by_user_id = $2 and status = 'pending'
        limit 1
      `, [request.body.advertiserId, access.session.user.id]);
      if (pending.rows[0]) {
        return reply.code(409).send(apiError(request, 'PROFILE_CHANGE_ALREADY_PENDING', 'A profile change request is already pending'));
      }

      const id = randomUUID();
      await getPool().query(`
        insert into advertiser_profile_change_requests (
          id, advertiser_id, submitted_by_user_id, description, phone, whatsapp_phone, logo_url, hero_image_url
        ) values ($1,$2,$3,$4,$5,$6,$7,$8)
      `, [
        id,
        request.body.advertiserId,
        access.session.user.id,
        request.body.description?.trim() || null,
        request.body.phone?.trim() || null,
        request.body.whatsappPhone?.trim() || null,
        logoUrl ?? null,
        heroImageUrl ?? null,
      ]);

      reply.code(201).header('cache-control', 'private, no-store');
      return { id, status: 'pending' };
    },
  );

  app.get<{ Querystring: { advertiserId: string } }>(
    '/api/v1/admin/commercial/advertiser-portal',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          required: ['advertiserId'],
          properties: { advertiserId: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      const session = await requireAdminSessionRole(request, reply, 'commercial');
      if (!session) return;
      const [members, changes] = await Promise.all([
        getPool().query<{
          user_id: string;
          role: AdvertiserPortalRole;
          status: string;
          email: string | null;
          name: string | null;
        }>(`
          select m.user_id, m.role, m.status,
            coalesce(to_jsonb(u)->>'email', '') as email,
            coalesce(to_jsonb(u)->>'name', '') as name
          from advertiser_portal_memberships m
          left join "user" u on coalesce(to_jsonb(u)->>'id', '') = m.user_id
          where m.advertiser_id = $1
          order by case when m.status = 'active' then 0 else 1 end, m.created_at
        `, [request.query.advertiserId]),
        getPool().query<{
          id: string;
          submitted_by_user_id: string;
          description: string | null;
          phone: string | null;
          whatsapp_phone: string | null;
          logo_url: string | null;
          hero_image_url: string | null;
          status: string;
          created_at: Date;
        }>(`
          select id, submitted_by_user_id, description, phone, whatsapp_phone, logo_url, hero_image_url, status, created_at
          from advertiser_profile_change_requests
          where advertiser_id = $1
          order by case when status = 'pending' then 0 else 1 end, created_at desc
          limit 50
        `, [request.query.advertiserId]),
      ]);
      reply.header('cache-control', 'private, no-store');
      return {
        members: members.rows.map((row) => ({
          userId: row.user_id,
          email: row.email || null,
          name: row.name || null,
          role: row.role,
          status: row.status,
        })),
        profileChanges: changes.rows.map((row) => ({
          id: row.id,
          submittedByUserId: row.submitted_by_user_id,
          description: row.description,
          phone: row.phone,
          whatsappPhone: row.whatsapp_phone,
          logoUrl: normalizePublicHttpsUrl(row.logo_url),
          heroImageUrl: normalizePublicHttpsUrl(row.hero_image_url),
          status: row.status,
          createdAt: row.created_at,
        })),
      };
    },
  );

  app.post<{ Params: { advertiserId: string }; Body: GrantPortalAccessBody }>(
    '/api/v1/admin/commercial/advertisers/:advertiserId/portal-memberships',
    {
      schema: {
        params: {
          type: 'object',
          required: ['advertiserId'],
          properties: { advertiserId: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['email', 'role'],
          properties: {
            email: { type: 'string', format: 'email', maxLength: 320 },
            role: { type: 'string', enum: ['owner', 'editor', 'viewer'] },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await requireAdminSessionRole(request, reply, 'commercial');
      if (!session) return;
      const user = await getPool().query<{ id: string; email: string }>(`
        select coalesce(to_jsonb(u)->>'id', '') as id, coalesce(to_jsonb(u)->>'email', '') as email
        from "user" u
        where lower(coalesce(to_jsonb(u)->>'email', '')) = lower($1)
        limit 1
      `, [request.body.email.trim()]);
      const target = user.rows[0];
      if (!target?.id) {
        return reply.code(404).send(apiError(request, 'PORTAL_USER_NOT_FOUND', 'The advertiser must register a Mágina Olivo account before access can be granted'));
      }
      const advertiser = await getPool().query<{ id: string }>('select id from advertiser_profiles where id = $1 limit 1', [request.params.advertiserId]);
      if (!advertiser.rows[0]) return reply.code(404).send(apiError(request, 'ADVERTISER_NOT_FOUND', 'Advertiser not found'));

      await getPool().query(`
        insert into advertiser_portal_memberships (advertiser_id, user_id, role, status, created_by_user_id)
        values ($1,$2,$3,'active',$4)
        on conflict (advertiser_id, user_id) do update set
          role = excluded.role,
          status = 'active',
          updated_at = now()
      `, [request.params.advertiserId, target.id, request.body.role, session.user.id]);
      await recordAdminAudit(getPool(), session, {
        action: 'advertiser.portal_access.grant',
        entityType: 'advertiser',
        entityId: request.params.advertiserId,
        summary: 'Advertiser portal access granted',
        metadata: { role: request.body.role },
      });
      reply.code(201).header('cache-control', 'private, no-store');
      return { userId: target.id, email: target.email, role: request.body.role, status: 'active' };
    },
  );

  app.delete<{ Params: { advertiserId: string; userId: string } }>(
    '/api/v1/admin/commercial/advertisers/:advertiserId/portal-memberships/:userId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['advertiserId', 'userId'],
          properties: {
            advertiserId: { type: 'string', format: 'uuid' },
            userId: { type: 'string', minLength: 1, maxLength: 256 },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await requireAdminSessionRole(request, reply, 'commercial');
      if (!session) return;
      const result = await getPool().query<{ user_id: string }>(`
        update advertiser_portal_memberships
        set status = 'revoked', updated_at = now()
        where advertiser_id = $1 and user_id = $2 and status = 'active'
        returning user_id
      `, [request.params.advertiserId, request.params.userId]);
      if (!result.rows[0]) return reply.code(404).send(apiError(request, 'PORTAL_MEMBERSHIP_NOT_FOUND', 'Active portal membership not found'));
      await recordAdminAudit(getPool(), session, {
        action: 'advertiser.portal_access.revoke',
        entityType: 'advertiser',
        entityId: request.params.advertiserId,
        summary: 'Advertiser portal access revoked',
      });
      reply.header('cache-control', 'private, no-store');
      return { revoked: true };
    },
  );

  app.post<{ Params: { changeId: string }; Body: ReviewProfileChangeBody }>(
    '/api/v1/admin/commercial/advertiser-profile-changes/:changeId/review',
    {
      schema: {
        params: {
          type: 'object',
          required: ['changeId'],
          properties: { changeId: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['approved', 'rejected'] },
            reviewNotes: { type: 'string', maxLength: 2000 },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await requireAdminSessionRole(request, reply, 'commercial');
      if (!session) return;
      const client = await getPool().connect();
      try {
        await client.query('begin');
        const current = await client.query<{
          advertiser_id: string;
          description: string | null;
          phone: string | null;
          whatsapp_phone: string | null;
          logo_url: string | null;
          hero_image_url: string | null;
        }>(`
          select advertiser_id, description, phone, whatsapp_phone, logo_url, hero_image_url
          from advertiser_profile_change_requests
          where id = $1 and status = 'pending'
          for update
        `, [request.params.changeId]);
        const change = current.rows[0];
        if (!change) {
          await client.query('rollback');
          return reply.code(404).send(apiError(request, 'PROFILE_CHANGE_NOT_FOUND', 'Pending profile change not found'));
        }
        if (request.body.status === 'approved') {
          await client.query(`
            update advertiser_profiles
            set description = $2, phone = $3, whatsapp_phone = $4, logo_url = $5, hero_image_url = $6, updated_at = now()
            where id = $1
          `, [change.advertiser_id, change.description, change.phone, change.whatsapp_phone, change.logo_url, change.hero_image_url]);
        }
        await client.query(`
          update advertiser_profile_change_requests
          set status = $2, reviewed_by_user_id = $3, reviewed_at = now(), review_notes = $4, updated_at = now()
          where id = $1
        `, [request.params.changeId, request.body.status, session.user.id, request.body.reviewNotes?.trim() || null]);
        await recordAdminAudit(client, session, {
          action: `advertiser.profile_change.${request.body.status}`,
          entityType: 'advertiser',
          entityId: change.advertiser_id,
          summary: `Advertiser profile change ${request.body.status}`,
        });
        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
      reply.header('cache-control', 'private, no-store');
      return { status: request.body.status };
    },
  );
}
