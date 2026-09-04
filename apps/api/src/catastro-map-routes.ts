import type { FastifyInstance } from 'fastify';
import { canWrite, getFarmAccess } from './authorization.ts';
import {
  fetchCatastroParcelByReference,
  fetchCatastroParcels,
  validateCadastralReference,
  validateCatastroBbox,
  type CatastroBbox,
} from './catastro-client.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { validateBoundary, type GeoJsonPolygon } from './plot-boundary-geometry.ts';
import { getAuthenticatedSession } from './session.ts';

type CatastroQuery = {
  minLon?: string | number;
  minLat?: string | number;
  maxLon?: string | number;
  maxLat?: string | number;
};

type ReferenceParams = { reference: string };
type PlotParams = { plotId: string };
type ImportCatastroBody = { cadastralReference: string };

function toNumber(value: string | number | undefined): number {
  return typeof value === 'number' ? value : Number(value);
}

function sourceMetadata() {
  return {
    provider: 'Dirección General del Catastro',
    dataset: 'INSPIRE Cadastral Parcel (CP)',
    service: 'WFS',
    status: 'continuously-updated',
    checkedAt: new Date().toISOString(),
  };
}

function simplePolygon(geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] }): GeoJsonPolygon | null {
  if (geometry.type !== 'Polygon') return null;
  const coordinates = geometry.coordinates as number[][][];
  if (coordinates.length !== 1 || !Array.isArray(coordinates[0]) || coordinates[0].length < 4) return null;
  return { type: 'Polygon', coordinates };
}

export function registerCatastroMapRoutes(app: FastifyInstance): void {
  app.get<{ Querystring: CatastroQuery }>(
    '/api/v1/maps/catastro/parcelas',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const bbox: CatastroBbox = {
        minLon: toNumber(request.query.minLon),
        minLat: toNumber(request.query.minLat),
        maxLon: toNumber(request.query.maxLon),
        maxLat: toNumber(request.query.maxLat),
      };
      const validation = validateCatastroBbox(bbox);
      if (validation) {
        return reply.code(400).send(apiError(request, 'INVALID_CATASTRO_BBOX', validation));
      }

      try {
        const items = await fetchCatastroParcels(bbox);
        reply.header('cache-control', 'private, max-age=300');
        return { items, source: sourceMetadata() };
      } catch (error) {
        request.log.warn({ err: error }, 'Catastro INSPIRE parcel query failed');
        return reply.code(502).send(apiError(request, 'CATASTRO_UNAVAILABLE', 'Catastro no está disponible temporalmente'));
      }
    },
  );

  app.get<{ Params: ReferenceParams }>(
    '/api/v1/maps/catastro/parcelas/by-reference/:reference',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const reference = request.params.reference.trim().toUpperCase();
      if (!validateCadastralReference(reference)) {
        return reply.code(400).send(apiError(request, 'INVALID_CADASTRAL_REFERENCE', 'La referencia catastral debe tener 14 caracteres alfanuméricos'));
      }

      try {
        const item = await fetchCatastroParcelByReference(reference);
        reply.header('cache-control', 'private, max-age=300');
        return { item, source: sourceMetadata() };
      } catch (error) {
        request.log.warn({ err: error, cadastralReference: reference }, 'Catastro stored query failed');
        return reply.code(502).send(apiError(request, 'CATASTRO_UNAVAILABLE', 'No se ha podido consultar esa referencia en Catastro'));
      }
    },
  );

  app.post<{ Params: PlotParams; Body: ImportCatastroBody }>(
    '/api/v1/plots/:plotId/import-catastro',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['cadastralReference'],
          properties: {
            cadastralReference: { type: 'string', pattern: '^[A-Za-z0-9]{14}$' },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }
      const reference = request.body.cadastralReference.trim().toUpperCase();
      if (!validateCadastralReference(reference)) {
        return reply.code(400).send(apiError(request, 'INVALID_CADASTRAL_REFERENCE', 'Invalid cadastral reference'));
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
        official = await fetchCatastroParcelByReference(reference);
      } catch (error) {
        request.log.warn({ err: error, cadastralReference: reference }, 'Catastro verified import failed');
        return reply.code(502).send(apiError(request, 'CATASTRO_UNAVAILABLE', 'No se ha podido verificar la parcela en Catastro'));
      }

      const boundary = simplePolygon(official.geometry);
      if (!boundary) {
        return reply.code(409).send(apiError(request, 'CATASTRO_GEOMETRY_UNSUPPORTED', 'La parcela catastral tiene una geometría compleja no importable en esta versión'));
      }
      const validation = validateBoundary(boundary);
      if (!validation.ok) {
        return reply.code(409).send(apiError(request, 'CATASTRO_GEOMETRY_INVALID', 'La geometría oficial no supera la validación privada de Mágina Olivo'));
      }

      const areaHa = Number(validation.areaHa.toFixed(4));
      const checkedAt = new Date();
      const updated = await getPool().query<{
        id: string;
        cadastral_reference: string | null;
        boundary_area_ha: string | null;
        boundary_external_id: string | null;
        boundary_source_checked_at: Date | null;
      }>(
        `update plots
         set boundary_geojson = $1::jsonb,
             boundary_area_ha = $2,
             boundary_source = 'catastro',
             boundary_external_id = $3,
             boundary_updated_at = $4,
             boundary_source_checked_at = $4,
             cadastral_reference = $3,
             version = version + 1,
             updated_at = now()
         where id = $5 and holding_id = $6 and active = true
         returning id, cadastral_reference, boundary_area_ha, boundary_external_id, boundary_source_checked_at`,
        [JSON.stringify(boundary), areaHa, official.nationalCadastralReference, checkedAt, request.params.plotId, access.holdingId],
      );
      const row = updated.rows[0];
      if (!row) {
        return reply.code(404).send(apiError(request, 'PLOT_NOT_FOUND', 'Plot not found'));
      }

      return {
        id: row.id,
        cadastralReference: row.cadastral_reference,
        boundaryAreaHa: row.boundary_area_ha,
        boundarySource: 'catastro' as const,
        boundaryExternalId: row.boundary_external_id,
        boundarySourceCheckedAt: row.boundary_source_checked_at,
        catastro: {
          nationalCadastralReference: official.nationalCadastralReference,
          label: official.label,
          areaM2: official.areaM2,
          beginLifespanVersion: official.beginLifespanVersion,
        },
      };
    },
  );
}
