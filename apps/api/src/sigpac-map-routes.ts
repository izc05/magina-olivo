import type { FastifyInstance } from 'fastify';
import { canWrite, getFarmAccess } from './authorization.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { validateBoundary, type GeoJsonPolygon } from './plot-boundary-geometry.ts';
import {
  fetchSigpacRecintoById,
  fetchSigpacRecintos,
  validateSigpacBbox,
  validateSigpacFeatureId,
  type SigpacBbox,
  type SigpacGeometry,
} from './sigpac-client.ts';
import { getAuthenticatedSession } from './session.ts';

type SigpacQuery = {
  minLon?: string | number;
  minLat?: string | number;
  maxLon?: string | number;
  maxLat?: string | number;
};

type PlotParams = { plotId: string };
type ImportSigpacBody = { recintoId: string };

function toNumber(value: string | number | undefined): number {
  return typeof value === 'number' ? value : Number(value);
}

function simplePolygon(geometry: SigpacGeometry): GeoJsonPolygon | null {
  if (geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length !== 1) return null;
  const ring = geometry.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4) return null;

  const normalizedRing: number[][] = [];
  for (const position of ring) {
    if (!Array.isArray(position) || position.length !== 2) return null;
    const longitude = Number(position[0]);
    const latitude = Number(position[1]);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
    normalizedRing.push([longitude, latitude]);
  }
  return { type: 'Polygon', coordinates: [normalizedRing] };
}

export function registerSigpacMapRoutes(app: FastifyInstance): void {
  app.get<{ Querystring: SigpacQuery }>(
    '/api/v1/maps/sigpac/recintos',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const bbox: SigpacBbox = {
        minLon: toNumber(request.query.minLon),
        minLat: toNumber(request.query.minLat),
        maxLon: toNumber(request.query.maxLon),
        maxLat: toNumber(request.query.maxLat),
      };
      const validation = validateSigpacBbox(bbox);
      if (validation) {
        return reply.code(400).send(apiError(request, 'INVALID_SIGPAC_BBOX', validation));
      }

      try {
        const items = await fetchSigpacRecintos(bbox);
        reply.header('cache-control', 'private, max-age=300');
        return {
          items,
          source: {
            provider: 'FEGA SIGPAC',
            collection: 'recintos',
            campaign: 'vigente',
            license: 'CC BY 4.0',
            checkedAt: new Date().toISOString(),
          },
        };
      } catch (error) {
        request.log.warn({ err: error }, 'SIGPAC recinto query failed');
        return reply.code(502).send(apiError(request, 'SIGPAC_UNAVAILABLE', 'SIGPAC no está disponible temporalmente'));
      }
    },
  );

  app.post<{ Params: PlotParams; Body: ImportSigpacBody }>(
    '/api/v1/plots/:plotId/import-sigpac',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['recintoId'],
          properties: {
            recintoId: { type: 'string', pattern: '^[0-9]{1,20}$' },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }
      if (!validateSigpacFeatureId(request.body.recintoId)) {
        return reply.code(400).send(apiError(request, 'INVALID_SIGPAC_FEATURE_ID', 'Invalid SIGPAC recinto id'));
      }

      const plotResult = await getPool().query<{ farm_id: string; holding_id: string }>(
        'select farm_id, holding_id from plots where id = $1 and active = true',
        [request.params.plotId],
      );
      const plot = plotResult.rows[0];
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

      let official;
      try {
        official = await fetchSigpacRecintoById(request.body.recintoId);
      } catch (error) {
        request.log.warn({ err: error, recintoId: request.body.recintoId }, 'SIGPAC verified import failed');
        return reply.code(502).send(apiError(request, 'SIGPAC_UNAVAILABLE', 'No se ha podido verificar el recinto en SIGPAC'));
      }

      const boundary = simplePolygon(official.geometry);
      if (!boundary) {
        return reply.code(409).send(apiError(request, 'SIGPAC_GEOMETRY_UNSUPPORTED', 'El recinto SIGPAC tiene una geometría compleja no importable en esta versión'));
      }
      const validation = validateBoundary(boundary);
      if (!validation.ok) {
        return reply.code(409).send(apiError(request, 'SIGPAC_GEOMETRY_INVALID', 'La geometría oficial no supera la validación privada de Mágina Olivo'));
      }

      const areaHa = Number(validation.areaHa.toFixed(4));
      const checkedAt = new Date();
      const updated = await getPool().query<{
        id: string;
        boundary_area_ha: string | null;
        boundary_external_id: string | null;
        boundary_source_checked_at: Date | null;
      }>(
        `update plots
         set boundary_geojson = $1::jsonb,
             boundary_area_ha = $2,
             boundary_source = 'sigpac',
             boundary_external_id = $3,
             boundary_updated_at = $4,
             boundary_source_checked_at = $4,
             version = version + 1,
             updated_at = now()
         where id = $5 and holding_id = $6 and active = true
         returning id, boundary_area_ha, boundary_external_id, boundary_source_checked_at`,
        [JSON.stringify(boundary), areaHa, official.id, checkedAt, request.params.plotId, access.holdingId],
      );
      const row = updated.rows[0];
      if (!row) {
        return reply.code(404).send(apiError(request, 'PLOT_NOT_FOUND', 'Plot not found'));
      }

      return {
        id: row.id,
        boundaryAreaHa: row.boundary_area_ha,
        boundarySource: 'sigpac' as const,
        boundaryExternalId: row.boundary_external_id,
        boundarySourceCheckedAt: row.boundary_source_checked_at,
        sigpac: {
          id: official.id,
          provincia: official.provincia,
          municipio: official.municipio,
          poligono: official.poligono,
          parcela: official.parcela,
          recinto: official.recinto,
        },
      };
    },
  );
}
