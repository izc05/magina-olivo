import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('Catastro INSPIRE consultation is wired behind our authenticated backend adapter', async () => {
  const app = await read('../../api/src/app.ts');
  const routes = await read('../../api/src/catastro-map-routes.ts');
  const client = await read('../../api/src/catastro-client.ts');
  const panel = await read('./CatastroParcelPanel.tsx');

  assert.match(app, /registerCatastroMapRoutes/);
  assert.match(routes, /\/api\/v1\/maps\/catastro\/parcelas/);
  assert.match(routes, /getAuthenticatedSession/);
  assert.match(routes, /INVALID_CATASTRO_BBOX/);
  assert.match(routes, /CATASTRO_UNAVAILABLE/);
  assert.match(routes, /private, max-age=300/);

  assert.match(client, /ovc\.catastro\.meh\.es\/INSPIRE\/wfsCP\.aspx/);
  assert.match(client, /EPSG::3857/);
  assert.match(client, /CATASTRO_TIMEOUT_MS = 8_000/);
  assert.match(client, /MAX_XML_BYTES = 2_000_000/);
  assert.match(client, /AbortSignal\.timeout/);

  assert.match(panel, /Buscar parcelas catastrales cercanas/);
  assert.match(panel, /\/api\/v1\/maps\/catastro\/parcelas/);
  assert.match(panel, /Catastro y SIGPAC no son equivalentes/);
  assert.match(panel, /Usar como perímetro/);
  assert.match(panel, /Confirmar perímetro Catastro/);
  assert.match(panel, /Dirección General del Catastro|DGC/);
});

test('Catastro import is re-fetched and verified server-side by cadastral reference', async () => {
  const routes = await read('../../api/src/catastro-map-routes.ts');
  const client = await read('../../api/src/catastro-client.ts');
  const panel = await read('./CatastroParcelPanel.tsx');
  const plotRoutes = await read('../../api/src/plot-routes.ts');
  const migration = await read('../../../db/migrations/0017_plot_cadastral_reference.sql');

  assert.match(panel, /confirmImportId !== selected\.id/);
  assert.match(panel, /\/api\/v1\/plots\/\$\{selectedPlot\.id\}\/import-catastro/);
  assert.match(panel, /cadastralReference: selected\.nationalCadastralReference/);
  assert.doesNotMatch(panel, /boundarySource:\s*'catastro'|source:\s*'catastro'/);

  assert.match(routes, /fetchCatastroParcelByReference\(reference\)/);
  assert.match(routes, /boundary_source = 'catastro'/);
  assert.match(routes, /boundary_external_id = \$3/);
  assert.match(routes, /boundary_source_checked_at = \$4/);
  assert.match(routes, /cadastral_reference = \$3/);
  assert.match(client, /STOREDQUERY_ID/);
  assert.match(client, /GetParcel/);

  assert.match(plotRoutes, /cadastral_reference/);
  assert.match(plotRoutes, /enum: \['manual_map', 'manual_gps', 'imported'\]/);
  assert.doesNotMatch(plotRoutes, /enum: \[[^\]]*'catastro'/);
  assert.match(migration, /cadastral_reference text/);
  assert.match(migration, /\^\[A-Z0-9\]\{14\}\$/);
});
