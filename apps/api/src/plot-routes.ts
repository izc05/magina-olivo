import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { canWrite, getFarmAccess } from './authorization.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

type FarmParams = { farmId: string };
type PlotParams = { plotId: string };
type CreatePlotBody = {
  name: string;
  areaHa?: number;
  sigpacReference?: string;
  latitude?: number;
  longitude?: number;
  irrigationType?: 'dryland' | 'irrigated' | 'mixed' | 'unknown';
  oliveTreeCount?: number;
  notes?: string;
};
type UpdatePlotLocationBody = {
  latitude: number | null;
  longitude: number | null;
};

type PlotRow = {
  id: string;
  name: string;
  area_ha: string | null;
  sigpac_reference: string | null;
  latitude: number | null;
  longitude: number | null;
  irrigation_type: string | null;
  olive_tree_count: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

function serializePlot(row: PlotRow) {
  return {
    id: row.id,
    name: row.name,
    areaHa: row.area_ha,
    sigpacReference: row.sigpac_reference,
    latitude: row.latitude,
    longitude: row.longitude,
    irrigationType: row.irrigation_type,
    oliveTreeCount: row.olive_tree_count,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function registerPlotRoutes(app: FastifyInstance): void {
  app.get<{ Params: FarmParams }>(
    '/api/v1/farms/:farmId/plots',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const access = await getFarmAccess(session.user.id, request.params.farmId);
      if (!access) {
        return reply.code(404).send(apiError(request, 'FARM_NOT_FOUND', 'Farm not found'));
      }

      const result = await getPool().query<PlotRow>(
        `
          select id, name, area_ha, sigpac_reference, latitude, longitude,
                 irrigation_type, olive_tree_count, notes, created_at, updated_at
          from plots
          where farm_id = $1 and holding_id = $2 and active = true
          order by created_at asc, id asc
        `,
        [request.params.farmId, access.holdingId],
      );

      return { items: result.rows.map(serializePlot) };
    },
  );

  app.post<{ Params: FarmParams; Body: CreatePlotBody }>(
    '/api/v1/farms/:farmId/plots',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 120 },
            areaHa: { type: 'number', minimum: 0, maximum: 1000000 },
            sigpacReference: { type: 'string', maxLength: 300 },
            latitude: { type: 'number', minimum: -90, maximum: 90 },
            longitude: { type: 'number', minimum: -180, maximum: 180 },
            irrigationType: { type: 'string', enum: ['dryland', 'irrigated', 'mixed', 'unknown'] },
            oliveTreeCount: { type: 'integer', minimum: 0, maximum: 100000000 },
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

      const access = await getFarmAccess(session.user.id, request.params.farmId);
      if (!access) {
        return reply.code(404).send(apiError(request, 'FARM_NOT_FOUND', 'Farm not found'));
      }
      if (!canWrite(access.role)) {
        return reply.code(403).send(apiError(request, 'WRITE_FORBIDDEN', 'Write access required'));
      }

      const name = request.body.name.trim();
      if (!name) {
        return reply.code(400).send(apiError(request, 'INVALID_PLOT_NAME', 'Plot name is required'));
      }
      if ((request.body.latitude == null) !== (request.body.longitude == null)) {
        return reply.code(400).send(apiError(request, 'INCOMPLETE_PLOT_LOCATION', 'Latitude and longitude must be provided together'));
      }

      const id = randomUUID();
      const row = (
        await getPool().query<PlotRow>(
          `
            insert into plots (
              id, holding_id, farm_id, name, area_ha, sigpac_reference,
              latitude, longitude, irrigation_type, olive_tree_count, notes
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            returning id, name, area_ha, sigpac_reference, latitude, longitude,
                      irrigation_type, olive_tree_count, notes, created_at, updated_at
          `,
          [
            id,
            access.holdingId,
            request.params.farmId,
            name,
            request.body.areaHa ?? null,
            request.body.sigpacReference?.trim() || null,
            request.body.latitude ?? null,
            request.body.longitude ?? null,
            request.body.irrigationType ?? null,
            request.body.oliveTreeCount ?? null,
            request.body.notes?.trim() || null,
          ],
        )
      ).rows[0];

      if (!row) throw new Error('Plot insert returned no row');
      return reply.code(201).send(serializePlot(row));
    },
  );

  app.patch<{ Params: PlotParams; Body: UpdatePlotLocationBody }>(
    '/api/v1/plots/:plotId/location',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['latitude', 'longitude'],
          properties: {
            latitude: { anyOf: [{ type: 'number', minimum: -90, maximum: 90 }, { type: 'null' }] },
            longitude: { anyOf: [{ type: 'number', minimum: -180, maximum: 180 }, { type: 'null' }] },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      if ((request.body.latitude == null) !== (request.body.longitude == null)) {
        return reply.code(400).send(apiError(request, 'INCOMPLETE_PLOT_LOCATION', 'Latitude and longitude must be provided together'));
      }

      const plotLookup = await getPool().query<{ farm_id: string; holding_id: string }>(
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

      const row = (
        await getPool().query<PlotRow>(
          `
            update plots
            set latitude = $1,
                longitude = $2,
                version = version + 1,
                updated_at = now()
            where id = $3 and holding_id = $4 and active = true
            returning id, name, area_ha, sigpac_reference, latitude, longitude,
                      irrigation_type, olive_tree_count, notes, created_at, updated_at
          `,
          [request.body.latitude, request.body.longitude, request.params.plotId, access.holdingId],
        )
      ).rows[0];

      if (!row) {
        return reply.code(404).send(apiError(request, 'PLOT_NOT_FOUND', 'Plot not found'));
      }
      return serializePlot(row);
    },
  );
}
