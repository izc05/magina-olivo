import type { FastifyInstance } from 'fastify';
import { canWrite, getDeliveryAccess } from './authorization.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

type DeliveryParams = { deliveryId: string };
type UpdateDeliveryBody = {
  version: number;
  deliveredAt?: string;
  kilograms?: string;
  ticketNumber?: string | null;
  notes?: string | null;
};

type DeliveryRow = {
  id: string;
  delivered_at: Date;
  kilograms: string;
  ticket_number: string | null;
  notes: string | null;
  version: string;
  updated_at: Date;
};

export function registerDeliveryUpdateRoutes(app: FastifyInstance): void {
  app.patch<{ Params: DeliveryParams; Body: UpdateDeliveryBody }>(
    '/api/v1/deliveries/:deliveryId',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['version'],
          properties: {
            version: { type: 'integer', minimum: 1 },
            deliveredAt: { type: 'string', format: 'date-time' },
            kilograms: { type: 'string', pattern: '^[0-9]+(?:\\.[0-9]{1,3})?$' },
            ticketNumber: { anyOf: [{ type: 'string', maxLength: 200 }, { type: 'null' }] },
            notes: { anyOf: [{ type: 'string', maxLength: 5000 }, { type: 'null' }] },
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
      if (!canWrite(access.role)) {
        return reply.code(403).send(apiError(request, 'WRITE_FORBIDDEN', 'Write access required'));
      }

      const hasMutation =
        request.body.deliveredAt !== undefined ||
        request.body.kilograms !== undefined ||
        request.body.ticketNumber !== undefined ||
        request.body.notes !== undefined;
      if (!hasMutation) {
        return reply.code(400).send(apiError(request, 'DELIVERY_UPDATE_EMPTY', 'No editable fields supplied'));
      }

      if (request.body.kilograms !== undefined) {
        const kilograms = Number(request.body.kilograms);
        if (!Number.isFinite(kilograms) || kilograms <= 0) {
          return reply
            .code(400)
            .send(apiError(request, 'INVALID_KILOGRAMS', 'Kilograms must be greater than zero'));
        }
      }

      const db = getPool();
      const result = await db.query<DeliveryRow>(
        `
          update deliveries
          set delivered_at = coalesce($4::timestamptz, delivered_at),
              kilograms = coalesce($5::numeric, kilograms),
              ticket_number = case when $6::boolean then $7::text else ticket_number end,
              notes = case when $8::boolean then $9::text else notes end,
              version = version + 1,
              updated_at = now()
          where id = $1
            and holding_id = $2
            and version = $3
            and verification_status <> 'archived'
          returning id, delivered_at, kilograms, ticket_number, notes, version, updated_at
        `,
        [
          request.params.deliveryId,
          access.holdingId,
          request.body.version,
          request.body.deliveredAt ?? null,
          request.body.kilograms ?? null,
          request.body.ticketNumber !== undefined,
          request.body.ticketNumber?.trim() || null,
          request.body.notes !== undefined,
          request.body.notes?.trim() || null,
        ],
      );

      const row = result.rows[0];
      if (!row) {
        const current = await db.query<{ version: string }>(
          `
            select version
            from deliveries
            where id = $1 and holding_id = $2 and verification_status <> 'archived'
          `,
          [request.params.deliveryId, access.holdingId],
        );
        const currentVersion = current.rows[0]?.version;
        if (!currentVersion) {
          return reply.code(404).send(apiError(request, 'DELIVERY_NOT_FOUND', 'Delivery not found'));
        }

        return reply.code(409).send(
          apiError(request, 'DELIVERY_VERSION_CONFLICT', 'Delivery changed since it was opened', {
            expected_version: request.body.version,
            current_version: Number(currentVersion),
          }),
        );
      }

      return {
        id: row.id,
        deliveredAt: row.delivered_at,
        kilograms: row.kilograms,
        ticketNumber: row.ticket_number,
        notes: row.notes,
        version: Number(row.version),
        updatedAt: row.updated_at,
      };
    },
  );
}
