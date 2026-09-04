import type { FastifyInstance, FastifyRequest } from 'fastify';
import { trustedOrigins } from './auth.ts';
import { getPool } from './db.ts';

type GrowthEvent = 'public_page_view' | 'share_started' | 'share_completed';
type GrowthRoute =
  | '/magina'
  | '/magina/mercado'
  | '/magina/tiempo'
  | '/magina/campo'
  | '/magina/noticias'
  | '/magina/directorio';
type GrowthChannel = 'native' | 'whatsapp' | 'copy';
type GrowthReferrer = 'direct' | 'google' | 'bing' | 'social' | 'other';

type GrowthEventBody = {
  event: GrowthEvent;
  route: GrowthRoute;
  channel?: GrowthChannel;
  source?: string;
  medium?: string;
  campaign?: string;
  referrer: GrowthReferrer;
};

type RateBucket = {
  startedAt: number;
  count: number;
};

const GROWTH_PATH = '/api/public/growth/events';
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;
const rateBuckets = new Map<string, RateBucket>();
const trustedOriginSet = new Set(trustedOrigins);
let lastRateSweepAt = 0;

const bodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['event', 'route', 'referrer'],
  properties: {
    event: { type: 'string', enum: ['public_page_view', 'share_started', 'share_completed'] },
    route: {
      type: 'string',
      enum: [
        '/magina',
        '/magina/mercado',
        '/magina/tiempo',
        '/magina/campo',
        '/magina/noticias',
        '/magina/directorio',
      ],
    },
    channel: { type: 'string', enum: ['native', 'whatsapp', 'copy'] },
    source: { type: 'string', maxLength: 80, pattern: '^[A-Za-z0-9._-]*$' },
    medium: { type: 'string', maxLength: 80, pattern: '^[A-Za-z0-9._-]*$' },
    campaign: { type: 'string', maxLength: 80, pattern: '^[A-Za-z0-9._-]*$' },
    referrer: { type: 'string', enum: ['direct', 'google', 'bing', 'social', 'other'] },
  },
} as const;

function growthEnabled(): boolean {
  return process.env.PUBLIC_GROWTH_MEASUREMENT_ENABLED === 'true';
}

function requestOriginAllowed(request: FastifyRequest): boolean {
  const fetchSiteHeader = request.headers['sec-fetch-site'];
  const fetchSite = Array.isArray(fetchSiteHeader) ? fetchSiteHeader[0] : fetchSiteHeader;
  if (fetchSite === 'cross-site') return false;

  const origin = request.headers.origin;
  if (!origin) return false;
  return trustedOriginSet.has(origin);
}

function sweepExpiredRateBuckets(now: number): void {
  if (now - lastRateSweepAt < RATE_WINDOW_MS) return;
  lastRateSweepAt = now;

  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(key);
  }
}

function consumeRateLimit(ip: string, now = Date.now()): boolean {
  sweepExpiredRateBuckets(now);

  const existing = rateBuckets.get(ip);
  if (!existing || now - existing.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(ip, { startedAt: now, count: 1 });
    return true;
  }

  if (existing.count >= RATE_MAX) return false;
  existing.count += 1;
  return true;
}

function semanticBodyValid(body: GrowthEventBody): boolean {
  if (body.event === 'public_page_view') return body.channel === undefined;
  return body.channel !== undefined;
}

export function registerPublicGrowthRoutes(app: FastifyInstance): void {
  app.post<{ Body: GrowthEventBody }>(
    GROWTH_PATH,
    {
      bodyLimit: 2_048,
      schema: { body: bodySchema },
    },
    async (request, reply) => {
      if (!growthEnabled()) {
        return reply.code(404).send({
          code: 'GROWTH_MEASUREMENT_DISABLED',
          message: 'Public growth measurement is not enabled',
        });
      }

      if (!requestOriginAllowed(request)) {
        return reply.code(403).send({
          code: 'GROWTH_ORIGIN_REJECTED',
          message: 'Public growth event origin rejected',
        });
      }

      if (!consumeRateLimit(request.ip)) {
        return reply.code(429).send({
          code: 'GROWTH_RATE_LIMITED',
          message: 'Too many public growth events',
        });
      }

      const body = request.body;
      if (!semanticBodyValid(body)) {
        return reply.code(400).send({
          code: 'INVALID_GROWTH_EVENT',
          message: 'Growth event and channel combination is invalid',
        });
      }

      const channel = body.channel ?? '';
      const source = body.source ?? '';
      const medium = body.medium ?? '';
      const campaign = body.campaign ?? '';

      await getPool().query(
        `
          insert into public_growth_daily (
            bucket_date,
            event,
            route,
            channel,
            utm_source,
            utm_medium,
            utm_campaign,
            referrer_category,
            event_count,
            updated_at
          ) values (
            (now() at time zone 'Europe/Madrid')::date,
            $1, $2, $3, $4, $5, $6, $7, 1, now()
          )
          on conflict (
            bucket_date,
            event,
            route,
            channel,
            utm_source,
            utm_medium,
            utm_campaign,
            referrer_category
          ) do update set
            event_count = public_growth_daily.event_count + 1,
            updated_at = now()
        `,
        [body.event, body.route, channel, source, medium, campaign, body.referrer],
      );

      return reply.code(202).send({ accepted: true });
    },
  );
}
