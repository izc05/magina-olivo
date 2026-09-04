import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { awardLoyaltyEvent, collectPendingOlives, getLoyaltySummary } from './loyalty-service.ts';
import { getAuthenticatedSession } from './session.ts';

type CollectBody = {
  idempotencyKey: string;
};

type PlotClaimParams = {
  plotId: string;
};

type PlotClaimRow = {
  plot_id: string;
  holding_id: string;
  role: 'owner' | 'admin' | 'collaborator' | 'viewer';
};

export function registerLoyaltyRoutes(app: FastifyInstance): void {
  app.get('/api/v1/loyalty/me', async (request, reply) => {
    const session = await getAuthenticatedSession(request);
    if (!session) {
      return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    }

    return getLoyaltySummary(session.user.id);
  });

  app.post<{ Body: CollectBody }>(
    '/api/v1/loyalty/collect',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['idempotencyKey'],
          properties: {
            idempotencyKey: { type: 'string', minLength: 8, maxLength: 160 },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      return collectPendingOlives(session.user.id, request.body.idempotencyKey);
    },
  );

  app.post<{ Params: PlotClaimParams }>(
    '/api/v1/loyalty/claims/plots/:plotId/first-registration',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const plot = (
        await getPool().query<PlotClaimRow>(
          `select p.id as plot_id, p.holding_id, hm.role
           from plots p
           join holding_members hm
             on hm.holding_id = p.holding_id
            and hm.user_id = $2
            and hm.status = 'active'
           where p.id = $1 and p.active = true
           limit 1`,
          [request.params.plotId, session.user.id],
        )
      ).rows[0];

      if (!plot) {
        return reply.code(404).send(apiError(request, 'PLOT_NOT_FOUND', 'Plot not found'));
      }
      if (!['owner', 'admin', 'collaborator'].includes(plot.role)) {
        return reply.code(403).send(apiError(request, 'WRITE_FORBIDDEN', 'Write access required'));
      }

      return awardLoyaltyEvent({
        userId: session.user.id,
        eventType: 'parcel.first_created',
        idempotencyKey: `parcel.first_created:${plot.plot_id}`,
        sourceType: 'plot',
        sourceId: plot.plot_id,
        metadata: {
          holdingId: plot.holding_id,
        },
      });
    },
  );
}
