import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { normalizePublicHttpsUrl } from './public-directory-trust.ts';
import { requireAdminRole } from './admin-role-access.ts';
import { recordAdminAudit } from './admin-audit.ts';

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

type PlanCode = 'free' | 'featured' | 'premium';
type BillingCycle = 'one_off' | 'monthly' | 'quarterly' | 'yearly';
type AdvertisingEventType = 'impression' | 'profile_view' | 'phone_click' | 'whatsapp_click' | 'website_click';

type ApplicationBody = {
  destinationId?: string | null;
  businessName: string;
  category: AdvertisingCategory;
  municipality?: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  requestedPlanCode?: PlanCode | null;
  description?: string | null;
  websiteUrl?: string | null;
  consentAccepted: boolean;
};

type EventBody = {
  advertiserId: string;
  sponsorshipId: string;
  eventType: AdvertisingEventType;
  municipality?: string | null;
  placement?: string | null;
  clientEventId: string;
};

type ConvertBody = {
  planCode?: PlanCode;
  createContract?: boolean;
  agreedAmountCents?: number;
  billingCycle?: BillingCycle;
  startsAt?: string | null;
  endsAt?: string | null;
  renewalAt?: string | null;
  notes?: string | null;
};

const categories: Array<{ code: AdvertisingCategory; label: string }> = [
  { code: 'cooperative', label: 'Cooperativa' },
  { code: 'oil_mill', label: 'Almazara' },
  { code: 'machinery', label: 'Maquinaria' },
  { code: 'workshop', label: 'Taller' },
  { code: 'harvest', label: 'Recolección' },
  { code: 'nursery', label: 'Vivero' },
  { code: 'irrigation', label: 'Riego' },
  { code: 'pruning', label: 'Poda' },
  { code: 'phytosanitary', label: 'Fitosanitarios' },
  { code: 'insurance', label: 'Seguros' },
  { code: 'advisory', label: 'Asesoría' },
  { code: 'other', label: 'Otro servicio agrícola' },
];

function advertisingEnabled(): boolean {
  return process.env.MAGINA_ADVERTISING_ENABLED?.trim().toLowerCase() === 'true';
}

function publicReference(): string {
  return `ADV-${randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
}

function entityTypeFor(category: AdvertisingCategory): 'cooperative' | 'company' | 'other' {
  if (category === 'cooperative') return 'cooperative';
  if (category === 'other') return 'other';
  return 'company';
}

function trimNullable(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function stageFor(row: {
  status: string;
  converted_at: Date | null;
  sponsorship_status: string | null;
  contract_status: string | null;
  pending_billing: number;
  paid_billing: number;
}): string {
  if (row.status === 'rejected') return 'rejected';
  if (!row.converted_at) return row.status === 'approved' ? 'approved' : 'application';
  if (row.paid_billing > 0) return 'paid';
  if (row.pending_billing > 0) return 'payment_pending';
  if (row.contract_status === 'active' || row.contract_status === 'draft') return 'contract';
  if (row.sponsorship_status === 'active') return 'campaign_active';
  return 'converted';
}

export function registerAdvertisingFunnelRoutes(app: FastifyInstance): void {
  app.get('/api/v1/public/advertising/options', async (_request, reply) => {
    const plans = await getPool().query<{
      code: PlanCode;
      name: string;
      public_label: string;
      priority: number;
      amount_cents: number | null;
      billing_cycle: BillingCycle | null;
    }>(`
      select p.code, p.name, p.public_label, p.priority, pricing.amount_cents, pricing.billing_cycle
      from advertising_plans p
      left join advertising_plan_pricing pricing on pricing.plan_code = p.code
      where p.active = true
      order by p.priority asc
    `);

    reply.header('cache-control', 'public, max-age=300');
    return {
      advertisingEnabled: advertisingEnabled(),
      acceptingApplications: true,
      plans: plans.rows.map((row) => ({
        code: row.code,
        name: row.name,
        publicLabel: row.public_label,
        priority: row.priority,
        amountCents: row.amount_cents,
        billingCycle: row.billing_cycle,
      })),
      categories,
      transparency: 'Paid visibility never changes objective market, weather, alert, news or private agricultural data.',
    };
  });

  app.post<{ Body: ApplicationBody }>(
    '/api/v1/public/advertising/applications',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['businessName', 'category', 'contactName', 'contactEmail', 'consentAccepted'],
          properties: {
            destinationId: { anyOf: [{ type: 'string', format: 'uuid' }, { type: 'null' }] },
            businessName: { type: 'string', minLength: 2, maxLength: 240 },
            category: { type: 'string', enum: categories.map((item) => item.code) },
            municipality: { anyOf: [{ type: 'string', maxLength: 120 }, { type: 'null' }] },
            contactName: { type: 'string', minLength: 2, maxLength: 160 },
            contactEmail: { type: 'string', format: 'email', maxLength: 320 },
            contactPhone: { anyOf: [{ type: 'string', maxLength: 80 }, { type: 'null' }] },
            requestedPlanCode: { anyOf: [{ type: 'string', enum: ['free', 'featured', 'premium'] }, { type: 'null' }] },
            description: { anyOf: [{ type: 'string', maxLength: 2000 }, { type: 'null' }] },
            websiteUrl: { anyOf: [{ type: 'string', maxLength: 2000 }, { type: 'null' }] },
            consentAccepted: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.body.consentAccepted) {
        return reply.code(400).send(apiError(request, 'ADVERTISING_CONSENT_REQUIRED', 'Consent is required to submit the advertising request'));
      }

      const email = request.body.contactEmail.trim().toLowerCase();
      const businessName = request.body.businessName.trim();
      const websiteUrl = trimNullable(request.body.websiteUrl);
      const normalizedWebsite = websiteUrl ? normalizePublicHttpsUrl(websiteUrl) : null;
      if (websiteUrl && !normalizedWebsite) {
        return reply.code(400).send(apiError(request, 'INVALID_PUBLIC_WEBSITE_URL', 'Business website must be a public HTTPS URL without embedded credentials'));
      }

      if (request.body.destinationId) {
        const destination = await getPool().query<{ id: string }>(
          "select id from cooperatives where id = $1 and verification_status <> 'stale' limit 1",
          [request.body.destinationId],
        );
        if (!destination.rows[0]) {
          return reply.code(400).send(apiError(request, 'INVALID_ADVERTISING_DESTINATION', 'Selected directory destination is not available'));
        }
      }

      const duplicate = await getPool().query<{ id: string; public_reference: string | null }>(`
        select id, public_reference
        from advertiser_applications
        where lower(contact_email) = $1
          and lower(business_name) = lower($2)
          and status = 'pending'
          and created_at >= now() - interval '24 hours'
        order by created_at desc
        limit 1
      `, [email, businessName]);
      if (duplicate.rows[0]?.public_reference) {
        reply.header('cache-control', 'no-store');
        return { reference: duplicate.rows[0].public_reference, status: 'pending', duplicate: true };
      }

      const id = randomUUID();
      const reference = publicReference();
      await getPool().query(`
        insert into advertiser_applications (
          id, destination_id, business_name, category, municipality,
          contact_name, contact_email, contact_phone, requested_plan_code,
          description, website_url, public_reference, privacy_consent_at, status
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), 'pending')
      `, [
        id,
        request.body.destinationId ?? null,
        businessName,
        request.body.category,
        trimNullable(request.body.municipality),
        request.body.contactName.trim(),
        email,
        trimNullable(request.body.contactPhone),
        request.body.requestedPlanCode ?? null,
        trimNullable(request.body.description),
        normalizedWebsite,
        reference,
      ]);

      reply.code(201).header('cache-control', 'no-store');
      return {
        reference,
        status: 'pending',
        duplicate: false,
        guidance: 'Conserva esta referencia. La solicitud no publica ni activa ninguna campaña automáticamente.',
      };
    },
  );

  app.post<{ Body: EventBody }>(
    '/api/v1/public/advertising/events',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['advertiserId', 'sponsorshipId', 'eventType', 'clientEventId'],
          properties: {
            advertiserId: { type: 'string', format: 'uuid' },
            sponsorshipId: { type: 'string', format: 'uuid' },
            eventType: { type: 'string', enum: ['impression', 'profile_view', 'phone_click', 'whatsapp_click', 'website_click'] },
            municipality: { anyOf: [{ type: 'string', maxLength: 120 }, { type: 'null' }] },
            placement: { anyOf: [{ type: 'string', maxLength: 120 }, { type: 'null' }] },
            clientEventId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!advertisingEnabled()) {
        reply.header('cache-control', 'no-store');
        return { accepted: false, reason: 'advertising-disabled' };
      }

      const valid = await getPool().query<{ advertiser_id: string }>(`
        select s.advertiser_id
        from sponsorships s
        join advertiser_profiles ap on ap.id = s.advertiser_id and ap.status = 'active'
        where s.id = $1
          and s.advertiser_id = $2
          and s.status = 'active'
          and s.plan_code in ('featured', 'premium')
          and (s.starts_at is null or s.starts_at <= now())
          and (s.ends_at is null or s.ends_at > now())
        limit 1
      `, [request.body.sponsorshipId, request.body.advertiserId]);

      if (!valid.rows[0]) {
        reply.header('cache-control', 'no-store');
        return { accepted: false, reason: 'inactive-or-invalid-sponsorship' };
      }

      const inserted = await getPool().query<{ id: string }>(`
        insert into advertising_events (
          id, advertiser_id, sponsorship_id, event_type, municipality, placement, client_event_id
        ) values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (client_event_id) where client_event_id is not null do nothing
        returning id
      `, [
        randomUUID(),
        request.body.advertiserId,
        request.body.sponsorshipId,
        request.body.eventType,
        trimNullable(request.body.municipality),
        trimNullable(request.body.placement),
        request.body.clientEventId,
      ]);

      reply.code(202).header('cache-control', 'no-store');
      return { accepted: Boolean(inserted.rows[0]), duplicate: !inserted.rows[0] };
    },
  );

  app.get('/api/v1/admin/advertising/funnel', async (request, reply) => {
    const access = await requireAdminRole(request, reply, 'commercial');
    if (!access) return;

    const result = await getPool().query<{
      id: string;
      public_reference: string | null;
      business_name: string;
      category: AdvertisingCategory;
      municipality: string | null;
      contact_name: string;
      contact_email: string;
      contact_phone: string | null;
      requested_plan_code: PlanCode | null;
      description: string | null;
      website_url: string | null;
      status: string;
      created_at: Date;
      converted_at: Date | null;
      converted_destination_id: string | null;
      converted_advertiser_id: string | null;
      converted_sponsorship_id: string | null;
      converted_contract_id: string | null;
      sponsorship_status: string | null;
      contract_status: string | null;
      pending_billing: number;
      paid_billing: number;
      impressions_30d: number;
      clicks_30d: number;
    }>(`
      select
        a.id, a.public_reference, a.business_name, a.category, a.municipality,
        a.contact_name, a.contact_email, a.contact_phone, a.requested_plan_code,
        a.description, a.website_url, a.status, a.created_at, a.converted_at,
        a.converted_destination_id, a.converted_advertiser_id,
        a.converted_sponsorship_id, a.converted_contract_id,
        s.status as sponsorship_status,
        c.status as contract_status,
        coalesce(b.pending_billing, 0)::int as pending_billing,
        coalesce(b.paid_billing, 0)::int as paid_billing,
        coalesce(m.impressions_30d, 0)::int as impressions_30d,
        coalesce(m.clicks_30d, 0)::int as clicks_30d
      from advertiser_applications a
      left join sponsorships s on s.id = a.converted_sponsorship_id
      left join advertising_commercial_contracts c on c.id = a.converted_contract_id
      left join lateral (
        select
          count(*) filter (where status in ('pending', 'issued', 'overdue')) as pending_billing,
          count(*) filter (where status = 'paid') as paid_billing
        from advertising_billing_entries entry
        where entry.contract_id = a.converted_contract_id
      ) b on true
      left join lateral (
        select
          count(*) filter (where event_type = 'impression') as impressions_30d,
          count(*) filter (where event_type in ('profile_view', 'phone_click', 'whatsapp_click', 'website_click')) as clicks_30d
        from advertising_events event
        where event.advertiser_id = a.converted_advertiser_id
          and event.occurred_at >= now() - interval '30 days'
      ) m on true
      order by case when a.status = 'pending' then 0 else 1 end, a.created_at desc
      limit 200
    `);

    reply.header('cache-control', 'private, no-store');
    return {
      items: result.rows.map((row) => ({
        id: row.id,
        reference: row.public_reference,
        businessName: row.business_name,
        category: row.category,
        municipality: row.municipality,
        contactName: row.contact_name,
        contactEmail: row.contact_email,
        contactPhone: row.contact_phone,
        requestedPlanCode: row.requested_plan_code,
        description: row.description,
        websiteUrl: row.website_url,
        status: row.status,
        stage: stageFor(row),
        createdAt: row.created_at,
        convertedAt: row.converted_at,
        conversion: {
          destinationId: row.converted_destination_id,
          advertiserId: row.converted_advertiser_id,
          sponsorshipId: row.converted_sponsorship_id,
          contractId: row.converted_contract_id,
          sponsorshipStatus: row.sponsorship_status,
          contractStatus: row.contract_status,
        },
        metrics30Days: { impressions: row.impressions_30d, clicks: row.clicks_30d },
        billing: { pendingEntries: row.pending_billing, paidEntries: row.paid_billing },
      })),
      policy: {
        publicActivationRequiresSeparateAction: true,
        newDirectoryEntriesStartHiddenAsStale: true,
        paymentExecution: false,
      },
    };
  });

  app.post<{ Params: { applicationId: string }; Body: ConvertBody }>(
    '/api/v1/admin/advertising/applications/:applicationId/convert',
    {
      schema: {
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['applicationId'],
          properties: { applicationId: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            planCode: { type: 'string', enum: ['free', 'featured', 'premium'] },
            createContract: { type: 'boolean' },
            agreedAmountCents: { type: 'integer', minimum: 0 },
            billingCycle: { type: 'string', enum: ['one_off', 'monthly', 'quarterly', 'yearly'] },
            startsAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
            endsAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
            renewalAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
            notes: { anyOf: [{ type: 'string', maxLength: 2000 }, { type: 'null' }] },
          },
        },
      },
    },
    async (request, reply) => {
      const access = await requireAdminRole(request, reply, 'commercial');
      if (!access) return;
      const body = request.body;
      if (body.startsAt && body.endsAt && new Date(body.endsAt) <= new Date(body.startsAt)) {
        return reply.code(400).send(apiError(request, 'INVALID_SPONSORSHIP_WINDOW', 'End date must be after start date'));
      }
      if (body.createContract && (body.agreedAmountCents === undefined || !body.billingCycle)) {
        return reply.code(400).send(apiError(request, 'INCOMPLETE_COMMERCIAL_CONTRACT', 'Amount and billing cycle are required when creating a contract'));
      }

      const client = await getPool().connect();
      try {
        await client.query('begin');
        const applicationResult = await client.query<{
          id: string;
          destination_id: string | null;
          business_name: string;
          category: AdvertisingCategory;
          municipality: string | null;
          contact_email: string;
          requested_plan_code: PlanCode | null;
          description: string | null;
          website_url: string | null;
          status: string;
          converted_at: Date | null;
        }>(`
          select id, destination_id, business_name, category, municipality, contact_email,
            requested_plan_code, description, website_url, status, converted_at
          from advertiser_applications
          where id = $1
          for update
        `, [request.params.applicationId]);
        const application = applicationResult.rows[0];
        if (!application) {
          await client.query('rollback');
          return reply.code(404).send(apiError(request, 'ADVERTISING_APPLICATION_NOT_FOUND', 'Advertising application not found'));
        }
        if (application.status === 'rejected' || application.status === 'withdrawn') {
          await client.query('rollback');
          return reply.code(409).send(apiError(request, 'ADVERTISING_APPLICATION_NOT_CONVERTIBLE', 'Rejected or withdrawn applications cannot be converted'));
        }
        if (application.converted_at) {
          await client.query('rollback');
          return reply.code(409).send(apiError(request, 'ADVERTISING_APPLICATION_ALREADY_CONVERTED', 'Advertising application has already been converted'));
        }

        let destinationId = application.destination_id;
        if (!destinationId) {
          destinationId = randomUUID();
          await client.query(`
            insert into cooperatives (
              id, official_name, municipality, website_url, verification_status, entity_type
            ) values ($1, $2, $3, $4, 'stale', $5)
          `, [
            destinationId,
            application.business_name.trim(),
            trimNullable(application.municipality),
            normalizePublicHttpsUrl(application.website_url),
            entityTypeFor(application.category),
          ]);
        }

        const advertiserId = randomUUID();
        const profile = await client.query<{ id: string }>(`
          insert into advertiser_profiles (
            id, destination_id, category, description, contact_email, status
          ) values ($1, $2, $3, $4, $5, 'active')
          on conflict (destination_id) do update set
            category = excluded.category,
            description = excluded.description,
            contact_email = excluded.contact_email,
            status = 'active',
            updated_at = now()
          returning id
        `, [
          advertiserId,
          destinationId,
          application.category,
          trimNullable(application.description),
          application.contact_email.trim().toLowerCase(),
        ]);
        const resolvedAdvertiserId = profile.rows[0]?.id;
        if (!resolvedAdvertiserId) throw new Error('Advertiser profile conversion returned no id');

        const planCode = body.planCode ?? application.requested_plan_code ?? 'free';
        const sponsorshipId = randomUUID();
        await client.query(`
          insert into sponsorships (
            id, advertiser_id, plan_code, status, starts_at, ends_at, public_label, internal_notes
          ) values ($1, $2, $3, 'draft', $4, $5, 'Patrocinado', $6)
        `, [
          sponsorshipId,
          resolvedAdvertiserId,
          planCode,
          body.startsAt ?? null,
          body.endsAt ?? null,
          trimNullable(body.notes),
        ]);

        let contractId: string | null = null;
        if (body.createContract) {
          contractId = randomUUID();
          await client.query(`
            insert into advertising_commercial_contracts (
              id, advertiser_id, sponsorship_id, plan_code, agreed_amount_cents,
              currency, billing_cycle, status, starts_at, ends_at, renewal_at,
              notes, created_by_user_id
            ) values ($1, $2, $3, $4, $5, 'EUR', $6, 'draft', $7, $8, $9, $10, $11)
          `, [
            contractId,
            resolvedAdvertiserId,
            sponsorshipId,
            planCode,
            body.agreedAmountCents,
            body.billingCycle,
            body.startsAt ?? null,
            body.endsAt ?? null,
            body.renewalAt ?? null,
            trimNullable(body.notes),
            access.session.user.id,
          ]);
        }

        await client.query(`
          update advertiser_applications
          set status = 'approved',
              reviewed_by_user_id = $2,
              reviewed_at = now(),
              converted_destination_id = $3,
              converted_advertiser_id = $4,
              converted_sponsorship_id = $5,
              converted_contract_id = $6,
              converted_at = now(),
              updated_at = now()
          where id = $1
        `, [
          request.params.applicationId,
          access.session.user.id,
          destinationId,
          resolvedAdvertiserId,
          sponsorshipId,
          contractId,
        ]);

        await recordAdminAudit(client, access.session, {
          action: 'advertising.application_convert',
          entityType: 'advertiser_application',
          entityId: request.params.applicationId,
          summary: `Solicitud publicitaria convertida en campaña borrador: ${application.business_name}`,
          metadata: { planCode, contractCreated: Boolean(contractId), directoryEntryWasCreated: !application.destination_id },
        });

        await client.query('commit');
        reply.code(201).header('cache-control', 'private, no-store');
        return {
          destinationId,
          advertiserId: resolvedAdvertiserId,
          sponsorshipId,
          contractId,
          sponsorshipStatus: 'draft',
          publicActivation: false,
        };
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },
  );
}
