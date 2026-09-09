import type { FastifyInstance } from 'fastify';
import { getHoldingAccess } from './authorization.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

type CrewMember = {
  id: string;
  holdingId: string;
  name: string;
  phone?: string;
  role: 'operator' | 'capataz' | 'driver';
  active: boolean;
};

type HoldingParams = { holdingId: string };

type CreateCrewBody = {
  name: string;
  phone?: string;
  role?: 'operator' | 'capataz' | 'driver';
};

// In-memory store per holding
const holdingCrews = new Map<string, CrewMember[]>();

export function registerCrewRoutes(app: FastifyInstance): void {
  // 1. Get crew members for holding
  app.get<{ Params: HoldingParams }>(
    '/api/v1/holdings/:holdingId/crew',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));

      const access = await getHoldingAccess(session.user.id, request.params.holdingId);
      if (!access) return reply.code(404).send(apiError(request, 'HOLDING_NOT_FOUND', 'Holding not found'));

      const crew = holdingCrews.get(request.params.holdingId) ?? [];
      return { items: crew };
    },
  );

  // 2. Add crew member
  app.post<{ Params: HoldingParams; Body: CreateCrewBody }>(
    '/api/v1/holdings/:holdingId/crew',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            phone: { type: 'string', maxLength: 30 },
            role: { type: 'string', enum: ['operator', 'capataz', 'driver'] },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));

      const access = await getHoldingAccess(session.user.id, request.params.holdingId);
      if (!access) return reply.code(404).send(apiError(request, 'HOLDING_NOT_FOUND', 'Holding not found'));

      const member: CrewMember = {
        id: crypto.randomUUID(),
        holdingId: request.params.holdingId,
        name: request.body.name.trim(),
        role: request.body.role || 'operator',
        active: true,
      };
      if (request.body.phone) member.phone = request.body.phone.trim();

      const existing = holdingCrews.get(request.params.holdingId) ?? [];
      const updated = [...existing, member];
      holdingCrews.set(request.params.holdingId, updated);

      return reply.code(201).send(member);
    },
  );
}
