import type { FastifyInstance } from 'fastify';
import { getCampaignAccess } from './authorization.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

type Params = { campaignId: string };

export function registerCampaignHarvestHistoryAliasRoutes(app: FastifyInstance): void {
  app.get<{ Params: Params }>(
    '/api/v1/campaigns/:campaignId/harvest-history',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const access = await getCampaignAccess(session.user.id, request.params.campaignId);
      if (!access) {
        return reply.code(404).send(apiError(request, 'HOLDING_HARVEST_HISTORY_NOT_FOUND', 'Harvest history not found'));
      }

      reply.header('Cache-Control', 'private, no-store');
      return reply.redirect(`/api/v1/holdings/${access.holdingId}/harvest-history`);
    },
  );
}
