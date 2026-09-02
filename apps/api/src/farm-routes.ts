import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { canWrite, getHoldingAccess } from './authorization.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

type HoldingParams = { holdingId: string };
type CreateFarmBody = {
  name: string;
  description?: string;
  areaHa?: number;
};

export function registerFarmRoutes(app: FastifyInstance): void {
  app.get<{ Params: HoldingParams }>(
    '/api/v1/holdings/:holdingId/farms',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const access = await getHoldingAccess(session.user.id, request.params.holdingId);
      if (!access) {
        return reply.code(404).send(apiError(request, 'HOLDING_NOT_FOUND', 'Holding not found'));
      }

      const result = await getPool().query<{
        id: string;
        name: string;
        description: string | null;
        area_ha: string | null;
        active: boolean;
        created_at: Date;
        updated_at: Date;
      }>(
        `
          select id, name, description, area_ha, active, created_at, updated_at
          from farms
          where holding_id = $1 and active = true
          order by created_at asc, id asc
        `,
        [access.holdingId],
      );

      return {
        items: result.rows.map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          areaHa: row.area_ha,
          active: row.active,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      };
    },
  );

  app.post<{ Params: HoldingParams; Body: CreateFarmBody }>(
    '/api/v1/holdings/:holdingId/farms',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 120 },
            description: { type: 'string', maxLength: 2000 },
            areaHa: { type: 'number', minimum: 0, maximum: 1000000 },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const access = await getHoldingAccess(session.user.id, request.params.holdingId);
      if (!access) {
        return reply.code(404).send(apiError(request, 'HOLDING_NOT_FOUND', 'Holding not found'));
      }
      if (!canWrite(access.role)) {
        return reply.code(403).send(apiError(request, 'WRITE_FORBIDDEN', 'Write access required'));
      }

      const name = request.body.name.trim();
      if (!name) {
        return reply.code(400).send(apiError(request, 'INVALID_FARM_NAME', 'Farm name is required'));
      }

      const id = randomUUID();
      const row = (
        await getPool().query<{
          id: string;
          name: string;
          description: string | null;
          area_ha: string | null;
          created_at: Date;
          updated_at: Date;
        }>(
          `
            insert into farms (id, holding_id, name, description, area_ha)
            values ($1, $2, $3, $4, $5)
            returning id, name, description, area_ha, created_at, updated_at
          `,
          [
            id,
            access.holdingId,
            name,
            request.body.description?.trim() || null,
            request.body.areaHa ?? null,
          ],
        )
      ).rows[0];

      if (!row) throw new Error('Farm insert returned no row');

      return reply.code(201).send({
        id: row.id,
        name: row.name,
        description: row.description,
        areaHa: row.area_ha,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    },
  );
}
