import Fastify, { type FastifyInstance } from 'fastify';
import { checkDatabase } from './db.ts';
import { registerAccountExportRoutes } from './account-export-routes.ts';
import { registerAccountPreferenceRoutes } from './account-preference-routes.ts';
import { registerActivityRoutes } from './activity-routes.ts';
import { registerAuthRoutes } from './auth-routes.ts';
import { registerCampaignExportRoutes } from './campaign-export-routes.ts';
import { registerCampaignHarvestHistoryAliasRoutes } from './campaign-harvest-history-alias-routes.ts';
import { registerCampaignRoutes } from './campaign-routes.ts';
import { registerCampaignSummaryRoutes } from './campaign-summary-routes.ts';
import { registerCatastroMapRoutes } from './catastro-map-routes.ts';
import { registerDeliveryResultRoutes } from './delivery-result-routes.ts';
import { registerDeliveryRoutes } from './delivery-routes.ts';
import { registerDeliveryUpdateRoutes } from './delivery-update-routes.ts';
import { registerDocumentRoutes } from './document-routes.ts';
import { registerFarmRoutes } from './farm-routes.ts';
import { registerHoldingHarvestReportRoutes } from './holding-harvest-report-routes.ts';
import { registerHoldingRoutes } from './holding-routes.ts';
import { registerPlotHarvestReportRoutes } from './plot-harvest-report-routes.ts';
import { registerPlotRoutes } from './plot-routes.ts';
import { registerPlotTimelineRoutes } from './plot-timeline-routes.ts';
import { registerPublicDestinationRoutes } from './public-destination-routes.ts';
import { registerPublicFieldAlertRoutes } from './public-field-alert-routes.ts';
import { registerPublicMunicipalityRoutes } from './public-municipality-routes.ts';
import { registerPublicNewsRoutes } from './public-news-routes.ts';
import { registerPublicRadarRoutes } from './public-radar-routes.ts';
import { registerPublicSourceRoutes } from './public-source-routes.ts';
import { registerPublicWeatherRoutes } from './public-weather-routes.ts';
import { registerRainAlertRoutes } from './rain-alert-routes.ts';
import { registerRequestSecurity } from './request-security.ts';
import { registerSigpacMapRoutes } from './sigpac-map-routes.ts';
import { registerTaskRoutes } from './task-routes.ts';

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
  registerAccountPreferenceRoutes(app);
  registerAccountExportRoutes(app);
  registerRainAlertRoutes(app);
  registerPublicDestinationRoutes(app);
  registerPublicMunicipalityRoutes(app);
  registerPublicSourceRoutes(app);
  registerPublicWeatherRoutes(app);
  registerPublicRadarRoutes(app);
  registerPublicFieldAlertRoutes(app);
  registerPublicNewsRoutes(app);
  registerHoldingRoutes(app);
  registerFarmRoutes(app);
  registerPlotRoutes(app);
  registerPlotTimelineRoutes(app);
  registerHoldingHarvestReportRoutes(app);
  registerCampaignHarvestHistoryAliasRoutes(app);
  registerPlotHarvestReportRoutes(app);
  registerSigpacMapRoutes(app);
  registerCatastroMapRoutes(app);
  registerCampaignRoutes(app);
  registerCampaignExportRoutes(app);
  registerDeliveryRoutes(app);
  registerDeliveryUpdateRoutes(app);
  registerDeliveryResultRoutes(app);
  registerCampaignSummaryRoutes(app);
  registerDocumentRoutes(app);
  registerActivityRoutes(app);
  registerTaskRoutes(app);

  return app;
}
