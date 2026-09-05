import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { classifyOliveOilMarketFreshness } from './public-market-routes.ts';
import type { OliveOilMarketSnapshot } from './olive-oil-market-provider.ts';

function snapshot(endDate: string | null): OliveOilMarketSnapshot {
  return {
    provider: 'Observatorio',
    sourceUrl: 'https://www.juntadeandalucia.es/example',
    checkedAt: '2026-09-04T10:00:00.000Z',
    position: 'Almazara o Bodega',
    scope: 'Andalucía',
    unit: '€/kg',
    weeks: [{ week: 35, label: 'Semana 35', startDate: '2026-08-24', endDate }],
    series: [
      { key: 'extra', label: 'Virgen extra', values: [3.61] },
      { key: 'virgin', label: 'Virgen', values: [3.29] },
      { key: 'lampante', label: 'Lampante', values: [3.14] },
    ],
  };
}

test('classifies a recent official weekly market date as fresh without using fetch time as freshness', () => {
  const result = classifyOliveOilMarketFreshness(snapshot('2026-08-30'), new Date('2026-09-04T12:00:00Z'));
  assert.equal(result.status, 'fresh');
  assert.equal(result.latestDate, '2026-08-30');
  assert.ok(result.ageDays != null && result.ageDays >= 4 && result.ageDays <= 5);
});

test('keeps missing source publication date explicit', () => {
  assert.deepEqual(
    classifyOliveOilMarketFreshness(snapshot(null), new Date('2026-09-04T12:00:00Z')),
    { status: 'unknown', ageDays: null, latestDate: null },
  );
});

test('public olive oil route is registered and does not accept a caller supplied source URL', async () => {
  const appSource = await readFile(new URL('./app.ts', import.meta.url), 'utf8');
  const routeSource = await readFile(new URL('./public-market-routes.ts', import.meta.url), 'utf8');

  assert.match(appSource, /registerPublicMarketRoutes\(app\)/);
  assert.match(routeSource, /'\/api\/v1\/public\/market\/olive-oil'/);
  assert.match(routeSource, /fetchOliveOilMarketSnapshot\(\)/);
  assert.match(routeSource, /degraded-cache/);
  assert.doesNotMatch(routeSource, /request\.query.*(?:url|source)/i);
});
