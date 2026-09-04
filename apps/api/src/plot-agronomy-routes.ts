import type { FastifyInstance } from 'fastify';
import { canWrite, getFarmAccess } from './authorization.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

type PlotParams = { plotId: string };
type IrrigationType = 'dryland' | 'irrigated' | 'mixed' | 'unknown';
type UpdateAgronomyBody = {
  oliveTreeCount: number | null;
  irrigationType: IrrigationType | null;
  oliveVariety: string | null;
};

type PlotAccessRow = {
  farm_id: string;
  holding_id: string;
};

type UpdatedPlotRow = {
  id: string;
  olive_tree_count: number | null;
  irrigation_type: IrrigationType | null;
  olive_variety: string | null;
  area_ha: string | null;
  boundary_area_ha: string | null;
};

export function registerPlotAgronomyRoutes(app: FastifyInstance): void {
  app.patch<{ Params: PlotParams; Body: UpdateAgronomyBody }>(
    '/api/v1/plots/:plotId/agronomy',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['oliveTreeCount', 'irrigationType', 'oliveVariety'],
          properties: {
            oliveTreeCount: {
              anyOf: [
                { type: 'integer', minimum: 0, maximum: 100000000 },
                { type: 'null' },
              ],
            },
            irrigationType: {
              anyOf: [
                { type: 'string', enum: ['dryland', 'irrigated', 'mixed', 'unknown'] },
                { type: 'null' },
              ],
            },
            oliveVariety: {
              anyOf: [
                { type: 'string', minLength: 1, maxLength: 80 },
                { type: 'null' },
              ],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const plotLookup = await getPool().query<PlotAccessRow>(
        'select farm_id, holding_id from plots where id = $1 and active = true',
        [request.params.plotId],
      );
      const plot = plotLookup.rows[0];
      if (!plot) {
        return reply.code(404).send(apiError(request, 'PLOT_NOT_FOUND', 'Plot not found'));
      }

      const access = await getFarmAccess(session.user.id, plot.farm_id);
      if (!access || access.holdingId !== plot.holding_id) {
        return reply.code(404).send(apiError(request, 'PLOT_NOT_FOUND', 'Plot not found'));
      }
      if (!canWrite(access.role)) {
        return reply.code(403).send(apiError(request, 'WRITE_FORBIDDEN', 'Write access required'));
      }

      const variety = request.body.oliveVariety?.trim() || null;
      const updated = await getPool().query<UpdatedPlotRow>(
        `update plots
         set olive_tree_count = $1,
             irrigation_type = $2,
             olive_variety = $3,
             version = version + 1,
             updated_at = now()
         where id = $4 and holding_id = $5 and active = true
         returning id, olive_tree_count, irrigation_type, olive_variety, area_ha, boundary_area_ha`,
        [
          request.body.oliveTreeCount,
          request.body.irrigationType,
          variety,
          request.params.plotId,
          access.holdingId,
        ],
      );
      const row = updated.rows[0];
      if (!row) {
        return reply.code(404).send(apiError(request, 'PLOT_NOT_FOUND', 'Plot not found'));
      }

      return {
        id: row.id,
        oliveTreeCount: row.olive_tree_count,
        irrigationType: row.irrigation_type,
        oliveVariety: row.olive_variety,
        areaHa: row.area_ha,
        boundaryAreaHa: row.boundary_area_ha,
      };
    },
  );
}
