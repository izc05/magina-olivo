import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { recordAdminAudit } from './admin-audit.ts';
import { requireAdminRole, requireSuperadmin, type PlatformAdminRole } from './admin-role-access.ts';
import { isPlatformAdminEmail } from './admin-access-policy.ts';

type PlanCode = 'free' | 'featured' | 'premium';
type BillingCycle = 'one_off' | 'monthly' | 'quarterly' | 'yearly';
type ContractStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
type BillingStatus = 'pending' | 'issued' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
type PaymentMethod = 'manual' | 'bank_transfer' | 'bizum' | 'card' | 'other';

type PricingBody = {
  amountCents?: number | null;
  billingCycle: BillingCycle;
  notes?: string | null;
};

type ContractBody = {
  advertiserId: string;
  sponsorshipId?: string | null;
  planCode: PlanCode;
  agreedAmountCents: number;
  billingCycle: BillingCycle;
  status: ContractStatus;
  startsAt?: string | null;
  endsAt?: string | null;
  renewalAt?: string | null;
  externalReference?: string | null;
  notes?: string | null;
};

type ContractPatchBody = Partial<Omit<ContractBody, 'advertiserId'>>;

type BillingBody = {
  contractId: string;
  amountCents: number;
  status: BillingStatus;
  dueAt?: string | null;
  paidAt?: string | null;
  paymentMethod?: PaymentMethod | null;
  reference?: string | null;
  notes?: string | null;
};

type BillingPatchBody = Partial<Omit<BillingBody, 'contractId'>>;

type RolesBody = {
  roles: PlatformAdminRole[];
};

const nullableDateTime = { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] } as const;
const nullableText = (maxLength: number) => ({ anyOf: [{ type: 'string', maxLength }, { type: 'null' }] }) as const;

function trimNullable(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function validateWindow(startsAt?: string | null, endsAt?: string | null): boolean {
  if (!startsAt || !endsAt) return true;
  return new Date(endsAt) > new Date(startsAt);
}

function paidAtFor(status: BillingStatus, paidAt?: string | null): string | null {
  if (status !== 'paid') return paidAt ?? null;
  return paidAt ?? new Date().toISOString();
}

export function registerAdminFinanceRoutes(app: FastifyInstance): void {
  app.get('/api/v1/admin/finance/overview', async (request, reply) => {
    const access = await requireAdminRole(request, reply, 'commercial');
    if (!access) return;

    const db = getPool();
    const [pricing, advertisers, contracts, billing, summary] = await Promise.all([
      db.query<{
        plan_code: PlanCode; plan_name: string; public_label: string; amount_cents: number | null;
        billing_cycle: BillingCycle; notes: string | null; updated_at: Date;
      }>(`
        select p.code as plan_code, p.name as plan_name, p.public_label,
          pp.amount_cents, pp.billing_cycle, pp.notes, pp.updated_at
        from advertising_plans p
        join advertising_plan_pricing pp on pp.plan_code = p.code
        where p.active = true
        order by p.priority asc
      `),
      db.query<{
        advertiser_id: string; business_name: string; municipality: string | null;
        sponsorship_id: string | null; plan_code: PlanCode;
      }>(`
        select ap.id as advertiser_id, c.official_name as business_name, c.municipality,
          s.id as sponsorship_id, coalesce(s.plan_code, 'free')::text as plan_code
        from advertiser_profiles ap
        join cooperatives c on c.id = ap.destination_id
        left join lateral (
          select id, plan_code
          from sponsorships
          where advertiser_id = ap.id
          order by updated_at desc
          limit 1
        ) s on true
        where ap.status <> 'rejected'
        order by c.official_name
      `),
      db.query<{
        id: string; advertiser_id: string; business_name: string; municipality: string | null;
        sponsorship_id: string | null; plan_code: PlanCode; agreed_amount_cents: number;
        currency: string; billing_cycle: BillingCycle; status: ContractStatus;
        starts_at: Date | null; ends_at: Date | null; renewal_at: Date | null;
        external_reference: string | null; notes: string | null; updated_at: Date;
      }>(`
        select contract.id, contract.advertiser_id, c.official_name as business_name, c.municipality,
          contract.sponsorship_id, contract.plan_code, contract.agreed_amount_cents,
          contract.currency, contract.billing_cycle, contract.status, contract.starts_at,
          contract.ends_at, contract.renewal_at, contract.external_reference, contract.notes,
          contract.updated_at
        from advertising_commercial_contracts contract
        join advertiser_profiles ap on ap.id = contract.advertiser_id
        join cooperatives c on c.id = ap.destination_id
        order by
          case when contract.status = 'active' then 0 when contract.status = 'draft' then 1 else 2 end,
          contract.renewal_at nulls last,
          contract.updated_at desc
        limit 250
      `),
      db.query<{
        id: string; contract_id: string; business_name: string; amount_cents: number; currency: string;
        status: BillingStatus; due_at: Date | null; paid_at: Date | null;
        payment_method: PaymentMethod | null; reference: string | null; notes: string | null;
        created_at: Date;
      }>(`
        select entry.id, entry.contract_id, c.official_name as business_name,
          entry.amount_cents, entry.currency, entry.status, entry.due_at, entry.paid_at,
          entry.payment_method, entry.reference, entry.notes, entry.created_at
        from advertising_billing_entries entry
        join advertising_commercial_contracts contract on contract.id = entry.contract_id
        join advertiser_profiles ap on ap.id = contract.advertiser_id
        join cooperatives c on c.id = ap.destination_id
        order by
          case entry.status when 'overdue' then 0 when 'issued' then 1 when 'pending' then 2 else 3 end,
          entry.due_at nulls last,
          entry.created_at desc
        limit 300
      `),
      db.query<{
        active_contracts: number; recurring_monthly_equivalent_cents: number;
        collected_month_cents: number; collected_year_cents: number;
        outstanding_cents: number; overdue_entries: number; renewals_30d: number;
      }>(`
        select
          (select count(*)::int from advertising_commercial_contracts where status = 'active') as active_contracts,
          coalesce((
            select sum(case billing_cycle
              when 'monthly' then agreed_amount_cents
              when 'quarterly' then round(agreed_amount_cents / 3.0)
              when 'yearly' then round(agreed_amount_cents / 12.0)
              else 0 end)::int
            from advertising_commercial_contracts
            where status = 'active'
          ), 0)::int as recurring_monthly_equivalent_cents,
          coalesce((
            select sum(amount_cents)::int from advertising_billing_entries
            where status = 'paid' and paid_at >= date_trunc('month', now())
          ), 0)::int as collected_month_cents,
          coalesce((
            select sum(amount_cents)::int from advertising_billing_entries
            where status = 'paid' and paid_at >= date_trunc('year', now())
          ), 0)::int as collected_year_cents,
          coalesce((
            select sum(amount_cents)::int from advertising_billing_entries
            where status in ('pending', 'issued', 'overdue')
          ), 0)::int as outstanding_cents,
          (select count(*)::int from advertising_billing_entries where status = 'overdue') as overdue_entries,
          (select count(*)::int from advertising_commercial_contracts
            where status = 'active' and renewal_at >= now() and renewal_at < now() + interval '30 days') as renewals_30d
      `),
    ]);

    const totals = summary.rows[0];
    reply.header('cache-control', 'private, no-store');
    return {
      administrator: {
        email: access.session.user.email,
        roles: access.roles,
        bootstrapSuperadmin: access.bootstrapSuperadmin,
      },
      summary: {
        activeContracts: totals?.active_contracts ?? 0,
        recurringMonthlyEquivalentCents: totals?.recurring_monthly_equivalent_cents ?? 0,
        collectedMonthCents: totals?.collected_month_cents ?? 0,
        collectedYearCents: totals?.collected_year_cents ?? 0,
        outstandingCents: totals?.outstanding_cents ?? 0,
        overdueEntries: totals?.overdue_entries ?? 0,
        renewals30Days: totals?.renewals_30d ?? 0,
      },
      pricing: pricing.rows.map((row) => ({
        planCode: row.plan_code,
        planName: row.plan_name,
        publicLabel: row.public_label,
        amountCents: row.amount_cents,
        billingCycle: row.billing_cycle,
        notes: row.notes,
        updatedAt: row.updated_at,
      })),
      advertisers: advertisers.rows.map((row) => ({
        advertiserId: row.advertiser_id,
        businessName: row.business_name,
        municipality: row.municipality,
        sponsorshipId: row.sponsorship_id,
        planCode: row.plan_code,
      })),
      contracts: contracts.rows.map((row) => ({
        id: row.id,
        advertiserId: row.advertiser_id,
        businessName: row.business_name,
        municipality: row.municipality,
        sponsorshipId: row.sponsorship_id,
        planCode: row.plan_code,
        agreedAmountCents: row.agreed_amount_cents,
        currency: row.currency.trim(),
        billingCycle: row.billing_cycle,
        status: row.status,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        renewalAt: row.renewal_at,
        externalReference: row.external_reference,
        notes: row.notes,
        updatedAt: row.updated_at,
      })),
      billing: billing.rows.map((row) => ({
        id: row.id,
        contractId: row.contract_id,
        businessName: row.business_name,
        amountCents: row.amount_cents,
        currency: row.currency.trim(),
        status: row.status,
        dueAt: row.due_at,
        paidAt: row.paid_at,
        paymentMethod: row.payment_method,
        reference: row.reference,
        notes: row.notes,
        createdAt: row.created_at,
      })),
    };
  });

  app.patch<{ Params: { planCode: PlanCode }; Body: PricingBody }>(
    '/api/v1/admin/finance/pricing/:planCode',
    {
      schema: {
        params: {
          type: 'object', additionalProperties: false, required: ['planCode'],
          properties: { planCode: { type: 'string', enum: ['free', 'featured', 'premium'] } },
        },
        body: {
          type: 'object', additionalProperties: false, required: ['billingCycle'],
          properties: {
            amountCents: { anyOf: [{ type: 'integer', minimum: 0 }, { type: 'null' }] },
            billingCycle: { type: 'string', enum: ['one_off', 'monthly', 'quarterly', 'yearly'] },
            notes: nullableText(1000),
          },
        },
      },
    },
    async (request, reply) => {
      const access = await requireAdminRole(request, reply, 'commercial');
      if (!access) return;
      const client = await getPool().connect();
      try {
        await client.query('begin');
        await client.query(`
          update advertising_plan_pricing
          set amount_cents = $2, billing_cycle = $3, notes = $4,
              updated_by_user_id = $5, updated_at = now()
          where plan_code = $1
        `, [request.params.planCode, request.body.amountCents ?? null, request.body.billingCycle,
          trimNullable(request.body.notes), access.session.user.id]);
        await recordAdminAudit(client, access.session, {
          action: 'advertising.pricing.update', entityType: 'advertising_plan', entityId: request.params.planCode,
          summary: `Condiciones comerciales actualizadas: ${request.params.planCode}`,
          metadata: { amountCents: request.body.amountCents ?? null, billingCycle: request.body.billingCycle },
        });
        await client.query('commit');
        return { ok: true };
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally { client.release(); }
    },
  );

  app.post<{ Body: ContractBody }>(
    '/api/v1/admin/finance/contracts',
    {
      schema: {
        body: {
          type: 'object', additionalProperties: false,
          required: ['advertiserId', 'planCode', 'agreedAmountCents', 'billingCycle', 'status'],
          properties: {
            advertiserId: { type: 'string', format: 'uuid' },
            sponsorshipId: { anyOf: [{ type: 'string', format: 'uuid' }, { type: 'null' }] },
            planCode: { type: 'string', enum: ['free', 'featured', 'premium'] },
            agreedAmountCents: { type: 'integer', minimum: 0 },
            billingCycle: { type: 'string', enum: ['one_off', 'monthly', 'quarterly', 'yearly'] },
            status: { type: 'string', enum: ['draft', 'active', 'paused', 'completed', 'cancelled'] },
            startsAt: nullableDateTime, endsAt: nullableDateTime, renewalAt: nullableDateTime,
            externalReference: nullableText(240), notes: nullableText(2000),
          },
        },
      },
    },
    async (request, reply) => {
      const access = await requireAdminRole(request, reply, 'commercial');
      if (!access) return;
      if (!validateWindow(request.body.startsAt, request.body.endsAt)) {
        return reply.code(400).send(apiError(request, 'INVALID_CONTRACT_WINDOW', 'Contract end must be after start'));
      }

      if (request.body.sponsorshipId) {
        const linked = await getPool().query<{ id: string }>(`
          select id from sponsorships where id = $1 and advertiser_id = $2 limit 1
        `, [request.body.sponsorshipId, request.body.advertiserId]);
        if (!linked.rows[0]) {
          return reply.code(400).send(apiError(request, 'SPONSORSHIP_ADVERTISER_MISMATCH', 'Sponsorship does not belong to advertiser'));
        }
      }

      const id = randomUUID();
      const client = await getPool().connect();
      try {
        await client.query('begin');
        const advertiser = await client.query<{ id: string }>('select id from advertiser_profiles where id = $1 limit 1', [request.body.advertiserId]);
        if (!advertiser.rows[0]) {
          await client.query('rollback');
          return reply.code(404).send(apiError(request, 'ADVERTISER_NOT_FOUND', 'Advertiser not found'));
        }
        await client.query(`
          insert into advertising_commercial_contracts (
            id, advertiser_id, sponsorship_id, plan_code, agreed_amount_cents, currency,
            billing_cycle, status, starts_at, ends_at, renewal_at, external_reference,
            notes, created_by_user_id
          ) values ($1, $2, $3, $4, $5, 'EUR', $6, $7, $8, $9, $10, $11, $12, $13)
        `, [id, request.body.advertiserId, request.body.sponsorshipId ?? null, request.body.planCode,
          request.body.agreedAmountCents, request.body.billingCycle, request.body.status,
          request.body.startsAt ?? null, request.body.endsAt ?? null, request.body.renewalAt ?? null,
          trimNullable(request.body.externalReference), trimNullable(request.body.notes), access.session.user.id]);
        await recordAdminAudit(client, access.session, {
          action: 'advertising.contract.create', entityType: 'advertising_contract', entityId: id,
          summary: 'Contrato comercial publicitario creado',
          metadata: { planCode: request.body.planCode, amountCents: request.body.agreedAmountCents, billingCycle: request.body.billingCycle },
        });
        await client.query('commit');
        reply.code(201);
        return { id };
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally { client.release(); }
    },
  );

  app.patch<{ Params: { contractId: string }; Body: ContractPatchBody }>(
    '/api/v1/admin/finance/contracts/:contractId',
    {
      schema: {
        params: { type: 'object', additionalProperties: false, required: ['contractId'], properties: { contractId: { type: 'string', format: 'uuid' } } },
        body: {
          type: 'object', additionalProperties: false,
          properties: {
            sponsorshipId: { anyOf: [{ type: 'string', format: 'uuid' }, { type: 'null' }] },
            planCode: { type: 'string', enum: ['free', 'featured', 'premium'] },
            agreedAmountCents: { type: 'integer', minimum: 0 },
            billingCycle: { type: 'string', enum: ['one_off', 'monthly', 'quarterly', 'yearly'] },
            status: { type: 'string', enum: ['draft', 'active', 'paused', 'completed', 'cancelled'] },
            startsAt: nullableDateTime, endsAt: nullableDateTime, renewalAt: nullableDateTime,
            externalReference: nullableText(240), notes: nullableText(2000),
          },
        },
      },
    },
    async (request, reply) => {
      const access = await requireAdminRole(request, reply, 'commercial');
      if (!access) return;
      const existing = await getPool().query<{
        advertiser_id: string; sponsorship_id: string | null; plan_code: PlanCode; agreed_amount_cents: number;
        billing_cycle: BillingCycle; status: ContractStatus; starts_at: Date | null; ends_at: Date | null;
        renewal_at: Date | null; external_reference: string | null; notes: string | null;
      }>('select advertiser_id, sponsorship_id, plan_code, agreed_amount_cents, billing_cycle, status, starts_at, ends_at, renewal_at, external_reference, notes from advertising_commercial_contracts where id = $1', [request.params.contractId]);
      const current = existing.rows[0];
      if (!current) return reply.code(404).send(apiError(request, 'CONTRACT_NOT_FOUND', 'Contract not found'));

      const startsAt = request.body.startsAt === undefined ? current.starts_at?.toISOString() ?? null : request.body.startsAt;
      const endsAt = request.body.endsAt === undefined ? current.ends_at?.toISOString() ?? null : request.body.endsAt;
      if (!validateWindow(startsAt, endsAt)) {
        return reply.code(400).send(apiError(request, 'INVALID_CONTRACT_WINDOW', 'Contract end must be after start'));
      }
      const sponsorshipId = request.body.sponsorshipId === undefined ? current.sponsorship_id : request.body.sponsorshipId;
      if (sponsorshipId) {
        const linked = await getPool().query<{ id: string }>('select id from sponsorships where id = $1 and advertiser_id = $2 limit 1', [sponsorshipId, current.advertiser_id]);
        if (!linked.rows[0]) return reply.code(400).send(apiError(request, 'SPONSORSHIP_ADVERTISER_MISMATCH', 'Sponsorship does not belong to advertiser'));
      }

      const client = await getPool().connect();
      try {
        await client.query('begin');
        await client.query(`
          update advertising_commercial_contracts
          set sponsorship_id = $2, plan_code = $3, agreed_amount_cents = $4,
              billing_cycle = $5, status = $6, starts_at = $7, ends_at = $8,
              renewal_at = $9, external_reference = $10, notes = $11, updated_at = now()
          where id = $1
        `, [request.params.contractId, sponsorshipId, request.body.planCode ?? current.plan_code,
          request.body.agreedAmountCents ?? current.agreed_amount_cents,
          request.body.billingCycle ?? current.billing_cycle, request.body.status ?? current.status,
          startsAt, endsAt, request.body.renewalAt === undefined ? current.renewal_at : request.body.renewalAt,
          request.body.externalReference === undefined ? current.external_reference : trimNullable(request.body.externalReference),
          request.body.notes === undefined ? current.notes : trimNullable(request.body.notes)]);
        await recordAdminAudit(client, access.session, {
          action: 'advertising.contract.update', entityType: 'advertising_contract', entityId: request.params.contractId,
          summary: 'Contrato comercial publicitario actualizado',
          metadata: { status: request.body.status ?? current.status },
        });
        await client.query('commit');
        return { ok: true };
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally { client.release(); }
    },
  );

  app.post<{ Body: BillingBody }>(
    '/api/v1/admin/finance/billing',
    {
      schema: {
        body: {
          type: 'object', additionalProperties: false,
          required: ['contractId', 'amountCents', 'status'],
          properties: {
            contractId: { type: 'string', format: 'uuid' }, amountCents: { type: 'integer', minimum: 0 },
            status: { type: 'string', enum: ['pending', 'issued', 'paid', 'overdue', 'cancelled', 'refunded'] },
            dueAt: nullableDateTime, paidAt: nullableDateTime,
            paymentMethod: { anyOf: [{ type: 'string', enum: ['manual', 'bank_transfer', 'bizum', 'card', 'other'] }, { type: 'null' }] },
            reference: nullableText(240), notes: nullableText(2000),
          },
        },
      },
    },
    async (request, reply) => {
      const access = await requireAdminRole(request, reply, 'commercial');
      if (!access) return;
      const contract = await getPool().query<{ id: string }>('select id from advertising_commercial_contracts where id = $1 limit 1', [request.body.contractId]);
      if (!contract.rows[0]) return reply.code(404).send(apiError(request, 'CONTRACT_NOT_FOUND', 'Contract not found'));
      const id = randomUUID();
      const paidAt = paidAtFor(request.body.status, request.body.paidAt);
      const client = await getPool().connect();
      try {
        await client.query('begin');
        await client.query(`
          insert into advertising_billing_entries (
            id, contract_id, amount_cents, currency, status, due_at, paid_at,
            payment_method, reference, notes, created_by_user_id
          ) values ($1, $2, $3, 'EUR', $4, $5, $6, $7, $8, $9, $10)
        `, [id, request.body.contractId, request.body.amountCents, request.body.status,
          request.body.dueAt ?? null, paidAt, request.body.paymentMethod ?? null,
          trimNullable(request.body.reference), trimNullable(request.body.notes), access.session.user.id]);
        await recordAdminAudit(client, access.session, {
          action: 'advertising.billing.create', entityType: 'advertising_billing_entry', entityId: id,
          summary: 'Apunte de facturación publicitaria creado',
          metadata: { status: request.body.status, amountCents: request.body.amountCents },
        });
        await client.query('commit');
        reply.code(201);
        return { id };
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally { client.release(); }
    },
  );

  app.patch<{ Params: { entryId: string }; Body: BillingPatchBody }>(
    '/api/v1/admin/finance/billing/:entryId',
    {
      schema: {
        params: { type: 'object', additionalProperties: false, required: ['entryId'], properties: { entryId: { type: 'string', format: 'uuid' } } },
        body: {
          type: 'object', additionalProperties: false,
          properties: {
            amountCents: { type: 'integer', minimum: 0 },
            status: { type: 'string', enum: ['pending', 'issued', 'paid', 'overdue', 'cancelled', 'refunded'] },
            dueAt: nullableDateTime, paidAt: nullableDateTime,
            paymentMethod: { anyOf: [{ type: 'string', enum: ['manual', 'bank_transfer', 'bizum', 'card', 'other'] }, { type: 'null' }] },
            reference: nullableText(240), notes: nullableText(2000),
          },
        },
      },
    },
    async (request, reply) => {
      const access = await requireAdminRole(request, reply, 'commercial');
      if (!access) return;
      const existing = await getPool().query<{
        amount_cents: number; status: BillingStatus; due_at: Date | null; paid_at: Date | null;
        payment_method: PaymentMethod | null; reference: string | null; notes: string | null;
      }>('select amount_cents, status, due_at, paid_at, payment_method, reference, notes from advertising_billing_entries where id = $1', [request.params.entryId]);
      const current = existing.rows[0];
      if (!current) return reply.code(404).send(apiError(request, 'BILLING_ENTRY_NOT_FOUND', 'Billing entry not found'));
      const status = request.body.status ?? current.status;
      const explicitPaidAt = request.body.paidAt === undefined ? current.paid_at?.toISOString() ?? null : request.body.paidAt;
      const paidAt = paidAtFor(status, explicitPaidAt);
      const client = await getPool().connect();
      try {
        await client.query('begin');
        await client.query(`
          update advertising_billing_entries
          set amount_cents = $2, status = $3, due_at = $4, paid_at = $5,
              payment_method = $6, reference = $7, notes = $8, updated_at = now()
          where id = $1
        `, [request.params.entryId, request.body.amountCents ?? current.amount_cents, status,
          request.body.dueAt === undefined ? current.due_at : request.body.dueAt, paidAt,
          request.body.paymentMethod === undefined ? current.payment_method : request.body.paymentMethod,
          request.body.reference === undefined ? current.reference : trimNullable(request.body.reference),
          request.body.notes === undefined ? current.notes : trimNullable(request.body.notes)]);
        await recordAdminAudit(client, access.session, {
          action: 'advertising.billing.update', entityType: 'advertising_billing_entry', entityId: request.params.entryId,
          summary: 'Apunte de facturación publicitaria actualizado', metadata: { status },
        });
        await client.query('commit');
        return { ok: true };
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally { client.release(); }
    },
  );

  app.get('/api/v1/admin/roles', async (request, reply) => {
    const access = await requireSuperadmin(request, reply);
    if (!access) return;
    const users = await getPool().query<{
      id: string; email: string; name: string | null; roles: string[] | null;
    }>(`
      select
        to_jsonb(u)->>'id' as id,
        coalesce(to_jsonb(u)->>'email', '') as email,
        nullif(to_jsonb(u)->>'name', '') as name,
        coalesce(array_agg(m.role order by m.role) filter (where m.status = 'active'), array[]::text[]) as roles
      from "user" u
      left join platform_admin_memberships m on m.user_id = to_jsonb(u)->>'id'
      group by to_jsonb(u)->>'id', to_jsonb(u)->>'email', to_jsonb(u)->>'name'
      order by coalesce(to_jsonb(u)->>'email', '')
      limit 300
    `);
    reply.header('cache-control', 'private, no-store');
    return {
      currentUserId: access.session.user.id,
      bootstrapSuperadmin: access.bootstrapSuperadmin,
      availableRoles: ['superadmin', 'commercial', 'content', 'support', 'operations'] as PlatformAdminRole[],
      users: users.rows.map((row) => ({
        id: row.id, email: row.email, name: row.name, roles: row.roles ?? [],
        bootstrapSuperadmin: isPlatformAdminEmail(row.email),
      })),
    };
  });

  app.put<{ Params: { userId: string }; Body: RolesBody }>(
    '/api/v1/admin/roles/:userId',
    {
      schema: {
        params: { type: 'object', additionalProperties: false, required: ['userId'], properties: { userId: { type: 'string', minLength: 1, maxLength: 255 } } },
        body: {
          type: 'object', additionalProperties: false, required: ['roles'],
          properties: {
            roles: { type: 'array', uniqueItems: true, maxItems: 5, items: { type: 'string', enum: ['superadmin', 'commercial', 'content', 'support', 'operations'] } },
          },
        },
      },
    },
    async (request, reply) => {
      const access = await requireSuperadmin(request, reply);
      if (!access) return;
      if (request.params.userId === access.session.user.id) {
        return reply.code(400).send(apiError(request, 'ADMIN_SELF_ROLE_CHANGE_BLOCKED', 'Use another superadmin to change your own persisted roles'));
      }
      const user = await getPool().query<{ email: string }>(`
        select coalesce(to_jsonb(u)->>'email', '') as email from "user" u
        where to_jsonb(u)->>'id' = $1 limit 1
      `, [request.params.userId]);
      if (!user.rows[0]) return reply.code(404).send(apiError(request, 'USER_NOT_FOUND', 'User not found'));
      if (isPlatformAdminEmail(user.rows[0].email)) {
        return reply.code(400).send(apiError(request, 'BOOTSTRAP_SUPERADMIN_IMMUTABLE', 'Bootstrap superadmin is managed only through MAGINA_ADMIN_EMAILS'));
      }

      const client = await getPool().connect();
      try {
        await client.query('begin');
        await client.query(`update platform_admin_memberships set status = 'revoked', updated_at = now() where user_id = $1`, [request.params.userId]);
        for (const role of request.body.roles) {
          await client.query(`
            insert into platform_admin_memberships (user_id, role, status, created_by_user_id)
            values ($1, $2, 'active', $3)
            on conflict (user_id, role) do update set status = 'active', updated_at = now()
          `, [request.params.userId, role, access.session.user.id]);
        }
        await recordAdminAudit(client, access.session, {
          action: 'admin.roles.replace', entityType: 'platform_admin_user', entityId: request.params.userId,
          summary: 'Roles administrativos actualizados', metadata: { roleCount: request.body.roles.length },
        });
        await client.query('commit');
        return { ok: true };
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally { client.release(); }
    },
  );
}
