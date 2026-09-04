import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { canWrite, getPlotAccess } from './authorization.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { bboxesIntersect, expandSigpacBbox, geometryBbox } from './plot-sigpac-geometry.ts';
import type { GeoJsonPolygon } from './plot-boundary-geometry.ts';
import {
  fetchSigpacRecintoById,
  fetchSigpacRecintos,
  validateSigpacBbox,
  validateSigpacFeatureId,
  type SigpacGeometry,
  type SigpacRecinto,
} from './sigpac-client.ts';
import { getAuthenticatedSession } from './session.ts';

type PlotParams = { plotId: string };
type SaveAssociationsBody = { recintoIds: string[] };
type PlotBoundaryRow = {
  boundary_geojson: GeoJsonPolygon | null;
  boundary_source: string | null;
  cadastral_reference: string | null;
};
type AssociationRow = {
  id: string;
  sigpac_recinto_id: string;
  provincia: number | null;
  municipio: number | null;
  agregado: number | null;
  zona: number | null;
  poligono: number | null;
  parcela: number | null;
  recinto: number | null;
  uso_sigpac: string | null;
  surface_m2: string | null;
  geometry_geojson: SigpacGeometry;
  source_checked_at: Date;
  created_at: Date;
  updated_at: Date;
};

const MAX_ASSOCIATED_RECINTOS = 20;

function serializeAssociation(row: AssociationRow) {
  return {
    id: row.id,
    sigpacRecintoId: row.sigpac_recinto_id,
    provincia: row.provincia,
    municipio: row.municipio,
    agregado: row.agregado,
    zona: row.zona,
    poligono: row.poligono,
    parcela: row.parcela,
    recinto: row.recinto,
    usoSigpac: row.uso_sigpac,
    surfaceM2: row.surface_m2,
    geometry: row.geometry_geojson,
    sourceCheckedAt: row.source_checked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadCatastroPlotBoundary(plotId: string, holdingId: string): Promise<PlotBoundaryRow | null> {
  const result = await getPool().query<PlotBoundaryRow>(
    `select boundary_geojson, boundary_source, cadastral_reference
     from plots
     where id = $1 and holding_id = $2 and active = true`,
    [plotId, holdingId],
  );
  return result.rows[0] ?? null;
}

function candidateFromRecinto(recinto: SigpacRecinto, plotBbox: NonNullable<ReturnType<typeof geometryBbox>>) {
  const recintoBbox = geometryBbox(recinto.geometry);
  return {
    id: recinto.id,
    provincia: recinto.provincia,
    municipio: recinto.municipio,
    agregado: recinto.agregado,
    zona: recinto.zona,
    poligono: recinto.poligono,
    parcela: recinto.parcela,
    recinto: recinto.recinto,
    usoSigpac: recinto.usoSigpac,
    surfaceM2: recinto.surfaceM2,
    geometry: recinto.geometry,
    classification: recintoBbox && bboxesIntersect(plotBbox, recintoBbox)
      ? 'likely-overlap' as const
      : 'nearby' as const,
    classificationMethod: 'bbox' as const,
  };
}

export function registerPlotSigpacAssociationRoutes(app: FastifyInstance): void {
  app.get<{ Params: PlotParams }>(
    '/api/v1/plots/:plotId/sigpac-candidates',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const access = await getPlotAccess(session.user.id, request.params.plotId);
      if (!access) {
        return reply.code(404).send(apiError(request, 'PLOT_NOT_FOUND', 'Plot not found'));
      }

      const plot = await loadCatastroPlotBoundary(request.params.plotId, access.holdingId);
      if (!plot) {
        return reply.code(404).send(apiError(request, 'PLOT_NOT_FOUND', 'Plot not found'));
      }
      if (plot.boundary_source !== 'catastro' || !plot.cadastral_reference || !plot.boundary_geojson) {
        return reply.code(409).send(apiError(
          request,
          'CATASTRO_BOUNDARY_REQUIRED',
          'La parcela necesita un perímetro Catastro verificado antes de buscar recintos SIGPAC asociados',
        ));
      }

      const plotBbox = geometryBbox(plot.boundary_geojson);
      const searchBbox = plotBbox ? expandSigpacBbox(plotBbox) : null;
      if (!plotBbox || !searchBbox || validateSigpacBbox(searchBbox)) {
        return reply.code(409).send(apiError(
          request,
          'PLOT_BOUNDARY_NOT_SEARCHABLE',
          'El perímetro de la parcela no permite una búsqueda SIGPAC acotada en esta versión',
        ));
      }

      try {
        const recintos = await fetchSigpacRecintos(searchBbox);
        return {
          items: recintos.map((recinto) => candidateFromRecinto(recinto, plotBbox)),
          relation: {
            claim: 'candidate-only',
            method: 'bbox',
            message: 'El solape indicado es orientativo. Catastro y SIGPAC son fuentes diferentes y la asociación requiere confirmación del agricultor.',
          },
          source: {
            provider: 'FEGA SIGPAC',
            collection: 'recintos',
            checkedAt: new Date().toISOString(),
          },
        };
      } catch (error) {
        request.log.warn({ err: error, plotId: request.params.plotId }, 'SIGPAC candidate query failed');
        return reply.code(502).send(apiError(
          request,
          'SIGPAC_UNAVAILABLE',
          'SIGPAC no está disponible temporalmente. La parcela Catastro sigue disponible.',
        ));
      }
    },
  );

  app.get<{ Params: PlotParams }>(
    '/api/v1/plots/:plotId/sigpac-recintos',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const access = await getPlotAccess(session.user.id, request.params.plotId);
      if (!access) {
        return reply.code(404).send(apiError(request, 'PLOT_NOT_FOUND', 'Plot not found'));
      }

      const result = await getPool().query<AssociationRow>(
        `select id, sigpac_recinto_id, provincia, municipio, agregado, zona,
                poligono, parcela, recinto, uso_sigpac, surface_m2,
                geometry_geojson, source_checked_at, created_at, updated_at
         from plot_sigpac_recintos
         where holding_id = $1 and plot_id = $2 and active = true
         order by poligono nulls last, parcela nulls last, recinto nulls last, sigpac_recinto_id`,
        [access.holdingId, request.params.plotId],
      );

      return {
        items: result.rows.map(serializeAssociation),
        source: 'verified-sigpac-associations',
      };
    },
  );

  app.put<{ Params: PlotParams; Body: SaveAssociationsBody }>(
    '/api/v1/plots/:plotId/sigpac-recintos',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['recintoIds'],
          properties: {
            recintoIds: {
              type: 'array',
              maxItems: MAX_ASSOCIATED_RECINTOS,
              uniqueItems: true,
              items: { type: 'string', pattern: '^[0-9]{1,20}$' },
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

      const access = await getPlotAccess(session.user.id, request.params.plotId);
      if (!access) {
        return reply.code(404).send(apiError(request, 'PLOT_NOT_FOUND', 'Plot not found'));
      }
      if (!canWrite(access.role)) {
        return reply.code(403).send(apiError(request, 'WRITE_FORBIDDEN', 'Write access required'));
      }

      const plot = await loadCatastroPlotBoundary(request.params.plotId, access.holdingId);
      if (!plot || plot.boundary_source !== 'catastro' || !plot.cadastral_reference || !plot.boundary_geojson) {
        return reply.code(409).send(apiError(
          request,
          'CATASTRO_BOUNDARY_REQUIRED',
          'La asociación SIGPAC requiere conservar un perímetro Catastro verificado',
        ));
      }

      const recintoIds = request.body.recintoIds.map((value) => value.trim());
      if (recintoIds.length > MAX_ASSOCIATED_RECINTOS || recintoIds.some((id) => !validateSigpacFeatureId(id))) {
        return reply.code(400).send(apiError(request, 'INVALID_SIGPAC_RECINTO_SET', 'Invalid SIGPAC recinto set'));
      }

      const verified: SigpacRecinto[] = [];
      for (const recintoId of recintoIds) {
        try {
          verified.push(await fetchSigpacRecintoById(recintoId));
        } catch (error) {
          request.log.warn({ err: error, plotId: request.params.plotId, recintoId }, 'SIGPAC association verification failed');
          return reply.code(502).send(apiError(
            request,
            'SIGPAC_VERIFICATION_FAILED',
            `No se ha podido verificar el recinto SIGPAC ${recintoId}. No se ha modificado ninguna asociación.`,
          ));
        }
      }

      const client = await getPool().connect();
      const checkedAt = new Date();
      try {
        await client.query('begin');
        await client.query(
          `update plot_sigpac_recintos
           set active = false, updated_at = now()
           where holding_id = $1 and plot_id = $2 and active = true`,
          [access.holdingId, request.params.plotId],
        );

        for (const recinto of verified) {
          await client.query(
            `insert into plot_sigpac_recintos (
               id, holding_id, plot_id, sigpac_recinto_id,
               provincia, municipio, agregado, zona, poligono, parcela, recinto,
               uso_sigpac, surface_m2, geometry_geojson, source_checked_at,
               active, created_by
             ) values (
               $1, $2, $3, $4,
               $5, $6, $7, $8, $9, $10, $11,
               $12, $13, $14::jsonb, $15,
               true, $16
             )`,
            [
              randomUUID(),
              access.holdingId,
              request.params.plotId,
              recinto.id,
              recinto.provincia,
              recinto.municipio,
              recinto.agregado,
              recinto.zona,
              recinto.poligono,
              recinto.parcela,
              recinto.recinto,
              recinto.usoSigpac,
              recinto.surfaceM2,
              JSON.stringify(recinto.geometry),
              checkedAt,
              session.user.id,
            ],
          );
        }

        await client.query('commit');
      } catch (error) {
        await client.query('rollback');
        request.log.error({ err: error, plotId: request.params.plotId }, 'SIGPAC association transaction failed');
        return reply.code(409).send(apiError(
          request,
          'SIGPAC_ASSOCIATION_CONFLICT',
          'No se han podido guardar las asociaciones SIGPAC. La parcela Catastro no se ha modificado.',
        ));
      } finally {
        client.release();
      }

      const result = await getPool().query<AssociationRow>(
        `select id, sigpac_recinto_id, provincia, municipio, agregado, zona,
                poligono, parcela, recinto, uso_sigpac, surface_m2,
                geometry_geojson, source_checked_at, created_at, updated_at
         from plot_sigpac_recintos
         where holding_id = $1 and plot_id = $2 and active = true
         order by poligono nulls last, parcela nulls last, recinto nulls last, sigpac_recinto_id`,
        [access.holdingId, request.params.plotId],
      );

      return {
        items: result.rows.map(serializeAssociation),
        verifiedAt: checkedAt,
        catastroBoundaryPreserved: true,
      };
    },
  );
}
