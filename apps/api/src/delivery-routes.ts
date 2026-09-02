import { createHash, randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { canWrite, getCampaignAccess } from './authorization.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

type CampaignParams = { campaignId: string };
type CreateDeliveryBody = {
  deliveredAt: string;
  kilograms: string;
  cooperativeId?: string;
  customDestination?: string;
  farmId?: string;
  plotId?: string;
  ticketNumber?: string;
  variety?: string;
  notes?: string;
  clientGeneratedId?: string;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(',')}}`;
}

function hashRequest(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

export function registerDeliveryRoutes(app: FastifyInstance): void {
  app.get<{ Params: CampaignParams }>(
    '/api/v1/campaigns/:campaignId/deliveries',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const access = await getCampaignAccess(session.user.id, request.params.campaignId);
      if (!access) {
        return reply.code(404).send(apiError(request, 'CAMPAIGN_NOT_FOUND', 'Campaign not found'));
      }

      const result = await getPool().query<{
        id: string;
        delivered_at: Date;
        kilograms: string;
        cooperative_id: string | null;
        custom_destination: string | null;
        farm_id: string | null;
        plot_id: string | null;
        ticket_number: string | null;
        variety: string | null;
        verification_status: string;
        version: string;
        created_at: Date;
        updated_at: Date;
      }>(
        `
          select id, delivered_at, kilograms, cooperative_id, custom_destination,
                 farm_id, plot_id, ticket_number, variety, verification_status,
                 version, created_at, updated_at
          from deliveries
          where holding_id = $1
            and campaign_id = $2
            and verification_status <> 'archived'
          order by delivered_at desc, id desc
        `,
        [access.holdingId, request.params.campaignId],
      );

      return {
        items: result.rows.map((row) => ({
          id: row.id,
          deliveredAt: row.delivered_at,
          kilograms: row.kilograms,
          cooperativeId: row.cooperative_id,
          customDestination: row.custom_destination,
          farmId: row.farm_id,
          plotId: row.plot_id,
          ticketNumber: row.ticket_number,
          variety: row.variety,
          verificationStatus: row.verification_status,
          version: Number(row.version),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      };
    },
  );

  app.post<{ Params: CampaignParams; Body: CreateDeliveryBody }>(
    '/api/v1/campaigns/:campaignId/deliveries',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['deliveredAt', 'kilograms'],
          properties: {
            deliveredAt: { type: 'string', format: 'date-time' },
            kilograms: { type: 'string', pattern: '^[0-9]+(?:\\.[0-9]{1,3})?$' },
            cooperativeId: { type: 'string', format: 'uuid' },
            customDestination: { type: 'string', minLength: 1, maxLength: 200 },
            farmId: { type: 'string', format: 'uuid' },
            plotId: { type: 'string', format: 'uuid' },
            ticketNumber: { type: 'string', maxLength: 200 },
            variety: { type: 'string', maxLength: 120 },
            notes: { type: 'string', maxLength: 5000 },
            clientGeneratedId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const access = await getCampaignAccess(session.user.id, request.params.campaignId);
      if (!access) {
        return reply.code(404).send(apiError(request, 'CAMPAIGN_NOT_FOUND', 'Campaign not found'));
      }
      if (!canWrite(access.role)) {
        return reply.code(403).send(apiError(request, 'WRITE_FORBIDDEN', 'Write access required'));
      }

      const idempotencyKeyHeader = request.headers['idempotency-key'];
      const idempotencyKey = Array.isArray(idempotencyKeyHeader)
        ? idempotencyKeyHeader[0]
        : idempotencyKeyHeader;
      if (!idempotencyKey || idempotencyKey.length > 200) {
        return reply.code(400).send(
          apiError(
            request,
            'IDEMPOTENCY_KEY_REQUIRED',
            'A valid Idempotency-Key header is required',
          ),
        );
      }

      const customDestination = request.body.customDestination?.trim() || null;
      if (!request.body.cooperativeId && !customDestination) {
        return reply.code(400).send(
          apiError(
            request,
            'DESTINATION_REQUIRED',
            'A cooperative or custom destination is required',
          ),
        );
      }

      const kilograms = Number(request.body.kilograms);
      if (!Number.isFinite(kilograms) || kilograms <= 0) {
        return reply
          .code(400)
          .send(apiError(request, 'INVALID_KILOGRAMS', 'Kilograms must be greater than zero'));
      }

      let farmId = request.body.farmId ?? null;
      const plotId = request.body.plotId ?? null;
      const db = getPool();

      if (farmId) {
        const farm = await db.query<{ id: string }>(
          'select id from farms where id = $1 and holding_id = $2 and active = true',
          [farmId, access.holdingId],
        );
        if (!farm.rows[0]) {
          return reply.code(400).send(apiError(request, 'INVALID_FARM', 'Farm is not valid for this campaign'));
        }
      }

      if (plotId) {
        const plot = await db.query<{ farm_id: string }>(
          'select farm_id from plots where id = $1 and holding_id = $2 and active = true',
          [plotId, access.holdingId],
        );
        const plotRow = plot.rows[0];
        if (!plotRow) {
          return reply.code(400).send(apiError(request, 'INVALID_PLOT', 'Plot is not valid for this campaign'));
        }
        if (farmId && farmId !== plotRow.farm_id) {
          return reply.code(400).send(apiError(request, 'PLOT_FARM_MISMATCH', 'Plot does not belong to the selected farm'));
        }
        farmId = plotRow.farm_id;
      }

      if (request.body.cooperativeId) {
        const cooperative = await db.query<{ id: string }>(
          'select id from cooperatives where id = $1',
          [request.body.cooperativeId],
        );
        if (!cooperative.rows[0]) {
          return reply.code(400).send(apiError(request, 'INVALID_COOPERATIVE', 'Cooperative does not exist'));
        }
      }

      const routeIdentity = 'POST:/api/v1/campaigns/:campaignId/deliveries';
      const requestHash = hashRequest({
        campaignId: request.params.campaignId,
        body: request.body,
      });
      const deliveryId = request.body.clientGeneratedId ?? randomUUID();
      const client = await db.connect();

      try {
        await client.query('begin');
        const claim = await client.query<{ idempotency_key: string }>(
          `
            insert into idempotency_keys (
              actor_user_id, idempotency_key, route, request_hash, expires_at
            )
            values ($1, $2, $3, $4, now() + interval '7 days')
            on conflict (actor_user_id, idempotency_key) do nothing
            returning idempotency_key
          `,
          [session.user.id, idempotencyKey, routeIdentity, requestHash],
        );

        if (!claim.rows[0]) {
          await client.query('rollback');
          const existing = await db.query<{
            route: string;
            request_hash: string;
            status_code: number | null;
            response_body: unknown;
          }>(
            `
              select route, request_hash, status_code, response_body
              from idempotency_keys
              where actor_user_id = $1 and idempotency_key = $2
            `,
            [session.user.id, idempotencyKey],
          );
          const row = existing.rows[0];
          if (!row || row.route !== routeIdentity || row.request_hash !== requestHash) {
            return reply.code(409).send(
              apiError(
                request,
                'IDEMPOTENCY_KEY_REUSED',
                'Idempotency key was already used for a different request',
              ),
            );
          }
          if (row.status_code === null || row.response_body === null) {
            return reply.code(409).send(
              apiError(request, 'IDEMPOTENCY_IN_PROGRESS', 'The original request is still being processed'),
            );
          }
          return reply.code(row.status_code).send(row.response_body);
        }

        const inserted = await client.query<{
          id: string;
          delivered_at: Date;
          kilograms: string;
          cooperative_id: string | null;
          custom_destination: string | null;
          farm_id: string | null;
          plot_id: string | null;
          ticket_number: string | null;
          variety: string | null;
          verification_status: string;
          version: string;
          created_at: Date;
          updated_at: Date;
        }>(
          `
            insert into deliveries (
              id, holding_id, campaign_id, farm_id, plot_id, cooperative_id,
              custom_destination, delivered_at, kilograms, variety,
              ticket_number, source_kind, verification_status, notes, created_by
            )
            values (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, 'manual', 'confirmed', $12, $13
            )
            returning id, delivered_at, kilograms, cooperative_id, custom_destination,
                      farm_id, plot_id, ticket_number, variety, verification_status,
                      version, created_at, updated_at
          `,
          [
            deliveryId,
            access.holdingId,
            request.params.campaignId,
            farmId,
            plotId,
            request.body.cooperativeId ?? null,
            customDestination,
            request.body.deliveredAt,
            request.body.kilograms,
            request.body.variety?.trim() || null,
            request.body.ticketNumber?.trim() || null,
            request.body.notes?.trim() || null,
            session.user.id,
          ],
        );

        const row = inserted.rows[0];
        if (!row) throw new Error('Delivery insert returned no row');

        const responseBody = {
          id: row.id,
          deliveredAt: row.delivered_at,
          kilograms: row.kilograms,
          cooperativeId: row.cooperative_id,
          customDestination: row.custom_destination,
          farmId: row.farm_id,
          plotId: row.plot_id,
          ticketNumber: row.ticket_number,
          variety: row.variety,
          verificationStatus: row.verification_status,
          version: Number(row.version),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          meta: { idempotentReplay: false },
        };

        await client.query(
          `
            update idempotency_keys
            set status_code = 201, response_body = $3::jsonb
            where actor_user_id = $1 and idempotency_key = $2
          `,
          [session.user.id, idempotencyKey, JSON.stringify(responseBody)],
        );
        await client.query('commit');

        return reply.code(201).send(responseBody);
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },
  );
}
