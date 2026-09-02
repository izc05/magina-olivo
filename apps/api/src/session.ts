import type { FastifyRequest } from 'fastify';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth.ts';

export type AuthenticatedSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

export async function getAuthenticatedSession(
  request: FastifyRequest,
): Promise<AuthenticatedSession | null> {
  return auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });
}
