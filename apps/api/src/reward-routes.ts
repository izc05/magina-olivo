import type { FastifyInstance } from 'fastify';
import { apiError } from './http-errors.ts';
import {
  listRewardCatalog,
  listUserRedemptions,
  redeemReward,
  reissueRedemptionToken,
  RewardServiceError,
} from './reward-service.ts';
import { getAuthenticatedSession } from './session.ts';

type RedeemParams = {
  rewardId: string;
};

type RedeemBody = {
  pickupPointId?: string;
  idempotencyKey: string;
};

type ReissueParams = {
  redemptionId: string;
};

function sendRewardError(request: Parameters<typeof apiError>[0], reply: any, error: unknown) {
  if (error instanceof RewardServiceError) {
    return reply.code(error.status).send(apiError(request, error.code, error.message));
  }
  throw error;
}

export function registerRewardRoutes(app: FastifyInstance): void {
  app.get('/api/v1/rewards', async (request, reply) => {
    const session = await getAuthenticatedSession(request);
    if (!session) {
      return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    }

    return {
      items: await listRewardCatalog(),
    };
  });

  app.get('/api/v1/rewards/redemptions/me', async (request, reply) => {
    const session = await getAuthenticatedSession(request);
    if (!session) {
      return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    }

    return {
      items: await listUserRedemptions(session.user.id),
    };
  });

  app.post<{ Params: RedeemParams; Body: RedeemBody }>(
    '/api/v1/rewards/:rewardId/redeem',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['idempotencyKey'],
          properties: {
            pickupPointId: { type: 'string', minLength: 1, maxLength: 160 },
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

      try {
        const result = await redeemReward({
          userId: session.user.id,
          rewardId: request.params.rewardId,
          pickupPointId: request.body.pickupPointId ?? null,
          idempotencyKey: request.body.idempotencyKey,
        });
        return reply.code(result.duplicate ? 200 : 201).send(result);
      } catch (error) {
        return sendRewardError(request, reply, error);
      }
    },
  );

  app.post<{ Params: ReissueParams }>(
    '/api/v1/rewards/redemptions/:redemptionId/reissue-token',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      try {
        return await reissueRedemptionToken(session.user.id, request.params.redemptionId);
      } catch (error) {
        return sendRewardError(request, reply, error);
      }
    },
  );
}
