import type { FastifyInstance } from 'fastify';
import { apiError } from './http-errors.ts';
import {
  listRewardValidatorContext,
  RewardPartnerServiceError,
  validateRewardToken,
} from './reward-partner-service.ts';
import { getAuthenticatedSession } from './session.ts';

type ValidateBody = {
  token: string;
};

function sendPartnerError(request: Parameters<typeof apiError>[0], reply: any, error: unknown) {
  if (error instanceof RewardPartnerServiceError) {
    return reply.code(error.status).send(apiError(request, error.code, error.message));
  }
  throw error;
}

export function registerRewardPartnerRoutes(app: FastifyInstance): void {
  app.get('/api/v1/rewards/partner/context', async (request, reply) => {
    const session = await getAuthenticatedSession(request);
    if (!session) {
      return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    }

    return {
      partners: await listRewardValidatorContext(session.user.id),
    };
  });

  app.post<{ Body: ValidateBody }>(
    '/api/v1/rewards/partner/validate',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['token'],
          properties: {
            token: { type: 'string', minLength: 16, maxLength: 512 },
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
        return await validateRewardToken({
          validatorUserId: session.user.id,
          token: request.body.token,
        });
      } catch (error) {
        return sendPartnerError(request, reply, error);
      }
    },
  );
}
