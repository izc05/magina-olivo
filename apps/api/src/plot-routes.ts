import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { canWrite, getFarmAccess } from './authorization.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { type BoundarySource, type GeoJsonPolygon, validateBoundary } from './plot-boundary-geometry.ts';
import { getAuthenticatedSession } from './session.ts';

type FarmParams = { farmId: string };
type PlotParams = { plotId: string };
type EditableBoundarySource = Exclude<BoundarySource, 'sigpac' | 'catastro'>;
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
type UpdatePlotBoundaryBody = {
  boundary: GeoJsonPolygon | null;
  source: EditableBoundarySource | null;
};

type PlotRow = {
  id: string;
  name: string;
  area_ha: string | null;
  sigpac_reference: string | null;
  latitude: number | null;
  longitude: number | null;
  boundary_geojson: GeoJsonPolygon | null;
  boundary_area_ha: string | null;
  boundary_source: BoundarySource | null;
  boundary_updated_at: Date | null;
  boundary_external_id: string | null;
  boundary_source_checked_at: Date | null;
  irrigation_type: string | null;
  olive_tree_count: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

const PLOT_COLUMNS = `
  id, name, area_ha, sigpac_reference, latitude, longitude,
  boundary_geojson, boundary_area_ha, boundary_source, boundary_updated_at,
  boundary_external_id, boundary_source_checked_at,
  irrigation_type, olive_tree_count, notes, created_at, updated_at
`;

function serializePlot(row: PlotRow) {
  return {
    id: row.id,
    name: row.name,
    areaHa: row.area_ha,
    sigpacReference: row.sigpac_reference,
    latitude: row.latitude,
    longitude: row.longitude,
    boundaryGeoJson: row.boundary_geojson,
    boundaryAreaHa: row.boundary_area_ha,
    boundarySource: row.boundary_source,
    boundaryUpdatedAt: row.boundary_updated_at,
    boundaryExternalId: row.boundary_external_id,
    boundarySourceCheckedAt: row.boundary_source_checked_at,
    irrigationType: row.irrigation_type,
    oliveTreeCount: row.olive_tree_count,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getWritablePlotAccess(userId: string, plotId: string) {
  const plotLookup = await getPool().query<{ farm_id: string; holding_id: string }>(
    'select farm_id, holding_id from plots where id = $1 and active = true',
    [plotId],
  );
  const plot = plotLookup.rows[0];
  if (!plot) return null;

  const access = await getFarmAccess(userId, plot.farm_id);
  if (!access || access.holdingId !== plot.holding_id) return null;
  return { plot, access };
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
        `select ${PLOT_COLUMNS}
         from plots
         where farm_id = $1 and holding_id = $2 and active = true
         order by created_at asc, id asc`,
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
          `insert into plots (
             id, holding_id, farm_id, name, area_ha, sigpac_reference,
             latitude, longitude, irrigation_type, olive_tree_count, notes
           )
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           returning ${PLOT_COLUMNS}`,
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

      const resolved = await getWritablePlotAccess(session.user.id, request.params.plotId);
      if (!resolved) {
        return reply.code(404).send(apiError(request, 'PLOT_NOT_FOUND', 'Plot not found'));
      }
      if (!canWrite(resolved.access.role)) {
        return reply.code(403).send(apiError(request, 'WRITE_FORBIDDEN', 'Write access required'));
      }

      const row = (
        await getPool().query<PlotRow>(
          `update plots
           set latitude = $1,
               longitude = $2,
               version = version + 1,
               updated_at = now()
           where id = $3 and holding_id = $4 and active = true
           returning ${PLOT_COLUMNS}`,
          [request.body.latitude, request.body.longitude, request.params.plotId, resolved.access.holdingId],
        )
      ).rows[0];

      if (!row) {
        return reply.code(404).send(apiError(request, 'PLOT_NOT_FOUND', 'Plot not found'));
      }
      return serializePlot(row);
    },
  );

  app.patch<{ Params: PlotParams; Body: UpdatePlotBoundaryBody }>(
    '/api/v1/plots/:plotId/boundary',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['boundary', 'source'],
          properties: {
            boundary: {
              anyOf: [
                {
                  type: 'object',
                  additionalProperties: false,
                  required: ['type', 'coordinates'],
                  properties: {
                    type: { const: 'Polygon' },
                    coordinates: {
                      type: 'array',
                      minItems: 1,
                      maxItems: 1,
                      items: {
                        type: 'array',
                        minItems: 4,
                        maxItems: 501,
                        items: {
                          type: 'array',
                          minItems: 2,
                          maxItems: 2,
                          items: { type: 'number' },
                        },
                      },
                    },
                  },
                },
                { type: 'null' },
              ],
            },
            source: {
              anyOf: [
                { type: 'string', enum: ['manual_map', 'manual_gps', 'imported'] },
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

      if ((request.body.boundary == null) !== (request.body.source == null)) {
        return reply.code(400).send(apiError(request, 'INCOMPLETE_PLOT_BOUNDARY', 'Boundary and source must be provided together'));
      }

      const resolved = await getWritablePlotAccess(session.user.id, request.params.plotId);
      if (!resolved) {
        return reply.code(404).send(apiError(request, 'PLOT_NOT_FOUND', 'Plot not found'));
      }
      if (!canWrite(resolved.access.role)) {
        return reply.code(403).send(apiError(request, 'WRITE_FORBIDDEN', 'Write access required'));
      }

      let areaHa: number | null = null;
      if (request.body.boundary) {
        const validation = validateBoundary(request.body.boundary);
        if (!validation.ok) {
          return reply.code(400).send(apiError(request, 'INVALID_PLOT_BOUNDARY', validation.message));
        }
        areaHa = Number(validation.areaHa.toFixed(4));
      }

      const row = (
        await getPool().query<PlotRow>(
          `update plots
           set boundary_geojson = $1::jsonb,
               boundary_area_ha = $2,
               boundary_source = $3,
               boundary_updated_at = case when $1::jsonb is null then null else now() end,
               boundary_external_id = null,
               boundary_source_checked_at = null,
               version = version + 1,
               updated_at = now()
           where id = $4 and holding_id = $5 and active = true
           returning ${PLOT_COLUMNS}`,
          [
            request.body.boundary == null ? null : JSON.stringify(request.body.boundary),
            areaHa,
            request.body.source,
            request.params.plotId,
            resolved.access.holdingId,
          ],
        )
      ).rows[0];

      if (!row) {
        return reply.code(404).send(apiError(request, 'PLOT_NOT_FOUND', 'Plot not found'));
      }
      return serializePlot(row);
    },
  );
}
