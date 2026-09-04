import type { FastifyReply, FastifyRequest } from 'fastify';
import { isPlatformAdminEmail } from './admin-access-policy.ts';
import { apiError } from './http-errors.ts';
import {
  getAuthenticatedSession,
  type AuthenticatedSession,
} from './session.ts';

export async function requirePlatformAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthenticatedSession | null> {
  const session = await getAuthenticatedSession(request);
  if (!session) {
    reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    return null;
  }

  if (!isPlatformAdminEmail(session.user.email)) {
    reply.code(403).send(apiError(request, 'ADMIN_REQUIRED', 'Platform administrator access required'));
    return null;
  }

  return session;
}
