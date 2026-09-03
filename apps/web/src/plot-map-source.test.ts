import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('plot map is wired into Mi Campo and supports point plus boundary editing', async () => {
  const notebook = await read('./FieldNotebook.tsx');
  const map = await read('./PlotMapPanel.tsx');

  assert.match(notebook, /import \{ PlotMapPanel \}/);
  assert.match(notebook, /<PlotMapPanel farmId=\{farmId\}/);
  assert.match(map, /Mapa de Parcelas/);
  assert.match(map, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(map, /enableHighAccuracy: true/);
  assert.match(map, /Guardar ubicación/);
  assert.match(map, /Guardar perímetro/);
  assert.match(map, /Añadir mi posición/);
  assert.match(map, /tile\.openstreetmap\.org/);
  assert.match(map, /OpenStreetMap contributors/);
  assert.match(map, /polygonFromVertices/);
  assert.match(map, /polygonAreaSquareMeters/);
  assert.match(map, /credentials: 'include'/);
});

test('plot point and boundary persistence remain private and server-validated', async () => {
  const routes = await read('../../api/src/plot-routes.ts');
  const migration = await read('../../../db/migrations/0015_plot_boundaries.sql');

  assert.match(routes, /\/api\/v1\/plots\/:plotId\/location/);
  assert.match(routes, /INCOMPLETE_PLOT_LOCATION/);
  assert.match(routes, /\/api\/v1\/plots\/:plotId\/boundary/);
  assert.match(routes, /INCOMPLETE_PLOT_BOUNDARY/);
  assert.match(routes, /INVALID_PLOT_BOUNDARY/);
  assert.match(routes, /validateBoundary/);
  assert.match(routes, /polygonAreaSquareMeters/);
  assert.match(routes, /uniqueVertices\.size < 3/);
  assert.match(routes, /ring\.length > 501/);
  assert.match(routes, /boundary_area_ha = \$2/);
  assert.match(routes, /version = version \+ 1/);
  assert.match(routes, /canWrite\(resolved\.access\.role\)/);

  assert.match(migration, /boundary_geojson jsonb/);
  assert.match(migration, /boundary_area_ha numeric\(12,4\)/);
  assert.match(migration, /manual_map/);
  assert.match(migration, /manual_gps/);
  assert.match(migration, /sigpac/);
  assert.match(migration, /catastro/);
});
