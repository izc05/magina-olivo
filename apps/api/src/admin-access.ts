import type { FastifyReply, FastifyRequest } from 'fastify';
import { apiError } from './http-errors.ts';
import {
  getAuthenticatedSession,
  type AuthenticatedSession,
} from './session.ts';

export function parsePlatformAdminEmails(value: string | undefined): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isPlatformAdminEmail(
  email: string | null | undefined,
  configured = process.env.MAGINA_ADMIN_EMAILS,
): boolean {
  if (!email) return false;
  return parsePlatformAdminEmails(configured).has(email.trim().toLowerCase());
}

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
