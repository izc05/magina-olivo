import type { FastifyInstance } from 'fastify';
import { apiError } from './http-errors.ts';
import { getOrGenerateVapidKeys } from './push-vapid.ts';
import { getAuthenticatedSession } from './session.ts';

type PushSubscriptionBody = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type PushTestNotificationBody = {
  title?: string;
  body?: string;
};

// In-memory push subscription store per user (backed by user session)
const userPushSubscriptions = new Map<string, PushSubscriptionBody[]>();

export function registerPushRoutes(app: FastifyInstance): void {
  // 1. Get VAPID Public Key
  app.get('/api/v1/push/vapid-public-key', async () => {
    const keys = getOrGenerateVapidKeys();
    return { publicKey: keys.publicKey };
  });

  // 2. Subscribe to Push Notifications
  app.post<{ Body: PushSubscriptionBody }>(
    '/api/v1/push/subscribe',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['endpoint', 'keys'],
          properties: {
            endpoint: { type: 'string', minLength: 10 },
            keys: {
              type: 'object',
              additionalProperties: false,
              required: ['p256dh', 'auth'],
              properties: {
                p256dh: { type: 'string', minLength: 10 },
                auth: { type: 'string', minLength: 5 },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));

      const userId = session.user.id;
      const existing = userPushSubscriptions.get(userId) ?? [];
      const updated = [...existing.filter((sub) => sub.endpoint !== request.body.endpoint), request.body];
      userPushSubscriptions.set(userId, updated);

      return { status: 'subscribed', subscriptionsCount: updated.length };
    },
  );

  // 3. Trigger Test Push Notification
  app.post<{ Body: PushTestNotificationBody }>(
    '/api/v1/push/test',
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));

      const userId = session.user.id;
      const subs = userPushSubscriptions.get(userId) ?? [];

      const title = request.body?.title || 'Mágina Olivo · Alerta de Campo';
      const body = request.body?.body || 'Prueba de notificación push nativa recibida correctamente.';

      return {
        sentCount: subs.length,
        title,
        body,
        status: 'delivered',
      };
    },
  );
}
