import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const routeSource = readFileSync(new URL('./public-growth-routes.ts', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('./app.ts', import.meta.url), 'utf8');
const migrationSource = readFileSync(
  new URL('../../../db/migrations/0018_public_growth_daily.sql', import.meta.url),
  'utf8',
);

test('public growth endpoint is disabled by default and same-origin only', () => {
  assert.match(routeSource, /PUBLIC_GROWTH_MEASUREMENT_ENABLED === 'true'/);
  assert.match(routeSource, /const GROWTH_PATH = '\/api\/public\/growth\/events'/);
  assert.match(routeSource, /bodyLimit: 2_048/);
  assert.match(routeSource, /additionalProperties: false/);
  assert.match(routeSource, /if \(fetchSite === 'cross-site'\) return false/);
  assert.match(routeSource, /if \(!origin\) return false/);
  assert.match(routeSource, /trustedOriginSet\.has\(origin\)/);
});

test('public growth schema is restricted to public routes and low-cardinality attribution', () => {
  for (const route of [
    '/magina',
    '/magina/mercado',
    '/magina/tiempo',
    '/magina/campo',
    '/magina/noticias',
    '/magina/directorio',
  ]) {
    assert.ok(routeSource.includes(`'${route}'`), `missing public growth route: ${route}`);
  }

  for (const forbidden of ['/cuenta', '/calendario', '/onboarding', '/register', '/reset-password']) {
    assert.ok(!routeSource.includes(`'${forbidden}'`), `private route leaked into growth endpoint: ${forbidden}`);
  }

  assert.match(routeSource, /maxLength: 80/);
  assert.match(routeSource, /'direct', 'google', 'bing', 'social', 'other'/);
  assert.match(routeSource, /'native', 'whatsapp', 'copy'/);
});

test('growth persistence aggregates directly instead of storing visitor-level events', () => {
  assert.match(routeSource, /insert into public_growth_daily/);
  assert.match(routeSource, /on conflict/);
  assert.match(routeSource, /event_count = public_growth_daily\.event_count \+ 1/);
  assert.match(routeSource, /Europe\/Madrid/);
  assert.doesNotMatch(routeSource, /insert into public_growth_events|insert into growth_events/i);

  assert.match(migrationSource, /create table public_growth_daily/);
  assert.match(migrationSource, /event_count bigint not null default 1/);
  assert.match(migrationSource, /primary key/);
  assert.doesNotMatch(
    migrationSource,
    /\b(user_id|account_id|visitor_id|session_id|ip_address|user_agent|device_id|farm_id|plot_id|campaign_id|document_id|event_id)\b/i,
  );
});

test('rate limiting uses only an expiring in-memory IP bucket', () => {
  assert.match(routeSource, /const rateBuckets = new Map<string, RateBucket>\(\)/);
  assert.match(routeSource, /const RATE_WINDOW_MS = 60_000/);
  assert.match(routeSource, /if \(now - bucket\.startedAt >= RATE_WINDOW_MS\) rateBuckets\.delete\(key\)/);
  assert.match(routeSource, /consumeRateLimit\(request\.ip\)/);
  assert.doesNotMatch(migrationSource, /\bip_address\b/i);
});

test('growth route is registered in the API app', () => {
  assert.match(appSource, /registerPublicGrowthRoutes/);
  assert.match(appSource, /registerPublicGrowthRoutes\(app\)/);
});
