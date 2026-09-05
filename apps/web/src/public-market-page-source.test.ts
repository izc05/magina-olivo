import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('market page uses the official synchronized olive oil endpoint without hardcoded prices', async () => {
  const page = await read('./MaginaMarketPage.tsx');

  assert.match(page, /\/api\/v1\/public\/market\/olive-oil/);
  assert.match(page, /Virgen extra/);
  assert.match(page, /Virgen/);
  assert.match(page, /Lampante/);
  assert.match(page, /<polyline/);
  assert.match(page, /Evolución sincronizada/);
  assert.match(page, /market\.source\.position/);
  assert.match(page, /market\.freshness\.latestDate/);
  assert.match(page, /Consultar fuente oficial/);
  assert.match(page, /Reintentar/);
  assert.match(page, /Mercado ≠ liquidación de tu cooperativa/);
  assert.match(page, /Tus rendimientos, anticipos, liquidaciones y pagos pertenecen a tu histórico privado/);
  assert.doesNotMatch(page, /\b\d+[,.]\d+\s*€\/kg\b/);
});

test('market chart differentiates all three categories beyond a single visual line', async () => {
  const css = await read('./magina-market.css');

  assert.match(css, /market-chart-series--extra/);
  assert.match(css, /market-chart-series--virgin/);
  assert.match(css, /market-chart-series--lampante/);
  assert.match(css, /stroke-dasharray/);
  assert.match(css, /market-chart-legend/);
  assert.match(css, /@media \(max-width: 520px\)/);
});
