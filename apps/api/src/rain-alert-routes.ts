import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

type PreferenceRow = {
  notify_weather: boolean;
  threshold_percent: string;
};

type RainAlertRow = {
  id: string;
  holding_id: string;
  municipality_slug: string;
  municipality_name: string;
  forecast_date: string;
  precipitation_probability_percent: string;
  threshold_percent: string;
  provider: string;
  provider_elaborated_at: Date | null;
  first_detected_at: Date;
  last_detected_at: Date;
};

export function registerRainAlertRoutes(app: FastifyInstance): void {
  app.get('/api/v1/account/rain-alerts', async (request, reply) => {
    const session = await getAuthenticatedSession(request);
    if (!session) {
      return reply
        .code(401)
        .send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    }

    const db = getPool();
    const preferenceResult = await db.query<PreferenceRow>(
      `
        select
          notify_weather,
          weather_rain_probability_percent_threshold::text as threshold_percent
        from user_preferences
        where user_id = $1
        limit 1
      `,
      [session.user.id],
    );

    const preference = preferenceResult.rows[0];
    const enabled = preference?.notify_weather ?? true;
    const thresholdPercent = Number(preference?.threshold_percent ?? 60);

    if (!enabled) {
      return {
        enabled: false,
        thresholdPercent,
        horizonDays: 2,
        items: [],
      };
    }

    const alertResult = await db.query<RainAlertRow>(
      `
        select
          e.id,
          e.holding_id,
          e.municipality_slug,
          pm.name as municipality_name,
          e.forecast_date::text,
          e.precipitation_probability_percent::text,
          e.threshold_percent::text,
          e.provider,
          e.provider_elaborated_at,
          e.first_detected_at,
          e.last_detected_at
        from weather_alert_events e
        join public_municipalities pm on pm.slug = e.municipality_slug
        where e.user_id = $1
          and e.kind = 'rain'
          and e.status = 'active'
          and e.forecast_date >= current_date
        order by e.forecast_date asc, e.precipitation_probability_percent desc, e.id asc
        limit 10
      `,
      [session.user.id],
    );

    return {
      enabled: true,
      thresholdPercent,
      horizonDays: 2,
      source: {
        provider: 'AEMET OpenData',
        scope: 'municipal-daily-forecast',
        automatic: true,
      },
      items: alertResult.rows.map((row) => ({
        id: row.id,
        holdingId: row.holding_id,
        municipalitySlug: row.municipality_slug,
        municipalityName: row.municipality_name,
        forecastDate: row.forecast_date,
        precipitationProbabilityPercent: Number(row.precipitation_probability_percent),
        thresholdPercent: Number(row.threshold_percent),
        provider: row.provider,
        providerElaboratedAt: row.provider_elaborated_at,
        firstDetectedAt: row.first_detected_at,
        lastDetectedAt: row.last_detected_at,
      })),
    };
  });
}
