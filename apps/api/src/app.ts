import Fastify, { type FastifyInstance } from 'fastify';
import { checkDatabase } from './db.ts';
import { registerActivityRoutes } from './activity-routes.ts';
import { registerAuthRoutes } from './auth-routes.ts';
import { registerCampaignExportRoutes } from './campaign-export-routes.ts';
import { registerCampaignRoutes } from './campaign-routes.ts';
import { registerCampaignSummaryRoutes } from './campaign-summary-routes.ts';
import { registerDeliveryResultRoutes } from './delivery-result-routes.ts';
import { registerDeliveryRoutes } from './delivery-routes.ts';
import { registerDeliveryUpdateRoutes } from './delivery-update-routes.ts';
import { registerDocumentRoutes } from './document-routes.ts';
import { registerFarmRoutes } from './farm-routes.ts';
import { registerHoldingRoutes } from './holding-routes.ts';
import { registerPlotRoutes } from './plot-routes.ts';
import { registerPlotTimelineRoutes } from './plot-timeline-routes.ts';
import { registerPublicDestinationRoutes } from './public-destination-routes.ts';
import { registerPublicFieldAlertRoutes } from './public-field-alert-routes.ts';
import { registerPublicMunicipalityRoutes } from './public-municipality-routes.ts';
import { registerPublicNewsRoutes } from './public-news-routes.ts';
import { registerPublicSourceRoutes } from './public-source-routes.ts';
import { registerPublicWeatherRoutes } from './public-weather-routes.ts';
import { registerRequestSecurity } from './request-security.ts';

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

  registerRequestSecurity(app);

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
  registerPublicDestinationRoutes(app);
  registerPublicMunicipalityRoutes(app);
  registerPublicSourceRoutes(app);
  registerPublicWeatherRoutes(app);
  registerPublicFieldAlertRoutes(app);
  registerPublicNewsRoutes(app);
  registerHoldingRoutes(app);
  registerFarmRoutes(app);
  registerPlotRoutes(app);
  registerPlotTimelineRoutes(app);
  registerCampaignRoutes(app);
  registerCampaignExportRoutes(app);
  registerDeliveryRoutes(app);
  registerDeliveryUpdateRoutes(app);
  registerDeliveryResultRoutes(app);
  registerCampaignSummaryRoutes(app);
  registerDocumentRoutes(app);
  registerActivityRoutes(app);

  return app;
}
