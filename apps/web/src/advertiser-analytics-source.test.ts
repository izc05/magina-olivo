import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('./AdvertiserAnalyticsPage.tsx', import.meta.url), 'utf8');
const admin = await readFile(new URL('./AdminAdvertisingAnalyticsPage.tsx', import.meta.url), 'utf8');
const main = await readFile(new URL('./main.tsx', import.meta.url), 'utf8');

test('advertiser analytics use only advertiser-scoped endpoints', () => {
  assert.match(page, /\/api\/v1\/advertiser\/analytics/);
  assert.match(page, /\/api\/v1\/advertiser\/analytics\/export\.csv/);
  assert.doesNotMatch(page, /\/api\/v1\/admin\//);
});

test('analytics routes are explicit and separated', () => {
  assert.match(main, /path === '\/anunciante\/estadisticas'/);
  assert.match(main, /path === '\/admin\/estadisticas'/);
  assert.match(admin, /\/api\/v1\/admin\/advertising\/analytics\/benchmark/);
});

test('advertiser page communicates aggregate privacy', () => {
  assert.match(page, /sin seguimiento personal/i);
  assert.match(page, /agregados diarios del propio anunciante/i);
});

test('admin benchmark surfaces cohort suppression', () => {
  assert.match(admin, /Muestra insuficiente/);
  assert.match(admin, /minimumCohortSize/);
});
