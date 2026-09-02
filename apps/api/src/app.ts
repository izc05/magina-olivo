import Fastify, { type FastifyInstance } from 'fastify';
import { checkDatabase } from './db.ts';
import { registerAuthRoutes } from './auth-routes.ts';
import { registerCampaignRoutes } from './campaign-routes.ts';
import { registerCampaignSummaryRoutes } from './campaign-summary-routes.ts';
import { registerDeliveryResultRoutes } from './delivery-result-routes.ts';
import { registerDeliveryRoutes } from './delivery-routes.ts';
import { registerDocumentRoutes } from './document-routes.ts';
import { registerFarmRoutes } from './farm-routes.ts';
import { registerHoldingRoutes } from './holding-routes.ts';
import { registerPlotRoutes } from './plot-routes.ts';

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
    trustProxy: true,
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

  registerAuthRoutes(app);
  registerHoldingRoutes(app);
  registerFarmRoutes(app);
  registerPlotRoutes(app);
  registerCampaignRoutes(app);
  registerDeliveryRoutes(app);
  registerDeliveryResultRoutes(app);
  registerCampaignSummaryRoutes(app);
  registerDocumentRoutes(app);

  return app;
}
