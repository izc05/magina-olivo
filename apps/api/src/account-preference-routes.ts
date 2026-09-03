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
  weather_rain_mm_threshold: string;
  weather_frost_c_threshold: string;
  weather_wind_kmh_threshold: string;
  updated_at: Date;
};

function mapPreference(row: PreferenceRow) {
  return {
    preferredCooperativeId: row.preferred_cooperative_id,
    notifyWeather: row.notify_weather,
    notifyTasks: row.notify_tasks,
    notifyPendingYield: row.notify_pending_yield,
    weatherRainProbabilityPercentThreshold: Number(row.weather_rain_probability_percent_threshold),
    weatherRainMmThreshold: Number(row.weather_rain_mm_threshold),
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
          weather_rain_mm_threshold,
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
            weatherRainMmThreshold: { type: 'number', minimum: 0, maximum: 500 },
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

      await db.query(
        `
          insert into user_preferences (user_id)
          values ($1)
          on conflict (user_id) do nothing
        `,
        [session.user.id],
      );

      const result = await db.query<PreferenceRow>(
        `
          update user_preferences
          set preferred_cooperative_id = $2,
              notify_weather = $3,
              notify_tasks = $4,
              notify_pending_yield = $5,
              weather_rain_probability_percent_threshold = coalesce($6, weather_rain_probability_percent_threshold),
              weather_rain_mm_threshold = coalesce($7, weather_rain_mm_threshold),
              weather_frost_c_threshold = $8,
              weather_wind_kmh_threshold = $9,
              updated_at = now()
          where user_id = $1
          returning
            preferred_cooperative_id,
            notify_weather,
            notify_tasks,
            notify_pending_yield,
            weather_rain_probability_percent_threshold,
            weather_rain_mm_threshold,
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
          request.body.weatherRainProbabilityPercentThreshold ?? null,
          request.body.weatherRainMmThreshold ?? null,
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
