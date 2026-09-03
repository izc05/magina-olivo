import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { canWrite, getHoldingAccess } from './authorization.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

type HoldingParams = { holdingId: string };
type ActivityType =
  | 'treatment'
  | 'fertilization'
  | 'pruning'
  | 'mowing'
  | 'tillage'
  | 'irrigation'
  | 'harvest'
  | 'maintenance'
  | 'planting'
  | 'sampling'
  | 'observation'
  | 'other';

type ActivityQuery = {
  plotId?: string;
  campaignId?: string;
  activityType?: ActivityType;
  limit?: number;
};

type CreateActivityBody = {
  activityType: ActivityType;
  occurredAt: string;
  clientGeneratedId?: string;
  campaignId?: string;
  farmId?: string;
  plotId?: string;
  affectedAreaHa?: number;
  productName?: string;
  productRegistrationNumber?: string;
  quantity?: number;
  quantityUnit?: string;
  costEur?: number;
  notes?: string;
};

type ActivityRow = {
  id: string;
  holding_id: string;
  campaign_id: string | null;
  farm_id: string | null;
  plot_id: string | null;
  activity_type: ActivityType;
  occurred_at: Date;
  affected_area_ha: string | null;
  product_name: string | null;
  product_registration_number: string | null;
  quantity: string | null;
  quantity_unit: string | null;
  cost_eur: string | null;
  notes: string | null;
  verification_status: string;
  version: string;
  created_at: Date;
};

function serialize(row: ActivityRow) {
  return {
    id: row.id,
    holdingId: row.holding_id,
    campaignId: row.campaign_id,
    farmId: row.farm_id,
    plotId: row.plot_id,
    activityType: row.activity_type,
    occurredAt: row.occurred_at,
    affectedAreaHa: row.affected_area_ha,
    productName: row.product_name,
    productRegistrationNumber: row.product_registration_number,
    quantity: row.quantity,
    quantityUnit: row.quantity_unit,
    costEur: row.cost_eur,
    notes: row.notes,
    verificationStatus: row.verification_status,
    version: Number(row.version),
    createdAt: row.created_at,
  };
}

const activityTypeSchema = {
  type: 'string',
  enum: [
    'treatment',
    'fertilization',
    'pruning',
    'mowing',
    'tillage',
    'irrigation',
    'harvest',
    'maintenance',
    'planting',
    'sampling',
    'observation',
    'other',
  ],
} as const;

export function registerActivityRoutes(app: FastifyInstance): void {
  app.get<{ Params: HoldingParams; Querystring: ActivityQuery }>(
    '/api/v1/holdings/:holdingId/activities',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            plotId: { type: 'string', format: 'uuid' },
            campaignId: { type: 'string', format: 'uuid' },
            activityType: activityTypeSchema,
            limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));

      const access = await getHoldingAccess(session.user.id, request.params.holdingId);
      if (!access) return reply.code(404).send(apiError(request, 'HOLDING_NOT_FOUND', 'Holding not found'));

      const values: unknown[] = [request.params.holdingId];
      const filters = ["a.holding_id = $1", "a.verification_status <> 'archived'"];

      if (request.query.plotId) {
        values.push(request.query.plotId);
        filters.push(`a.plot_id = $${values.length}`);
      }
      if (request.query.campaignId) {
        values.push(request.query.campaignId);
        filters.push(`a.campaign_id = $${values.length}`);
      }
      if (request.query.activityType) {
        values.push(request.query.activityType);
        filters.push(`a.activity_type = $${values.length}`);
      }
      values.push(request.query.limit ?? 50);

      const result = await getPool().query<ActivityRow>(
        `
          select
            a.id, a.holding_id, a.campaign_id, a.farm_id, a.plot_id,
            a.activity_type, a.occurred_at, a.affected_area_ha, a.product_name,
            a.product_registration_number, a.quantity, a.quantity_unit,
            a.cost_eur, a.notes, a.verification_status, a.version, a.created_at
          from activities a
          where ${filters.join(' and ')}
          order by a.occurred_at desc, a.created_at desc
          limit $${values.length}
        `,
        values,
      );

      return { items: result.rows.map(serialize) };
    },
  );

  app.post<{ Params: HoldingParams; Body: CreateActivityBody }>(
    '/api/v1/holdings/:holdingId/activities',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['activityType', 'occurredAt'],
          properties: {
            activityType: activityTypeSchema,
            occurredAt: { type: 'string', format: 'date-time' },
            clientGeneratedId: { type: 'string', format: 'uuid' },
            campaignId: { type: 'string', format: 'uuid' },
            farmId: { type: 'string', format: 'uuid' },
            plotId: { type: 'string', format: 'uuid' },
            affectedAreaHa: { type: 'number', minimum: 0 },
            productName: { type: 'string', maxLength: 240 },
            productRegistrationNumber: { type: 'string', maxLength: 120 },
            quantity: { type: 'number', minimum: 0 },
            quantityUnit: { type: 'string', maxLength: 40 },
            costEur: { type: 'number', minimum: 0 },
            notes: { type: 'string', maxLength: 4000 },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));

      const access = await getHoldingAccess(session.user.id, request.params.holdingId);
      if (!access) return reply.code(404).send(apiError(request, 'HOLDING_NOT_FOUND', 'Holding not found'));
      if (!canWrite(access.role)) return reply.code(403).send(apiError(request, 'WRITE_FORBIDDEN', 'Write access required'));

      let farmId = request.body.farmId ?? null;
      const plotId = request.body.plotId ?? null;
      const campaignId = request.body.campaignId ?? null;
      const db = getPool();

      if (campaignId) {
        const campaign = await db.query<{ id: string }>(
          `select id from campaigns where id = $1 and holding_id = $2 and status <> 'archived' limit 1`,
          [campaignId, request.params.holdingId],
        );
        if (!campaign.rows[0]) return reply.code(400).send(apiError(request, 'INVALID_CAMPAIGN', 'Campaign is not valid for this holding'));
      }

      if (farmId) {
        const farm = await db.query<{ id: string }>(
          `select id from farms where id = $1 and holding_id = $2 and active = true limit 1`,
          [farmId, request.params.holdingId],
        );
        if (!farm.rows[0]) return reply.code(400).send(apiError(request, 'INVALID_FARM', 'Farm is not valid for this holding'));
      }

      if (plotId) {
        const plot = await db.query<{ farm_id: string }>(
          `select farm_id from plots where id = $1 and holding_id = $2 and active = true limit 1`,
          [plotId, request.params.holdingId],
        );
        const row = plot.rows[0];
        if (!row) return reply.code(400).send(apiError(request, 'INVALID_PLOT', 'Plot is not valid for this holding'));
        if (farmId && farmId !== row.farm_id) return reply.code(400).send(apiError(request, 'FARM_PLOT_MISMATCH', 'Plot does not belong to the selected farm'));
        farmId = row.farm_id;
      }

      if (request.body.productRegistrationNumber && request.body.activityType !== 'treatment') {
        return reply.code(400).send(apiError(request, 'PRODUCT_REGISTRATION_NOT_APPLICABLE', 'Product registration number is only valid for treatments'));
      }

      const id = request.body.clientGeneratedId ?? randomUUID();
      const inserted = await db.query<ActivityRow>(
        `
          insert into activities (
            id, holding_id, campaign_id, farm_id, plot_id, activity_type,
            occurred_at, affected_area_ha, product_name, product_registration_number,
            quantity, quantity_unit, cost_eur, notes, created_by
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          on conflict (id) do nothing
          returning
            id, holding_id, campaign_id, farm_id, plot_id, activity_type,
            occurred_at, affected_area_ha, product_name, product_registration_number,
            quantity, quantity_unit, cost_eur, notes, verification_status,
            version, created_at
        `,
        [
          id,
          request.params.holdingId,
          campaignId,
          farmId,
          plotId,
          request.body.activityType,
          request.body.occurredAt,
          request.body.affectedAreaHa ?? null,
          request.body.productName?.trim() || null,
          request.body.productRegistrationNumber?.trim() || null,
          request.body.quantity ?? null,
          request.body.quantityUnit?.trim() || null,
          request.body.costEur ?? null,
          request.body.notes?.trim() || null,
          session.user.id,
        ],
      );

      const created = inserted.rows[0];
      if (created) return reply.code(201).send(serialize(created));

      const existing = await db.query<ActivityRow>(
        `
          select
            id, holding_id, campaign_id, farm_id, plot_id, activity_type,
            occurred_at, affected_area_ha, product_name, product_registration_number,
            quantity, quantity_unit, cost_eur, notes, verification_status,
            version, created_at
          from activities
          where id = $1 and holding_id = $2 and verification_status <> 'archived'
          limit 1
        `,
        [id, request.params.holdingId],
      );
      const row = existing.rows[0];
      if (!row) {
        return reply.code(409).send(apiError(request, 'ACTIVITY_ID_CONFLICT', 'Activity id is already in use'));
      }
      return reply.code(200).send(serialize(row));
    },
  );
}
