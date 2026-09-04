import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

const DEFAULT_ALLOWED_PUSH_HOSTS = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
];

function allowedPushHosts(): string[] {
  const configured = process.env.WEB_PUSH_ALLOWED_HOST_SUFFIXES
    ?.split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return configured?.length ? configured : DEFAULT_ALLOWED_PUSH_HOSTS;
}

export function isAllowedPushEndpoint(value: string): boolean {
  if (value.length < 16 || value.length > 2048) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password || !url.hostname) return false;
  const hostname = url.hostname.toLowerCase();
  if (isIP(hostname) !== 0 || hostname === 'localhost' || hostname.endsWith('.localhost')) return false;
  return allowedPushHosts().some((allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`));
}

type SubscriptionBody = {
  endpoint: string;
  expirationTime?: number | null;
};

type SubscriptionRow = {
  endpoint_origin: string;
  enabled: boolean;
  expiration_time: string | null;
  updated_at: Date;
};

function configuredPublicKey(): string | null {
  const value = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
  return value || null;
}

export function registerPushSubscriptionRoutes(app: FastifyInstance): void {
  app.get('/api/v1/account/push/config', async (request, reply) => {
    const session = await getAuthenticatedSession(request);
    if (!session) {
      return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    }

    const publicKey = configuredPublicKey();
    return {
      available: Boolean(publicKey),
      publicKey,
      payloadMode: 'empty',
      detailLocation: '/notificaciones',
    };
  });

  app.get('/api/v1/account/push/status', async (request, reply) => {
    const session = await getAuthenticatedSession(request);
    if (!session) {
      return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    }

    const db = getPool();
    const result = await db.query<{ count: string }>(
      'select count(*)::text as count from push_subscriptions where user_id = $1 and enabled = true',
      [session.user.id],
    );
    return {
      available: Boolean(configuredPublicKey()),
      activeSubscriptions: Number(result.rows[0]?.count ?? '0'),
    };
  });

  app.post<{ Body: SubscriptionBody }>(
    '/api/v1/account/push/subscriptions',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['endpoint'],
          properties: {
            endpoint: { type: 'string', minLength: 16, maxLength: 2048 },
            expirationTime: {
              anyOf: [
                { type: 'number', minimum: 0 },
                { type: 'null' },
              ],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }
      if (!configuredPublicKey()) {
        return reply.code(503).send(apiError(request, 'WEB_PUSH_NOT_CONFIGURED', 'Web Push is not configured'));
      }
      if (!isAllowedPushEndpoint(request.body.endpoint)) {
        return reply.code(400).send(apiError(request, 'INVALID_PUSH_ENDPOINT', 'Unsupported push service endpoint'));
      }

      const url = new URL(request.body.endpoint);
      const expirationTime = request.body.expirationTime == null
        ? null
        : Math.trunc(request.body.expirationTime);
      const db = getPool();
      const result = await db.query<SubscriptionRow>(
        `
          insert into push_subscriptions (
            id,
            user_id,
            endpoint,
            endpoint_origin,
            expiration_time,
            enabled,
            failure_count,
            updated_at
          )
          values ($1, $2, $3, $4, $5, true, 0, now())
          on conflict (endpoint)
          do update set
            endpoint_origin = excluded.endpoint_origin,
            expiration_time = excluded.expiration_time,
            enabled = true,
            failure_count = 0,
            last_failure_at = null,
            updated_at = now()
          where push_subscriptions.user_id = excluded.user_id
          returning endpoint_origin, enabled, expiration_time::text, updated_at
        `,
        [randomUUID(), session.user.id, request.body.endpoint, url.origin, expirationTime],
      );
      const row = result.rows[0];
      if (!row) {
        return reply.code(409).send(apiError(
          request,
          'PUSH_SUBSCRIPTION_CONFLICT',
          'Push subscription cannot be registered for this account',
        ));
      }
      return reply.code(201).send({
        enabled: row.enabled,
        origin: row.endpoint_origin,
        expirationTime: row.expiration_time == null ? null : Number(row.expiration_time),
        updatedAt: row.updated_at,
      });
    },
  );

  app.delete<{ Body: SubscriptionBody }>(
    '/api/v1/account/push/subscriptions',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['endpoint'],
          properties: {
            endpoint: { type: 'string', minLength: 16, maxLength: 2048 },
          },
        },
      },
    },
    async (request, reply) => {
      const session = await getAuthenticatedSession(request);
      if (!session) {
        return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
      }

      const db = getPool();
      await db.query(
        `
          update push_subscriptions
          set enabled = false,
              updated_at = now()
          where user_id = $1
            and endpoint = $2
        `,
        [session.user.id, request.body.endpoint],
      );
      return reply.code(204).send();
    },
  );
}
