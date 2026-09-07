import type { FastifyInstance } from 'fastify';
import { fetchAemetDailyForecast, fetchAemetHourlyForecast, type PublicWeatherForecast } from './aemet-weather-provider.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { canServeWeatherFallback, classifyWeatherFreshness } from './weather-freshness.ts';

type WeatherQuery = { municipality: string };
type CacheEntry = { expiresAt: number; value: PublicWeatherForecast };
type PersistedCacheRow = { forecast: unknown; fetched_at: Date | string };
type MunicipalityRow = {
  slug: string;
  name: string;
  province: string;
  aemet_code: string;
};
type DeliveryMode = 'live' | 'cache' | 'degraded-cache';

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function asPublicForecast(value: unknown): PublicWeatherForecast | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<PublicWeatherForecast>;
  if (candidate.provider !== 'AEMET OpenData' || !Array.isArray(candidate.days)) return null;
  return candidate as PublicWeatherForecast;
}

async function readPersistedForecast(municipalitySlug: string): Promise<{ fetchedAt: number; value: PublicWeatherForecast } | null> {
  const result = await getPool().query<PersistedCacheRow>(
    'select forecast, fetched_at from public_weather_forecast_cache where municipality_slug = $1 limit 1',
    [municipalitySlug],
  );
  const row = result.rows[0];
  const value = row ? asPublicForecast(row.forecast) : null;
  const fetchedAt = row ? new Date(row.fetched_at).getTime() : Number.NaN;
  return value && Number.isFinite(fetchedAt) ? { fetchedAt, value } : null;
}

async function writePersistedForecast(municipalitySlug: string, forecast: PublicWeatherForecast): Promise<void> {
  await getPool().query(
    `
      insert into public_weather_forecast_cache (municipality_slug, forecast, fetched_at, updated_at)
      values ($1, $2::jsonb, now(), now())
      on conflict (municipality_slug) do update
      set forecast = excluded.forecast, fetched_at = excluded.fetched_at, updated_at = excluded.updated_at
    `,
    [municipalitySlug, JSON.stringify(forecast)],
  );
}

function weatherPayload(
  municipality: MunicipalityRow,
  forecast: PublicWeatherForecast,
  cacheInfo: { hit: boolean; ttlSeconds: number },
  mode: DeliveryMode,
) {
  return {
    municipality: {
      slug: municipality.slug,
      name: municipality.name,
      province: municipality.province,
    },
    forecast: {
      provider: forecast.provider,
      elaboratedAt: forecast.elaboratedAt,
      days: forecast.days,
    },
    freshness: classifyWeatherFreshness(forecast.elaboratedAt),
    availability: { mode },
    cache: cacheInfo,
    source: {
      label: 'AEMET OpenData',
      attribution: 'AEMET',
      scopeNote: 'Predicción para la capital del municipio; puede variar dentro del término municipal por altitud y localización.',
    },
  };
}

export function registerPublicWeatherRoutes(app: FastifyInstance): void {
  app.get<{ Querystring: WeatherQuery }>('/api/v1/public/weather/hourly', { schema: { querystring: { type: 'object', additionalProperties: false, required: ['municipality'], properties: { municipality: { type: 'string', pattern: '^[a-z0-9-]{2,80}$' } } } } }, async (request, reply) => {
    if (!process.env.AEMET_API_KEY?.trim()) return reply.code(503).send(apiError(request, 'WEATHER_PROVIDER_NOT_CONFIGURED', 'Weather provider is not configured'));
    const result = await getPool().query<MunicipalityRow>('select slug, name, province, aemet_code from public_municipalities where slug = $1 and active = true limit 1', [request.query.municipality]);
    const municipality = result.rows[0];
    if (!municipality) return reply.code(404).send(apiError(request, 'MUNICIPALITY_NOT_AVAILABLE', 'Weather is not available for this municipality'));
    try {
      const forecast = await fetchAemetHourlyForecast(municipality.aemet_code);
      return { municipality: { slug: municipality.slug, name: municipality.name, province: municipality.province }, forecast, source: { label: 'AEMET OpenData', attribution: 'AEMET', scopeNote: 'Predicción horaria para la capital del municipio; puede variar dentro del término municipal.' } };
    } catch (error) {
      request.log.warn({ err: error, municipality: municipality.slug }, 'AEMET hourly forecast unavailable');
      return reply.code(502).send(apiError(request, 'WEATHER_PROVIDER_UNAVAILABLE', 'Hourly weather data is temporarily unavailable'));
    }
  });
  app.get<{ Querystring: WeatherQuery }>(
    '/api/v1/public/weather',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          required: ['municipality'],
          properties: {
            municipality: { type: 'string', pattern: '^[a-z0-9-]{2,80}$' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!process.env.AEMET_API_KEY?.trim()) {
        return reply.code(503).send(apiError(request, 'WEATHER_PROVIDER_NOT_CONFIGURED', 'Weather provider is not configured'));
      }

      const municipalityResult = await getPool().query<MunicipalityRow>(
        `
          select slug, name, province, aemet_code
          from public_municipalities
          where slug = $1 and active = true
          limit 1
        `,
        [request.query.municipality],
      );
      const municipality = municipalityResult.rows[0];
      if (!municipality) {
        return reply.code(404).send(apiError(request, 'MUNICIPALITY_NOT_AVAILABLE', 'Weather is not available for this municipality'));
      }

      const cached = cache.get(municipality.slug);
      if (cached && cached.expiresAt > Date.now()) {
        return weatherPayload(
          municipality,
          cached.value,
          {
            hit: true,
            ttlSeconds: Math.max(0, Math.round((cached.expiresAt - Date.now()) / 1000)),
          },
          'cache',
        );
      }

      const persisted = await readPersistedForecast(municipality.slug);
      if (persisted && persisted.fetchedAt + CACHE_TTL_MS > Date.now()) {
        const expiresAt = persisted.fetchedAt + CACHE_TTL_MS;
        cache.set(municipality.slug, { expiresAt, value: persisted.value });
        return weatherPayload(
          municipality,
          persisted.value,
          { hit: true, ttlSeconds: Math.max(0, Math.round((expiresAt - Date.now()) / 1000)) },
          'cache',
        );
      }

      try {
        const forecast = await fetchAemetDailyForecast(municipality.aemet_code);
        cache.set(municipality.slug, {
          expiresAt: Date.now() + CACHE_TTL_MS,
          value: forecast,
        });
        await writePersistedForecast(municipality.slug, forecast);

        return weatherPayload(
          municipality,
          forecast,
          { hit: false, ttlSeconds: CACHE_TTL_MS / 1000 },
          'live',
        );
      } catch (error) {
        request.log.warn({ err: error, municipality: municipality.slug }, 'AEMET forecast unavailable');

        const fallback = cached?.value ?? persisted?.value;
        if (fallback) {
          const freshness = classifyWeatherFreshness(fallback.elaboratedAt);
          if (canServeWeatherFallback(freshness)) {
            request.log.warn(
              { municipality: municipality.slug, freshness: freshness.status, ageHours: freshness.ageHours },
              'Serving bounded cached AEMET fallback',
            );
            return weatherPayload(
              municipality,
              fallback,
              { hit: true, ttlSeconds: 0 },
              'degraded-cache',
            );
          }
        }

        return reply.code(502).send(apiError(request, 'WEATHER_PROVIDER_UNAVAILABLE', 'Weather data is temporarily unavailable'));
      }
    },
  );
}
