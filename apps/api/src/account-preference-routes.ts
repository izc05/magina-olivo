import type { FastifyInstance } from 'fastify';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { getAuthenticatedSession } from './session.ts';

type PreferenceBody = {
  preferredCooperativeId?: string | null;
  notifyWeather: boolean;
  notifyTasks: boolean;
  notifyPendingYield: boolean;
  weatherRainProbabilityPercentThreshold?: number;
  weatherRainMmThreshold?: number;
  weatherFrostCThreshold: number;
  weatherWindKmhThreshold: number;
};

type PreferenceRow = {
  preferred_cooperative_id: string | null;
  notify_weather: boolean;
  notify_tasks: boolean;
  notify_pending_yield: boolean;
  weather_rain_probability_percent_threshold: string;
  weather_frost_c_threshold: string;
  weather_wind_kmh_threshold: string;
  updated_at: Date;
};

function mapPreference(row: PreferenceRow) {
  const rainProbabilityThreshold = Number(row.weather_rain_probability_percent_threshold);
  return {
    preferredCooperativeId: row.preferred_cooperative_id,
    notifyWeather: row.notify_weather,
    notifyTasks: row.notify_tasks,
    notifyPendingYield: row.notify_pending_yield,
    weatherRainProbabilityPercentThreshold: rainProbabilityThreshold,
    // Transitional alias for the pre-alert account UI. Remove after the UI migrates to the percentage name.
    weatherRainMmThreshold: rainProbabilityThreshold,
    weatherFrostCThreshold: Number(row.weather_frost_c_threshold),
    weatherWindKmhThreshold: Number(row.weather_wind_kmh_threshold),
    updatedAt: row.updated_at,
  };
}

export function registerAccountPreferenceRoutes(app: FastifyInstance): void {
  app.get('/api/v1/account/preferences', async (request, reply) => {
    const session = await getAuthenticatedSession(request);
    if (!session) {
      return reply.code(401).send(apiError(request, 'AUTH_REQUIRED', 'Authentication required'));
    }

    const db = getPool();
    const result = await db.query<PreferenceRow>(
      `
        insert into user_preferences (user_id)
        values ($1)
        on conflict (user_id) do update set user_id = excluded.user_id
        returning
          preferred_cooperative_id,
          notify_weather,
          notify_tasks,
          notify_pending_yield,
          weather_rain_probability_percent_threshold,
          weather_frost_c_threshold,
          weather_wind_kmh_threshold,
          updated_at
      `,
      [session.user.id],
    );

    const row = result.rows[0];
    if (!row) throw new Error('Account preference query returned no row');
    return mapPreference(row);
  });

  app.put<{ Body: PreferenceBody }>(
    '/api/v1/account/preferences',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: [
            'notifyWeather',
            'notifyTasks',
            'notifyPendingYield',
            'weatherFrostCThreshold',
            'weatherWindKmhThreshold',
          ],
          properties: {
            preferredCooperativeId: {
              anyOf: [{ type: 'string', format: 'uuid' }, { type: 'null' }],
            },
            notifyWeather: { type: 'boolean' },
            notifyTasks: { type: 'boolean' },
            notifyPendingYield: { type: 'boolean' },
            weatherRainProbabilityPercentThreshold: { type: 'number', minimum: 0, maximum: 100 },
            weatherRainMmThreshold: { type: 'number', minimum: 0, maximum: 100 },
            weatherFrostCThreshold: { type: 'number', minimum: -50, maximum: 20 },
            weatherWindKmhThreshold: { type: 'number', minimum: 0, maximum: 300 },
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
      const cooperativeId = request.body.preferredCooperativeId ?? null;
      if (cooperativeId) {
        const cooperative = await db.query<{ id: string }>(
          'select id from cooperatives where id = $1',
          [cooperativeId],
        );
        if (!cooperative.rows[0]) {
          return reply.code(400).send(apiError(request, 'INVALID_PREFERRED_COOPERATIVE', 'Preferred cooperative does not exist'));
        }
      }

      const rainProbabilityThreshold = request.body.weatherRainProbabilityPercentThreshold
        ?? request.body.weatherRainMmThreshold
        ?? 60;

      const result = await db.query<PreferenceRow>(
        `
          insert into user_preferences (
            user_id,
            preferred_cooperative_id,
            notify_weather,
            notify_tasks,
            notify_pending_yield,
            weather_rain_probability_percent_threshold,
            weather_frost_c_threshold,
            weather_wind_kmh_threshold,
            updated_at
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, now())
          on conflict (user_id) do update set
            preferred_cooperative_id = excluded.preferred_cooperative_id,
            notify_weather = excluded.notify_weather,
            notify_tasks = excluded.notify_tasks,
            notify_pending_yield = excluded.notify_pending_yield,
            weather_rain_probability_percent_threshold = excluded.weather_rain_probability_percent_threshold,
            weather_frost_c_threshold = excluded.weather_frost_c_threshold,
            weather_wind_kmh_threshold = excluded.weather_wind_kmh_threshold,
            updated_at = now()
          returning
            preferred_cooperative_id,
            notify_weather,
            notify_tasks,
            notify_pending_yield,
            weather_rain_probability_percent_threshold,
            weather_frost_c_threshold,
            weather_wind_kmh_threshold,
            updated_at
        `,
        [
          session.user.id,
          cooperativeId,
          request.body.notifyWeather,
          request.body.notifyTasks,
          request.body.notifyPendingYield,
          rainProbabilityThreshold,
          request.body.weatherFrostCThreshold,
          request.body.weatherWindKmhThreshold,
        ],
      );

      const row = result.rows[0];
      if (!row) throw new Error('Account preference update returned no row');
      return mapPreference(row);
    },
  );
}
