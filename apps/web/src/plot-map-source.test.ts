import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('plot map is wired into Mi Campo and supports point plus boundary editing', async () => {
  const notebook = await read('./FieldNotebook.tsx');
  const panel = await read('./PlotMapPanel.tsx');
  const editor = await read('./PlotMapEditor.tsx');

  assert.match(notebook, /import \{ PlotMapPanel \}/);
  assert.match(notebook, /<PlotMapPanel farmId=\{farmId\}/);
  assert.match(panel, /PlotMapEditor/);
  assert.match(panel, /SigpacRecintoPanel/);
  assert.match(editor, /Mapa de Parcelas/);
  assert.match(editor, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(editor, /enableHighAccuracy: true/);
  assert.match(editor, /Guardar ubicación/);
  assert.match(editor, /Guardar perímetro/);
  assert.match(editor, /Añadir mi posición/);
  assert.match(editor, /tile\.openstreetmap\.org/);
  assert.match(editor, /OpenStreetMap contributors/);
  assert.match(editor, /polygonFromVertices/);
  assert.match(editor, /polygonAreaSquareMeters/);
  assert.match(editor, /credentials: 'include'/);
});

test('plot point and boundary persistence remain private and server-validated', async () => {
  const routes = await read('../../api/src/plot-routes.ts');
  const geometry = await read('../../api/src/plot-boundary-geometry.ts');
  const migration = await read('../../../db/migrations/0015_plot_boundaries.sql');

  assert.match(routes, /\/api\/v1\/plots\/:plotId\/location/);
  assert.match(routes, /INCOMPLETE_PLOT_LOCATION/);
  assert.match(routes, /\/api\/v1\/plots\/:plotId\/boundary/);
  assert.match(routes, /INCOMPLETE_PLOT_BOUNDARY/);
  assert.match(routes, /INVALID_PLOT_BOUNDARY/);
  assert.match(routes, /validateBoundary/);
  assert.match(routes, /boundary_area_ha = \$2/);
  assert.match(routes, /version = version \+ 1/);
  assert.match(routes, /canWrite\(resolved\.access\.role\)/);

  assert.match(geometry, /polygonAreaSquareMeters/);
  assert.match(geometry, /uniqueVertices\.size < 3/);
  assert.match(geometry, /ring\.length > 501/);

  assert.match(migration, /boundary_geojson jsonb/);
  assert.match(migration, /boundary_area_ha numeric\(12,4\)/);
  assert.match(migration, /manual_map/);
  assert.match(migration, /manual_gps/);
  assert.match(migration, /sigpac/);
  assert.match(migration, /catastro/);
});

test('official SIGPAC or Catastro provenance is preserved until the user actually edits the perimeter', async () => {
  const editor = await read('./PlotMapEditor.tsx');

  assert.match(editor, /function isOfficialBoundarySource/);
  assert.match(editor, /source === 'sigpac' \|\| source === 'catastro'/);
  assert.match(editor, /if \(isOfficialBoundarySource\(boundaryDraftSource\)\)/);
  assert.match(editor, /El perímetro oficial ya está guardado/);
  assert.match(editor, /function undoBoundaryVertex/);
  assert.match(editor, /isOfficialBoundarySource\(current\) \? 'manual_map' : current/);
  assert.match(editor, /onClick=\{undoBoundaryVertex\}/);
  assert.match(editor, /SIGPAC y Catastro se consultan e importan como fuentes oficiales separadas y verificables/);
  assert.doesNotMatch(editor, /SIGPAC y Catastro se conectarán/);
});
