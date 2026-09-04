import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession, type AuthenticatedSession } from './session.ts';

async function authenticatedOrReply(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthenticatedSession | null> {
  const session = await getAuthenticatedSession(request);
  if (!session) {
    reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    return null;
  }
  return session;
}

async function requireAdvertiserMembership(
  request: FastifyRequest,
  reply: FastifyReply,
  advertiserId: string,
): Promise<AuthenticatedSession | null> {
  const session = await authenticatedOrReply(request, reply);
  if (!session) return null;
  const membership = await getPool().query<{ advertiser_id: string }>(`
    select advertiser_id
    from advertiser_portal_memberships
    where advertiser_id = $1 and user_id = $2 and status = 'active'
    limit 1
  `, [advertiserId, session.user.id]);
  if (!membership.rows[0]) {
    reply.code(403).send(apiError(request, 'ADVERTISER_ACCESS_REQUIRED', 'Advertiser access required'));
    return null;
  }
  return session;
}

export function registerAdvertiserNotificationRoutes(app: FastifyInstance): void {
  app.get<{ Querystring: { advertiserId: string } }>(
    '/api/v1/advertiser/notifications',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          required: ['advertiserId'],
          properties: { advertiserId: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      const session = await requireAdvertiserMembership(request, reply, request.query.advertiserId);
      if (!session) return;

      const result = await getPool().query<{
        id: string;
        notification_type: string;
        severity: string;
        title: string;
        body: string;
        action_url: string | null;
        created_at: Date;
        read_at: Date | null;
      }>(`
        select n.id, n.notification_type, n.severity, n.title, n.body, n.action_url,
          n.created_at, r.read_at
        from advertiser_notifications n
        left join advertiser_notification_reads r
          on r.notification_id = n.id and r.user_id = $2
        where n.advertiser_id = $1
          and (n.target_user_id is null or n.target_user_id = $2)
        order by n.created_at desc
        limit 50
      `, [request.query.advertiserId, session.user.id]);

      reply.header('cache-control', 'private, no-store');
      return {
        unreadCount: result.rows.filter((row) => row.read_at == null).length,
        items: result.rows.map((row) => ({
          id: row.id,
          type: row.notification_type,
          severity: row.severity,
          title: row.title,
          body: row.body,
          actionUrl: row.action_url,
          createdAt: row.created_at,
          readAt: row.read_at,
        })),
        policy: {
          commercialOnly: true,
          officialWarning: false,
          agriculturalAlert: false,
        },
      };
    },
  );

  app.post<{ Params: { notificationId: string } }>(
    '/api/v1/advertiser/notifications/:notificationId/read',
    {
      schema: {
        params: {
          type: 'object',
          additionalProperties: false,
          required: ['notificationId'],
          properties: { notificationId: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      const session = await authenticatedOrReply(request, reply);
      if (!session) return;
      const allowed = await getPool().query<{ id: string }>(`
        select n.id
        from advertiser_notifications n
        join advertiser_portal_memberships m
          on m.advertiser_id = n.advertiser_id
         and m.user_id = $2
         and m.status = 'active'
        where n.id = $1
          and (n.target_user_id is null or n.target_user_id = $2)
        limit 1
      `, [request.params.notificationId, session.user.id]);
      if (!allowed.rows[0]) {
        return reply.code(404).send(apiError(request, 'ADVERTISER_NOTIFICATION_NOT_FOUND', 'Notification not found'));
      }
      await getPool().query(`
        insert into advertiser_notification_reads (notification_id, user_id, read_at)
        values ($1, $2, now())
        on conflict (notification_id, user_id)
        do update set read_at = excluded.read_at
      `, [request.params.notificationId, session.user.id]);
      reply.header('cache-control', 'private, no-store');
      return { read: true };
    },
  );

  app.get<{ Querystring: { advertiserId: string } }>(
    '/api/v1/advertiser/notification-preferences',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          required: ['advertiserId'],
          properties: { advertiserId: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      const session = await requireAdvertiserMembership(request, reply, request.query.advertiserId);
      if (!session) return;
      const result = await getPool().query<{ email_enabled: boolean }>(`
        select email_enabled
        from advertiser_notification_preferences
        where advertiser_id = $1 and user_id = $2
      `, [request.query.advertiserId, session.user.id]);
      reply.header('cache-control', 'private, no-store');
      return {
        emailEnabled: result.rows[0]?.email_enabled ?? false,
        emailTransportConfigured: (process.env.COMMERCIAL_MAIL_TRANSPORT ?? 'disabled') !== 'disabled',
        note: 'El correo comercial es opt-in. Las notificaciones dentro del Área del Anunciante permanecen disponibles.',
      };
    },
  );

  app.patch<{ Querystring: { advertiserId: string }; Body: { emailEnabled: boolean } }>(
    '/api/v1/advertiser/notification-preferences',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          required: ['advertiserId'],
          properties: { advertiserId: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['emailEnabled'],
          properties: { emailEnabled: { type: 'boolean' } },
        },
      },
    },
    async (request, reply) => {
      const session = await requireAdvertiserMembership(request, reply, request.query.advertiserId);
      if (!session) return;
      await getPool().query(`
        insert into advertiser_notification_preferences (advertiser_id, user_id, email_enabled, updated_at)
        values ($1, $2, $3, now())
        on conflict (advertiser_id, user_id)
        do update set email_enabled = excluded.email_enabled, updated_at = now()
      `, [request.query.advertiserId, session.user.id, request.body.emailEnabled]);
      reply.header('cache-control', 'private, no-store');
      return { emailEnabled: request.body.emailEnabled };
    },
  );
}
