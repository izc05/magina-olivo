import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('Catastro batch import is bounded, authenticated and server-verified', async () => {
  const routes = await read('./catastro-batch-import-routes.ts');
  const app = await read('./app.ts');

  assert.match(routes, /MAX_BATCH_SIZE = 10/);
  assert.match(routes, /\/api\/v1\/farms\/:farmId\/plots\/import-catastro/);
  assert.match(routes, /getAuthenticatedSession/);
  assert.match(routes, /getFarmAccess/);
  assert.match(routes, /canWrite\(access\.role\)/);
  assert.match(routes, /fetchCatastroParcelByReference\(reference\)/);
  assert.match(routes, /validateBoundary\(boundary\)/);
  assert.match(routes, /oliveTreeCount/);
  assert.match(routes, /irrigationType/);
  assert.match(routes, /oliveVariety/);
  assert.doesNotMatch(routes, /boundary:\s*\{/);
  assert.match(app, /registerCatastroBatchImportRoutes/);
});

test('Catastro batch import prevalidates every item and creates all plots in one transaction', async () => {
  const routes = await read('./catastro-batch-import-routes.ts');

  assert.match(routes, /validationItems\s*=\s*inputs\.map/);
  assert.match(routes, /validationItems\.some\(/);
  assert.match(routes, /\.status\s*!==\s*'ready'/);
  assert.match(routes, /reply\.code\(409\)\.send\(failureResponse/);
  assert.match(routes, /client\.query\('begin'\)/);
  assert.match(routes, /client\.query\('commit'\)/);
  assert.match(routes, /client\.query\('rollback'\)/);
  assert.match(routes, /boundary_source/);
  assert.match(routes, /boundary_external_id/);
  assert.match(routes, /boundary_source_checked_at/);
  assert.match(routes, /'catastro'/);
  assert.match(routes, /cadastral_reference/);
});

test('Catastro batch import rejects duplicates before and during concurrent creation', async () => {
  const routes = await read('./catastro-batch-import-routes.ts');
  const migration = await read('../../../db/migrations/0019_plot_cadastral_unique.sql');

  assert.match(routes, /new Map<string,\s*number>/);
  assert.match(routes, /counts\.get\(reference\)/);
  assert.match(routes, /existingRefs\.has\(reference\)/);
  assert.match(routes, /status:\s*'duplicate'/);
  assert.match(routes, /pgError\.code\s*===\s*'23505'/);
  assert.match(migration, /create unique index plots_holding_cadastral_active_uq/);
  assert.match(migration, /holding_id, cadastral_reference/);
  assert.match(migration, /where active = true and cadastral_reference is not null/);
});
