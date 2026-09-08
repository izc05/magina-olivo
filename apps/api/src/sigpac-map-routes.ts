import type { FastifyInstance } from 'fastify';
import { canWrite, getFarmAccess } from './authorization.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { validateBoundary, type GeoJsonBoundary } from './plot-boundary-geometry.ts';
import {
  fetchSigpacRecintoById,
  fetchSigpacRecintos,
  validateSigpacBbox,
  validateSigpacFeatureId,
  type SigpacBbox,
  type SigpacGeometry,
  type SigpacRecinto,
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

function normalizeOfficialBoundary(geometry: SigpacGeometry): GeoJsonBoundary | null {
  if (geometry.type === 'Polygon') {
    if (!Array.isArray(geometry.coordinates)) return null;
    return { type: 'Polygon', coordinates: geometry.coordinates as number[][][] };
  }
  if (!Array.isArray(geometry.coordinates)) return null;
  return { type: 'MultiPolygon', coordinates: geometry.coordinates as number[][][][] };
}

function sigpacReference(recinto: SigpacRecinto): string | null {
  const parts = [recinto.provincia, recinto.municipio, recinto.poligono, recinto.parcela, recinto.recinto];
  if (parts.some((value) => value == null)) return null;
  return `${recinto.provincia}:${recinto.municipio}:${recinto.poligono}:${recinto.parcela}:${recinto.recinto}`;
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

      const boundary = normalizeOfficialBoundary(official.geometry);
      if (!boundary) {
        return reply.code(409).send(apiError(request, 'SIGPAC_GEOMETRY_INVALID', 'SIGPAC ha devuelto una geometría no reconocible'));
      }
      const validation = validateBoundary(boundary);
      if (!validation.ok) {
        return reply.code(409).send(apiError(request, 'SIGPAC_GEOMETRY_INVALID', 'La geometría oficial no supera la validación privada de Mágina Olivo'));
      }

      const areaHa = Number(validation.areaHa.toFixed(4));
      const checkedAt = new Date();
      const reference = sigpacReference(official);
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query('begin');
        await client.query(
          `insert into plot_official_boundary_sources (
             plot_id, source, external_id, reference, geometry_geojson, calculated_area_ha,
             provider_area_m2, provider, dataset, service, source_version, checked_at, metadata_json
           ) values ($1, 'sigpac', $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
           on conflict (plot_id, source) do update set
             external_id = excluded.external_id,
             reference = excluded.reference,
             geometry_geojson = excluded.geometry_geojson,
             calculated_area_ha = excluded.calculated_area_ha,
             provider_area_m2 = excluded.provider_area_m2,
             provider = excluded.provider,
             dataset = excluded.dataset,
             service = excluded.service,
             source_version = excluded.source_version,
             checked_at = excluded.checked_at,
             metadata_json = excluded.metadata_json,
             updated_at = now()`,
          [
            request.params.plotId,
            official.id,
            reference,
            JSON.stringify(boundary),
            areaHa,
            official.surfaceM2,
            'FEGA SIGPAC',
            'SIGPAC recintos',
            'OGC API Features',
            'vigente',
            checkedAt,
            JSON.stringify({
              provincia: official.provincia,
              municipio: official.municipio,
              agregado: official.agregado,
              zona: official.zona,
              poligono: official.poligono,
              parcela: official.parcela,
              recinto: official.recinto,
              usoSigpac: official.usoSigpac,
              geometryType: boundary.type,
            }),
          ],
        );

        const updated = await client.query<{
          id: string;
          sigpac_reference: string | null;
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
               sigpac_reference = coalesce($5, sigpac_reference),
               version = version + 1,
               updated_at = now()
           where id = $6 and holding_id = $7 and active = true
           returning id, sigpac_reference, boundary_area_ha, boundary_external_id, boundary_source_checked_at`,
          [JSON.stringify(boundary), areaHa, official.id, checkedAt, reference, request.params.plotId, access.holdingId],
        );
        const row = updated.rows[0];
        if (!row) throw new Error('Plot disappeared during SIGPAC import');
        await client.query('commit');

        return {
          id: row.id,
          sigpacReference: row.sigpac_reference,
          boundaryAreaHa: row.boundary_area_ha,
          boundarySource: 'sigpac' as const,
          boundaryExternalId: row.boundary_external_id,
          boundarySourceCheckedAt: row.boundary_source_checked_at,
          geometryType: boundary.type,
          geometryStats: {
            polygons: validation.polygons,
            rings: validation.rings,
            positions: validation.positions,
          },
          sigpac: {
            id: official.id,
            provincia: official.provincia,
            municipio: official.municipio,
            poligono: official.poligono,
            parcela: official.parcela,
            recinto: official.recinto,
          },
        };
      } catch (error) {
        await client.query('rollback');
        request.log.error({ err: error, recintoId: request.body.recintoId }, 'SIGPAC import transaction failed');
        return reply.code(500).send(apiError(request, 'SIGPAC_IMPORT_FAILED', 'No se ha podido guardar el recinto verificado'));
      } finally {
        client.release();
      }
    },
  );
}
