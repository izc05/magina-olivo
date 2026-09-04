import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('Catastro batch import is bounded, authenticated and server-verified through the shared service', async () => {
  const routes = await read('./catastro-batch-import-routes.ts');
  const service = await read('./catastro-import-service.ts');
  const app = await read('./app.ts');

  assert.match(routes, /MAX_CATASTRO_BATCH_SIZE/);
  assert.match(routes, /\/api\/v1\/farms\/:farmId\/plots\/import-catastro/);
  assert.match(routes, /getAuthenticatedSession/);
  assert.match(routes, /getFarmAccess/);
  assert.match(routes, /canWrite\(access\.role\)/);
  assert.match(routes, /prepareCatastroBatch/);
  assert.match(routes, /insertPreparedCatastroPlots/);
  assert.match(service, /fetchCatastroParcelByReference\(reference\)/);
  assert.match(service, /validateBoundary\(boundary\)/);
  assert.match(service, /MAX_CATASTRO_BATCH_SIZE = 10/);
  assert.match(service, /oliveTreeCount/);
  assert.match(service, /irrigationType/);
  assert.match(service, /oliveVariety/);
  assert.doesNotMatch(routes, /boundary:\s*\{/);
  assert.match(app, /registerCatastroBatchImportRoutes/);
});

test('Catastro batch import prevalidates every item and creates all plots in one transaction', async () => {
  const routes = await read('./catastro-batch-import-routes.ts');
  const service = await read('./catastro-import-service.ts');

  assert.match(routes, /batch\.validationItems\.some\(/);
  assert.match(routes, /item\.status !== 'ready'/);
  assert.match(routes, /reply\.code\(409\)\.send\(failureResponse/);
  assert.match(routes, /client\.query\('begin'\)/);
  assert.match(routes, /insertPreparedCatastroPlots/);
  assert.match(routes, /client\.query\('commit'\)/);
  assert.match(routes, /client\.query\('rollback'\)/);
  assert.match(service, /boundary_geojson/);
  assert.match(service, /boundary_external_id/);
  assert.match(service, /boundary_source_checked_at/);
  assert.match(service, /'catastro'/);
  assert.match(service, /cadastral_reference/);
});

test('Catastro batch import rejects duplicates before and during concurrent creation', async () => {
  const routes = await read('./catastro-batch-import-routes.ts');
  const service = await read('./catastro-import-service.ts');
  const migration = await read('../../../db/migrations/0019_plot_cadastral_unique.sql');

  assert.match(service, /new Map<string, number>/);
  assert.match(service, /counts\.get\(reference\)/);
  assert.match(service, /existingReferences\.has\(reference\)/);
  assert.match(service, /status: 'duplicate'/);
  assert.match(routes, /pgError\.code === '23505'/);
  assert.match(routes, /duplicateRaceValidation/);
  assert.match(migration, /create unique index plots_holding_cadastral_active_uq/);
  assert.match(migration, /holding_id, cadastral_reference/);
  assert.match(migration, /where active = true and cadastral_reference is not null/);
});
