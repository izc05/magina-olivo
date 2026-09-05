import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { awardLoyaltyBestEffort } from './loyalty-business-awards.ts';
import { yieldRecordedLoyaltyAward } from './loyalty-business-policy.ts';
import { getAuthenticatedSession } from './session.ts';

type DeliveryParams = { deliveryId: string };
type CreateResultBody = {
  value: string;
  measuredAt?: string;
  notes?: string;
};

type DeliveryAccess = {
  holdingId: string;
  role: 'owner' | 'admin' | 'collaborator' | 'viewer';
};

async function getDeliveryAccess(userId: string, deliveryId: string): Promise<DeliveryAccess | null> {
  const result = await getPool().query<{ holding_id: string; role: DeliveryAccess['role'] }>(
    `
      select d.holding_id, hm.role
      from deliveries d
      join holdings h on h.id = d.holding_id
      join holding_members hm on hm.holding_id = d.holding_id
      where d.id = $1
        and d.verification_status <> 'archived'
        and h.active = true
        and hm.user_id = $2
        and hm.status = 'active'
      limit 1
    `,
    [deliveryId, userId],
  );

  const row = result.rows[0];
  return row ? { holdingId: row.holding_id, role: row.role } : null;
}

export function registerDeliveryResultRoutes(app: FastifyInstance): void {
  app.get<{ Params: DeliveryParams }>(
    '/api/v1/deliveries/:deliveryId/results',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const access = await getDeliveryAccess(session.user.id, request.params.deliveryId);
      if (!access) {
        return reply.code(404).send(apiError(request, 'DELIVERY_NOT_FOUND', 'Delivery not found'));
      }

      const result = await getPool().query<{
        id: string;
        value: string;
        unit: string;
        measured_at: Date | null;
        source_kind: string;
        status: string;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
      }>(
        `
          select id, value, unit, measured_at, source_kind, status, notes, created_at, updated_at
          from delivery_results
          where holding_id = $1 and delivery_id = $2
          order by created_at asc, id asc
        `,
        [access.holdingId, request.params.deliveryId],
      );

      return {
        items: result.rows.map((row) => ({
          id: row.id,
          resultType: 'fat_yield',
          value: row.value,
          unit: row.unit,
          measuredAt: row.measured_at,
          sourceKind: row.source_kind,
          status: row.status,
          notes: row.notes,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      };
    },
  );

  app.post<{ Params: DeliveryParams; Body: CreateResultBody }>(
    '/api/v1/deliveries/:deliveryId/results',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['value'],
          properties: {
            value: { type: 'string', pattern: '^(?:100(?:\\.0{1,4})?|[0-9]{1,2}(?:\\.[0-9]{1,4})?)$' },
            measuredAt: { type: 'string', format: 'date-time' },
            notes: { type: 'string', maxLength: 5000 },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const access = await getDeliveryAccess(session.user.id, request.params.deliveryId);
      if (!access) {
        return reply.code(404).send(apiError(request, 'DELIVERY_NOT_FOUND', 'Delivery not found'));
      }
      if (access.role === 'viewer') {
        return reply.code(403).send(apiError(request, 'WRITE_FORBIDDEN', 'Write access required'));
      }

      const value = Number(request.body.value);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        return reply.code(400).send(apiError(request, 'INVALID_YIELD', 'Yield must be between 0 and 100'));
      }

      const db = getPool();
      const client = await db.connect();
      const resultId = randomUUID();

      try {
        await client.query('begin');
        await client.query(
          `
            update delivery_results
            set status = 'superseded', updated_at = now()
            where holding_id = $1
              and delivery_id = $2
              and result_type = 'fat_yield'
              and status = 'current'
          `,
          [access.holdingId, request.params.deliveryId],
        );

        const inserted = await client.query<{
          id: string;
          value: string;
          unit: string;
          measured_at: Date | null;
          source_kind: string;
          status: string;
          notes: string | null;
          created_at: Date;
          updated_at: Date;
        }>(
          `
            insert into delivery_results (
              id, holding_id, delivery_id, result_type, value, unit,
              measured_at, source_kind, status, notes, created_by
            )
            values ($1, $2, $3, 'fat_yield', $4, 'percent', $5, 'manual', 'current', $6, $7)
            returning id, value, unit, measured_at, source_kind, status, notes, created_at, updated_at
          `,
          [
            resultId,
            access.holdingId,
            request.params.deliveryId,
            request.body.value,
            request.body.measuredAt ?? null,
            request.body.notes?.trim() || null,
            session.user.id,
          ],
        );

        await client.query('commit');
        const row = inserted.rows[0];
        if (!row) throw new Error('Delivery result insert returned no row');

        await awardLoyaltyBestEffort(
          yieldRecordedLoyaltyAward(session.user.id, request.params.deliveryId, row.id),
          'delivery_result.create',
        );

        return reply.code(201).send({
          id: row.id,
          resultType: 'fat_yield',
          value: row.value,
          unit: row.unit,
          measuredAt: row.measured_at,
          sourceKind: row.source_kind,
          status: row.status,
          notes: row.notes,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },
  );
}
