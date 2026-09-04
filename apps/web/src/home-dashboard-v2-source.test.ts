import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('Visual V2 home is the real authenticated landing surface', async () => {
  const [app, home, main, styles] = await Promise.all([
    read('./App.tsx'),
    read('./HomeDashboardV2.tsx'),
    read('./main.tsx'),
    read('./home-dashboard-v2.css'),
  ]);

  assert.match(app, /import \{ HomeDashboardV2 \} from '\.\/HomeDashboardV2'/);
  assert.match(app, /tab === 'home'[\s\S]*?<HomeDashboardV2/);
  assert.match(main, /import '\.\/home-dashboard-v2\.css'/);

  assert.match(home, /\/api\/v1\/public\/municipalities/);
  assert.match(home, /\/api\/v1\/public\/weather\?municipality=/);
  assert.match(home, /\/api\/v1\/public\/news/);
  assert.match(home, /\/api\/v1\/public\/field-alerts/);
  assert.match(home, /\/api\/v1\/account\/rain-alerts/);
  assert.match(home, /\/api\/v1\/public\/market\/olive-oil/);
  assert.match(home, /item\.key === 'extra'/);
  assert.match(home, /item\.key === 'virgin'/);
  assert.match(home, /item\.key === 'lampante'/);
  assert.match(home, /summary\?\.pendingResultCount/);
  assert.match(home, /summary\?\.totalKilograms/);
  assert.match(home, /summary\?\.weightedYieldPercent/);

  assert.match(styles, /\.home-v2-weather/);
  assert.match(styles, /\.home-v2-market-card/);
  assert.match(styles, /\.home-v2-market-mini/);
  assert.match(styles, /\.home-v2-alert-card/);
  assert.match(styles, /@media \(max-width: 520px\)/);
});

test('Home keeps the approved product hierarchy without inventing private or market data', async () => {
  const home = await read('./HomeDashboardV2.tsx');

  assert.match(home, /HOY EN TU CAMPO/);
  assert.match(home, /ACEITE Y MERCADO/);
  assert.match(home, /ALERTAS/);
  assert.match(home, /NOTICIAS DESTACADAS/);
  assert.match(home, /Campaña \{campaignLabel\}/);
  assert.doesNotMatch(home, /localStorage/);
  assert.doesNotMatch(home, /Math\.random/);
  assert.doesNotMatch(home, /\b\d+[,.]\d+\s*€\/kg\b/);
});
