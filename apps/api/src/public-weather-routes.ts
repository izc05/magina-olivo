import type { FastifyInstance } from 'fastify';
import { fetchAemetDailyForecast, type PublicWeatherForecast } from './aemet-weather-provider.ts';
import { apiError } from './http-errors.ts';

type WeatherQuery = { municipalityCode: string };
type CacheEntry = { expiresAt: number; value: PublicWeatherForecast };

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function configuredMunicipalityCodes(): Set<string> {
  return new Set(
    (process.env.AEMET_ALLOWED_MUNICIPALITY_CODES ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter((value) => /^\d{5}$/.test(value)),
  );
}

export function registerPublicWeatherRoutes(app: FastifyInstance): void {
  app.get<{ Querystring: WeatherQuery }>(
    '/api/v1/public/weather',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          required: ['municipalityCode'],
          properties: {
            municipalityCode: { type: 'string', pattern: '^\\d{5}$' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!process.env.AEMET_API_KEY?.trim()) {
        return reply.code(503).send(apiError(request, 'WEATHER_PROVIDER_NOT_CONFIGURED', 'Weather provider is not configured'));
      }

      const allowed = configuredMunicipalityCodes();
      if (!allowed.has(request.query.municipalityCode)) {
        return reply.code(404).send(apiError(request, 'MUNICIPALITY_NOT_AVAILABLE', 'Weather is not available for this municipality'));
      }

      const cached = cache.get(request.query.municipalityCode);
      if (cached && cached.expiresAt > Date.now()) {
        return {
          ...cached.value,
          cache: { hit: true, ttlSeconds: Math.max(0, Math.round((cached.expiresAt - Date.now()) / 1000)) },
          source: {
            label: 'AEMET OpenData',
            attribution: 'AEMET',
          },
        };
      }

      try {
        const forecast = await fetchAemetDailyForecast(request.query.municipalityCode);
        cache.set(request.query.municipalityCode, {
          expiresAt: Date.now() + CACHE_TTL_MS,
          value: forecast,
        });

        return {
          ...forecast,
          cache: { hit: false, ttlSeconds: CACHE_TTL_MS / 1000 },
          source: {
            label: 'AEMET OpenData',
            attribution: 'AEMET',
          },
        };
      } catch (error) {
        request.log.warn({ err: error, municipalityCode: request.query.municipalityCode }, 'AEMET forecast unavailable');
        return reply.code(502).send(apiError(request, 'WEATHER_PROVIDER_UNAVAILABLE', 'Weather data is temporarily unavailable'));
      }
    },
  );
}
