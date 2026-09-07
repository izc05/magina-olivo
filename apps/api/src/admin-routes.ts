import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { apiError } from './http-errors.ts';
import { canAccessPlatformConsole } from './platform-admin-access.ts';
import { getActivePlatformAdminRole, writePlatformAdminAudit } from './platform-admin.ts';
import { getAuthenticatedSession } from './session.ts';
import { getPool } from './db.ts';

type CountRow = { total: string };

async function requirePlatformAdmin(request: FastifyRequest, reply: FastifyReply) {
  const session = await getAuthenticatedSession(request);
  if (!session) {
    reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    return null;
  }

  const role = await getActivePlatformAdminRole(session.user.id);
  if (!canAccessPlatformConsole(role)) {
    reply.code(403).send(apiError(request, 'PLATFORM_ADMIN_REQUIRED', 'Platform administration access required'));
    return null;
  }

  return { session, role };
}

function count(result: { rows: CountRow[] }): number {
  return Number(result.rows[0]?.total ?? 0);
}

export function registerAdminRoutes(app: FastifyInstance): void {
  app.get('/api/v1/admin/session', async (request, reply) => {
    const access = await requirePlatformAdmin(request, reply);
    if (!access) return reply;
    return { role: access.role };
  });

  app.get('/api/v1/admin/overview', async (request, reply) => {
    const access = await requirePlatformAdmin(request, reply);
    if (!access) return reply;

    const db = getPool();
    const [users, holdings, farms, plots, cooperatives, activeCampaigns] = await Promise.all([
      db.query<CountRow>('select count(*)::text as total from "user"'),
      db.query<CountRow>('select count(*)::text as total from holdings'),
      db.query<CountRow>('select count(*)::text as total from farms where active = true'),
      db.query<CountRow>('select count(*)::text as total from plots where active = true'),
      db.query<CountRow>("select count(*)::text as total from cooperatives where verification_status <> 'stale'"),
      db.query<CountRow>("select count(*)::text as total from campaigns where status = 'active'"),
    ]);

    await writePlatformAdminAudit({
      actorUserId: access.session.user.id,
      action: 'admin.overview.read',
      requestId: request.id,
      metadata: { role: access.role },
    });

    return {
      role: access.role,
      generatedAt: new Date().toISOString(),
      metrics: {
        users: count(users),
        holdings: count(holdings),
        activeFarms: count(farms),
        activePlots: count(plots),
        publicCooperatives: count(cooperatives),
        activeCampaigns: count(activeCampaigns),
      },
    };
  });
}
