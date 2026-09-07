import type { FastifyInstance } from 'fastify';

const MARKET_URL = 'https://www.juntadeandalucia.es/agriculturaypesca/observatorio/servlet/FrontController?action=UltimosPrecios&ec=default&subsector=33&posicion=1&producto=33000';
const CACHE_TTL_MS = 30 * 60_000;
const MAX_BODY_BYTES = 600_000;

type MarketPoint = { week: string; priceEurKg: number };
type MarketPayload = {
  series: MarketPoint[];
  fetchedAt: string;
  source: { label: string; url: string; scope: string };
  freshness: { status: 'fresh' | 'aging' | 'stale'; ageDays: number | null };
};

let cache: { value: MarketPayload; expiresAt: number } | null = null;

function parseNumbers(raw: string): number[] {
  return raw.split(',').map((value) => Number(value.trim())).filter((value) => Number.isFinite(value) && value >= 0 && value <= 30);
}

function isoWeekStart(week: string): Date | null {
  const match = /^(\d{1,2})-(\d{4})$/.exec(week);
  if (!match) return null;
  const weekNumber = Number(match[1]);
  const year = Number(match[2]);
  if (weekNumber < 1 || weekNumber > 53) return null;
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (weekNumber - 1) * 7);
  return monday;
}

function freshnessFor(week: string): MarketPayload['freshness'] {
  const weekStart = isoWeekStart(week);
  if (!weekStart) return { status: 'stale', ageDays: null };
  const ageDays = Math.max(0, Math.floor((Date.now() - weekStart.getTime()) / 86_400_000));
  return { status: ageDays <= 10 ? 'fresh' : ageDays <= 21 ? 'aging' : 'stale', ageDays };
}

export function parseOfficialOliveOilSeries(html: string): MarketPoint[] {
  const labelBlock = /labels:\s*\[([^\]]+)\]/.exec(html)?.[1] ?? '';
  const labels = labelBlock.match(/"(\d{1,2}-\d{4})"/g)?.map((value) => value.slice(1, -1)) ?? [];
  const data = /datasets:\s*\[\{data:\s*\[([^\]]+)\]/.exec(html)?.[1] ?? '';
  const values = parseNumbers(data);
  if (labels.length < 2 || labels.length !== values.length) throw new Error('MARKET_SOURCE_UNRECOGNIZED');
  return labels.map((week, index) => ({ week, priceEurKg: values[index]! }));
}

async function loadMarket(): Promise<MarketPayload> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;
  const response = await fetch(MARKET_URL, { headers: { accept: 'text/html', 'user-agent': 'Magina-Olivo/1.0 (+public-market)' }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`MARKET_SOURCE_HTTP_${response.status}`);
  const length = Number(response.headers.get('content-length') ?? '0');
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) throw new Error('MARKET_SOURCE_TOO_LARGE');
  const html = await response.text();
  if (html.length > MAX_BODY_BYTES) throw new Error('MARKET_SOURCE_TOO_LARGE');
  const series = parseOfficialOliveOilSeries(html);
  const value: MarketPayload = {
    series,
    fetchedAt: new Date().toISOString(),
    source: { label: 'Observatorio de Precios y Mercados · Junta de Andalucía', url: MARKET_URL, scope: 'Precio público de aceites de oliva; no es una liquidación de cooperativa.' },
    freshness: freshnessFor(series.at(-1)?.week ?? ''),
  };
  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

export function registerPublicMarketRoutes(app: FastifyInstance): void {
  app.get('/api/v1/public/market/olive-oil', async (_request, reply) => {
    try {
      return await loadMarket();
    } catch (error) {
      app.log.warn({ err: error }, 'public market source unavailable');
      return reply.code(502).send({ error: { code: 'MARKET_SOURCE_UNAVAILABLE', message: 'La fuente pública de mercado no está disponible temporalmente.' } });
    }
  });
}
