import type { FastifyInstance } from 'fastify';
import {
  fetchOliveOilMarketSnapshot,
  type OliveOilMarketSnapshot,
} from './olive-oil-market-provider.ts';
import { apiError } from './http-errors.ts';

type MarketDeliveryMode = 'live' | 'cache' | 'degraded-cache';
type CacheEntry = {
  fetchedAt: number;
  expiresAt: number;
  value: OliveOilMarketSnapshot;
};

type MarketFreshnessStatus = 'fresh' | 'aging' | 'stale' | 'unknown';

const CACHE_TTL_MS = 30 * 60 * 1000;
const FALLBACK_MAX_AGE_MS = 24 * 60 * 60 * 1000;
let cached: CacheEntry | null = null;

export function classifyOliveOilMarketFreshness(
  snapshot: OliveOilMarketSnapshot,
  now = new Date(),
): { status: MarketFreshnessStatus; ageDays: number | null; latestDate: string | null } {
  const latestDate = snapshot.weeks.at(-1)?.endDate ?? null;
  if (!latestDate) return { status: 'unknown', ageDays: null, latestDate: null };
  const end = new Date(`${latestDate}T23:59:59Z`);
  if (Number.isNaN(end.getTime())) return { status: 'unknown', ageDays: null, latestDate };
  const ageDays = Math.max(0, (now.getTime() - end.getTime()) / 86_400_000);
  const status: MarketFreshnessStatus = ageDays <= 14 ? 'fresh' : ageDays <= 35 ? 'aging' : 'stale';
  return { status, ageDays: Number(ageDays.toFixed(1)), latestDate };
}

function payload(snapshot: OliveOilMarketSnapshot, mode: MarketDeliveryMode, cacheHit: boolean) {
  return {
    weeks: snapshot.weeks,
    series: snapshot.series,
    freshness: classifyOliveOilMarketFreshness(snapshot),
    availability: { mode },
    cache: {
      hit: cacheHit,
      ttlSeconds: mode === 'cache' && cached ? Math.max(0, Math.round((cached.expiresAt - Date.now()) / 1000)) : 0,
    },
    source: {
      provider: snapshot.provider,
      sourceUrl: snapshot.sourceUrl,
      checkedAt: snapshot.checkedAt,
      position: snapshot.position,
      scope: snapshot.scope,
      unit: snapshot.unit,
      usageNote: 'Precio medio semanal registrado y validado por el Observatorio. Es contexto de mercado, no una liquidación individual de cooperativa.',
    },
  };
}

export function registerPublicMarketRoutes(app: FastifyInstance): void {
  app.get('/api/v1/public/market/olive-oil', async (request, reply) => {
    if (cached && cached.expiresAt > Date.now()) {
      reply.header('cache-control', 'public, max-age=300, stale-while-revalidate=900');
      return payload(cached.value, 'cache', true);
    }

    try {
      const snapshot = await fetchOliveOilMarketSnapshot();
      cached = {
        fetchedAt: Date.now(),
        expiresAt: Date.now() + CACHE_TTL_MS,
        value: snapshot,
      };
      reply.header('cache-control', 'public, max-age=300, stale-while-revalidate=900');
      return payload(snapshot, 'live', false);
    } catch (error) {
      request.log.warn({ err: error }, 'Official olive oil market source unavailable');
      if (cached && Date.now() - cached.fetchedAt <= FALLBACK_MAX_AGE_MS) {
        reply.header('cache-control', 'public, max-age=60, stale-while-revalidate=300');
        return payload(cached.value, 'degraded-cache', true);
      }
      return reply
        .code(502)
        .send(apiError(request, 'OLIVE_OIL_MARKET_UNAVAILABLE', 'Official olive oil market data is temporarily unavailable'));
    }
  });
}
