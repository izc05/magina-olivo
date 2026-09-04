import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('new farm Catastro import is holding-scoped and uses the shared verified preparation', async () => {
  const routes = await read('./catastro-farm-import-routes.ts');
  const service = await read('./catastro-import-service.ts');
  const app = await read('./app.ts');

  assert.match(routes, /\/api\/v1\/holdings\/:holdingId\/farms\/import-catastro/);
  assert.match(routes, /getAuthenticatedSession/);
  assert.match(routes, /getHoldingAccess\(session\.user\.id, request\.params\.holdingId\)/);
  assert.match(routes, /canWrite\(access\.role\)/);
  assert.match(routes, /prepareCatastroBatch\(/);
  assert.match(routes, /access\.holdingId/);
  assert.match(service, /fetchCatastroParcelByReference\(reference\)/);
  assert.match(service, /where holding_id = \$1/);
  assert.match(app, /registerCatastroFarmImportRoutes/);
});

test('farm is created only after every Catastro parcel is ready and inside the same transaction', async () => {
  const routes = await read('./catastro-farm-import-routes.ts');

  const validationPosition = routes.indexOf("batch.validationItems.some");
  const beginPosition = routes.indexOf("client.query('begin')");
  const farmInsertPosition = routes.indexOf('insert into farms');
  const plotInsertCallPosition = routes.indexOf('insertPreparedCatastroPlots(', farmInsertPosition);
  const commitPosition = routes.indexOf("client.query('commit')", plotInsertCallPosition);

  assert.ok(validationPosition >= 0);
  assert.ok(beginPosition > validationPosition);
  assert.ok(farmInsertPosition > beginPosition);
  assert.ok(plotInsertCallPosition > farmInsertPosition);
  assert.ok(commitPosition > plotInsertCallPosition);
  assert.match(routes, /client\.query\('rollback'\)/);
  assert.match(routes, /No se ha creado la finca ni ninguna parcela/);
});

test('concurrent duplicate Catastro reference rolls back the new farm as well as its plots', async () => {
  const routes = await read('./catastro-farm-import-routes.ts');
  const migration = await read('../../../db/migrations/0019_plot_cadastral_unique.sql');

  assert.match(routes, /pgError\.code === '23505'/);
  assert.match(routes, /client\.query\('rollback'\)/);
  assert.match(routes, /duplicateRaceValidation/);
  assert.match(routes, /where holding_id = \$1/);
  assert.match(migration, /plots_holding_cadastral_active_uq/);
});
