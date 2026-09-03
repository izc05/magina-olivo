import type { FastifyInstance } from 'fastify';
import { apiError } from './http-errors.ts';
import { fetchSigpacRecintos, validateSigpacBbox, type SigpacBbox } from './sigpac-client.ts';
import { getAuthenticatedSession } from './session.ts';

type SigpacQuery = {
  minLon?: string | number;
  minLat?: string | number;
  maxLon?: string | number;
  maxLat?: string | number;
};

function toNumber(value: string | number | undefined): number {
  return typeof value === 'number' ? value : Number(value);
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
}
