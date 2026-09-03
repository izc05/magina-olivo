import type { FastifyInstance } from 'fastify';
import { fetchAemetDailyForecast, type PublicWeatherForecast } from './aemet-weather-provider.ts';
import { getPool } from './db.ts';
import { apiError } from './http-errors.ts';
import { classifyWeatherFreshness } from './weather-freshness.ts';

type WeatherQuery = { municipality: string };
type CacheEntry = { expiresAt: number; value: PublicWeatherForecast };
type MunicipalityRow = {
  slug: string;
  name: string;
  province: string;
  aemet_code: string;
};

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function weatherPayload(
  municipality: MunicipalityRow,
  forecast: PublicWeatherForecast,
  cacheInfo: { hit: boolean; ttlSeconds: number },
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
    cache: cacheInfo,
    source: {
      label: 'AEMET OpenData',
      attribution: 'AEMET',
      scopeNote: 'Predicción para la capital del municipio; puede variar dentro del término municipal por altitud y localización.',
    },
  };
}

export function registerPublicWeatherRoutes(app: FastifyInstance): void {
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
        return weatherPayload(municipality, cached.value, {
          hit: true,
          ttlSeconds: Math.max(0, Math.round((cached.expiresAt - Date.now()) / 1000)),
        });
      }

      try {
        const forecast = await fetchAemetDailyForecast(municipality.aemet_code);
        cache.set(municipality.slug, {
          expiresAt: Date.now() + CACHE_TTL_MS,
          value: forecast,
        });

        return weatherPayload(municipality, forecast, {
          hit: false,
          ttlSeconds: CACHE_TTL_MS / 1000,
        });
      } catch (error) {
        request.log.warn({ err: error, municipality: municipality.slug }, 'AEMET forecast unavailable');
        return reply.code(502).send(apiError(request, 'WEATHER_PROVIDER_UNAVAILABLE', 'Weather data is temporarily unavailable'));
      }
    },
  );
}
