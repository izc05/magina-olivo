import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { canWrite, getFarmAccess } from './authorization.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

type FarmParams = { farmId: string };
type PlotParams = { plotId: string };
type BoundarySource = 'manual_map' | 'manual_gps' | 'imported' | 'sigpac' | 'catastro';
type GeoJsonPolygon = {
  type: 'Polygon';
  coordinates: number[][][];
};
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
  source: BoundarySource | null;
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
  irrigation_type: string | null;
  olive_tree_count: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

const PLOT_COLUMNS = `
  id, name, area_ha, sigpac_reference, latitude, longitude,
  boundary_geojson, boundary_area_ha, boundary_source, boundary_updated_at,
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
    irrigationType: row.irrigation_type,
    oliveTreeCount: row.olive_tree_count,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function degreesToRadians(value: number): number {
  return value * Math.PI / 180;
}

function normalizedLongitudeDelta(from: number, to: number): number {
  let delta = degreesToRadians(to - from);
  if (delta > Math.PI) delta -= 2 * Math.PI;
  if (delta < -Math.PI) delta += 2 * Math.PI;
  return delta;
}

function polygonAreaSquareMeters(ring: number[][]): number {
  const earthRadiusM = 6_378_137;
  let sum = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const current = ring[index];
    const next = ring[index + 1];
    if (!current || !next) continue;
    const [lon1, lat1] = current;
    const [lon2, lat2] = next;
    if (lon1 == null || lat1 == null || lon2 == null || lat2 == null) continue;
    const deltaLon = normalizedLongitudeDelta(lon1, lon2);
    sum += deltaLon * (2 + Math.sin(degreesToRadians(lat1)) + Math.sin(degreesToRadians(lat2)));
  }
  return Math.abs(sum) * earthRadiusM * earthRadiusM / 2;
}

function validateBoundary(boundary: GeoJsonPolygon): { ok: true; areaHa: number } | { ok: false; message: string } {
  if (boundary.type !== 'Polygon' || !Array.isArray(boundary.coordinates) || boundary.coordinates.length !== 1) {
    return { ok: false, message: 'Boundary must be a GeoJSON Polygon with one exterior ring' };
  }

  const ring = boundary.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4) {
    return { ok: false, message: 'Boundary must contain at least three vertices and a closing position' };
  }
  if (ring.length > 501) {
    return { ok: false, message: 'Boundary exceeds the V2 limit of 500 vertices' };
  }

  for (const position of ring) {
    if (!Array.isArray(position) || position.length !== 2) {
      return { ok: false, message: 'Each boundary position must contain longitude and latitude' };
    }
    const [longitude, latitude] = position;
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      return { ok: false, message: 'Boundary contains a non-numeric coordinate' };
    }
    if (longitude! < -180 || longitude! > 180 || latitude! < -90 || latitude! > 90) {
      return { ok: false, message: 'Boundary contains coordinates outside WGS84 ranges' };
    }
  }

  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
    return { ok: false, message: 'Boundary ring must be closed' };
  }

  const uniqueVertices = new Set(ring.slice(0, -1).map((position) => `${position[0]},${position[1]}`));
  if (uniqueVertices.size < 3) {
    return { ok: false, message: 'Boundary requires at least three distinct vertices' };
  }

  const areaSquareMeters = polygonAreaSquareMeters(ring);
  if (!Number.isFinite(areaSquareMeters) || areaSquareMeters <= 0) {
    return { ok: false, message: 'Boundary area could not be calculated' };
  }

  return { ok: true, areaHa: areaSquareMeters / 10_000 };
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
                { type: 'string', enum: ['manual_map', 'manual_gps', 'imported', 'sigpac', 'catastro'] },
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
