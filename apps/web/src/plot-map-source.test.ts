import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('plot map is wired into Mi Campo and supports explicit device geolocation', async () => {
  const notebook = await read('./FieldNotebook.tsx');
  const map = await read('./PlotMapPanel.tsx');

  assert.match(notebook, /import \{ PlotMapPanel \}/);
  assert.match(notebook, /<PlotMapPanel farmId=\{farmId\}/);
  assert.match(map, /Mapa de Parcelas/);
  assert.match(map, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(map, /enableHighAccuracy: true/);
  assert.match(map, /Guardar ubicación/);
  assert.match(map, /openstreetmap\.org\/export\/embed\.html/);
  assert.match(map, /credentials: 'include'/);
});

test('plot location persistence remains private and validates complete coordinates', async () => {
  const routes = await read('../../api/src/plot-routes.ts');

  assert.match(routes, /latitude, longitude/);
  assert.match(routes, /\/api\/v1\/plots\/:plotId\/location/);
  assert.match(routes, /canWrite\(access\.role\)/);
  assert.match(routes, /INCOMPLETE_PLOT_LOCATION/);
  assert.match(routes, /latitude between -90 and 90|minimum: -90/);
  assert.match(routes, /longitude between -180 and 180|minimum: -180/);
  assert.match(routes, /version = version \+ 1/);
});
