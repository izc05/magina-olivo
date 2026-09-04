import type { FastifyInstance } from 'fastify';
import { fromNodeHeaders } from 'better-auth/node';
import { auth, googleAuthEnabled } from './auth.ts';
import { apiError } from './http-errors.ts';

export function registerAuthRoutes(app: FastifyInstance): void {
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    async handler(request, reply) {
      try {
        const host = request.headers.host ?? 'localhost:3001';
        const protocol = request.headers['x-forwarded-proto'] ?? 'http';
        const url = new URL(request.url, `${protocol}://${host}`);
        const headers = fromNodeHeaders(request.headers);

        const authRequest = new Request(url.toString(), {
          method: request.method,
          headers,
          ...(request.body ? { body: JSON.stringify(request.body) } : {}),
        });

        const response = await auth.handler(authRequest);
        reply.status(response.status);
        response.headers.forEach((value, key) => reply.header(key, value));

        return reply.send(response.body ? await response.text() : null);
      } catch (error) {
        app.log.error({ err: error }, 'authentication handler failed');
        return reply.status(500).send({
          error: 'Internal authentication error',
          code: 'AUTH_FAILURE',
        });
      }
    },
  });

  app.get('/api/v1/auth/providers', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
    return {
      emailPassword: true,
      google: googleAuthEnabled,
    };
  });

  app.get('/api/v1/me', async (request, reply) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      return reply
        .status(401)
        .send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    }

    return {
      user: session.user,
      session: {
        id: session.session.id,
        expiresAt: session.session.expiresAt,
      },
    };
  });
}
