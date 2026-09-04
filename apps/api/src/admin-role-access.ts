import type { FastifyReply, FastifyRequest } from 'fastify';
import { getPool } from './db.ts';
import { isPlatformAdminEmail } from './admin-access-policy.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession, type AuthenticatedSession } from './session.ts';

export type PlatformAdminRole = 'superadmin' | 'commercial' | 'content' | 'support' | 'operations';

export type PlatformAdminAccess = {
  session: AuthenticatedSession;
  roles: PlatformAdminRole[];
  bootstrapSuperadmin: boolean;
};

export async function resolvePlatformAdminAccess(
  request: FastifyRequest,
): Promise<PlatformAdminAccess | null> {
  const session = await getAuthenticatedSession(request);
  if (!session) return null;

  if (isPlatformAdminEmail(session.user.email)) {
    return {
      session,
      roles: ['superadmin'],
      bootstrapSuperadmin: true,
    };
  }

  const result = await getPool().query<{ role: PlatformAdminRole }>(`
    select role
    from platform_admin_memberships
    where user_id = $1 and status = 'active'
    order by role
  `, [session.user.id]);

  if (!result.rows.length) return null;
  return {
    session,
    roles: result.rows.map((row) => row.role),
    bootstrapSuperadmin: false,
  };
}

export async function requireAdminRole(
  request: FastifyRequest,
  reply: FastifyReply,
  requiredRole: Exclude<PlatformAdminRole, 'superadmin'>,
): Promise<PlatformAdminAccess | null> {
  const session = await getAuthenticatedSession(request);
  if (!session) {
    reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    return null;
  }

  if (isPlatformAdminEmail(session.user.email)) {
    return { session, roles: ['superadmin'], bootstrapSuperadmin: true };
  }

  const result = await getPool().query<{ role: PlatformAdminRole }>(`
    select role
    from platform_admin_memberships
    where user_id = $1
      and status = 'active'
      and role in ('superadmin', $2)
    order by role
  `, [session.user.id, requiredRole]);

  if (!result.rows.length) {
    reply.code(403).send(apiError(request, 'ADMIN_ROLE_REQUIRED', `Platform admin role required: ${requiredRole}`));
    return null;
  }

  return {
    session,
    roles: result.rows.map((row) => row.role),
    bootstrapSuperadmin: false,
  };
}
