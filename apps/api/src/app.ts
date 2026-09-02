import Fastify, { type FastifyInstance } from 'fastify';
import { checkDatabase } from './db.ts';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers.set-cookie',
      ],
    },
    requestIdHeader: 'x-request-id',
  });

  app.get('/health/live', async () => ({
    status: 'ok',
    service: 'magina-olivo-api',
  }));

  app.get('/health/ready', async (_request, reply) => {
    try {
      await checkDatabase();
      return {
        status: 'ready',
        database: 'ok',
      };
    } catch (error) {
      app.log.error({ err: error }, 'readiness check failed');
      return reply.code(503).send({
        status: 'not_ready',
        database: 'unavailable',
      });
    }
  });

  return app;
}
