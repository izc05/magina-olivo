import type { FastifyReply, FastifyRequest } from 'fastify';
import { requireSuperadmin } from './admin-role-access.ts';
import type { AuthenticatedSession } from './session.ts';

export async function requirePlatformAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthenticatedSession | null> {
  const access = await requireSuperadmin(request, reply);
  return access?.session ?? null;
}
