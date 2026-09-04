import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const generator = readFileSync(new URL('../scripts/generate-discovery.mjs', import.meta.url), 'utf8');
const enrichment = readFileSync(new URL('../scripts/enrich-discovery.mjs', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  scripts?: Record<string, string>;
};

test('web build generates public discovery assets', () => {
  assert.match(packageJson.scripts?.build ?? '', /generate-discovery\.mjs/);
  assert.match(packageJson.scripts?.build ?? '', /enrich-discovery\.mjs/);
  assert.match(generator, /sitemap\.xml/);
  assert.match(generator, /robots\.txt/);
  assert.match(generator, /llms\.txt/);
  assert.match(generator, /OAI-SearchBot/);
  assert.match(generator, /ChatGPT-User/);
  assert.match(generator, /SoftwareApplication/);
  assert.match(generator, /application\/ld\+json/);
});

test('rich discovery semantics stay explicit and truthful', () => {
  assert.match(enrichment, /Organization/);
  assert.match(enrichment, /BreadcrumbList/);
  assert.match(enrichment, /isAccessibleForFree/);
  assert.match(enrichment, /price:\s*0/);
  assert.match(enrichment, /priceCurrency:\s*'EUR'/);
  assert.match(enrichment, /publisher/);
  assert.match(enrichment, /spatialCoverage/);
  assert.match(enrichment, /Sierra Mágina, Jaén, Andalucía, España/);
});

test('crawlable public context describes the real information model', () => {
  for (const expectedTerm of [
    'AOVE',
    'aceite virgen',
    'lampante',
    'AEMET',
    'RAIF',
    'fuente original',
    'cooperativas y almazaras',
    'data-discovery-context',
  ]) {
    assert.ok(enrichment.includes(expectedTerm), `missing crawlable public context: ${expectedTerm}`);
  }
});

test('public discovery routes remain explicit', () => {
  for (const publicRoute of [
    '/magina/mercado',
    '/magina/tiempo',
    '/magina/campo',
    '/magina/noticias',
    '/magina/directorio',
    '/precio-aceite-oliva-hoy',
    '/precio-aove-jaen',
    '/tiempo-sierra-magina',
    '/alertas-olivar-jaen',
    '/noticias-olivar-jaen',
    '/cooperativas-sierra-magina',
  ]) {
    assert.ok(generator.includes(publicRoute), `missing public discovery route: ${publicRoute}`);
  }
});

test('private UI routes publish noindex shells while server endpoints remain crawler-blocked', () => {
  for (const privateRoute of [
    '/cuenta',
    '/calendario',
    '/onboarding',
    '/register',
    '/reset-password',
  ]) {
    assert.ok(generator.includes(privateRoute), `missing private noindex route: ${privateRoute}`);
  }

  assert.match(generator, /renderPrivateRoute/);
  assert.match(generator, /noindex,nofollow,noarchive,nosnippet/);
  assert.match(generator, /data-private-noindex/);
  assert.match(generator, /crawlerBlockedPaths/);
  assert.ok(generator.includes('/api/'));
  assert.ok(generator.includes('/health/'));
});

test('social previews are generated per canonical public section', () => {
  assert.match(generator, /writeSocialCards/);
  assert.match(generator, /socialCardSvg/);
  assert.match(generator, /summary_large_image/);
  assert.match(generator, /og:image/);
  assert.match(generator, /twitter:image/);
  assert.match(generator, /image\/svg\+xml/);
  assert.match(generator, /width=\"1200\"/);
  assert.match(generator, /height=\"630\"/);
  assert.match(generator, /hreflang=\"es-ES\"/);
  assert.match(generator, /hreflang=\"x-default\"/);
});

test('sitemap is restricted to canonical routes and does not fake lastmod on every build', () => {
  assert.match(generator, /route\.path === route\.canonicalPath/);
  assert.ok(generator.includes('rel=\"canonical\"'));
  assert.doesNotMatch(generator, /<lastmod>/);
  assert.doesNotMatch(generator, /new Date\(\)\.toISOString/);
});
