import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('plot SIGPAC association routes are private, bounded and server verified', async () => {
  const source = await read('./plot-sigpac-association-routes.ts');
  assert.match(source, /getAuthenticatedSession/);
  assert.match(source, /getPlotAccess/);
  assert.match(source, /canWrite/);
  assert.match(source, /MAX_ASSOCIATED_RECINTOS = 20/);
  assert.match(source, /fetchSigpacRecintos\(searchBbox\)/);
  assert.match(source, /fetchSigpacRecintoById\(recintoId\)/);
  assert.match(source, /candidate-only/);
  assert.match(source, /likely-overlap/);
  assert.doesNotMatch(source, /classification:\s*['"]equivalent['"]/);
});

test('saving SIGPAC associations is all-or-nothing and never overwrites Catastro plot authority', async () => {
  const source = await read('./plot-sigpac-association-routes.ts');
  assert.match(source, /await client\.query\('begin'\)/);
  assert.match(source, /await client\.query\('commit'\)/);
  assert.match(source, /await client\.query\('rollback'\)/);
  assert.match(source, /update plot_sigpac_recintos/);
  assert.doesNotMatch(source, /update plots\s+set/i);
  assert.doesNotMatch(source, /set\s+boundary_geojson/i);
  assert.doesNotMatch(source, /set\s+boundary_source/i);
  assert.doesNotMatch(source, /set\s+cadastral_reference/i);
  assert.match(source, /catastroBoundaryPreserved:\s*true/);
});

test('SIGPAC association migration keeps a separate 1:N model with verified snapshots', async () => {
  const migration = await read('../../../db/migrations/0020_plot_sigpac_recintos.sql');
  assert.match(migration, /create table plot_sigpac_recintos/);
  assert.match(migration, /foreign key \(plot_id, holding_id\) references plots\(id, holding_id\) on delete cascade/);
  assert.match(migration, /geometry_geojson jsonb not null/);
  assert.match(migration, /source_checked_at timestamptz not null/);
  assert.match(migration, /where active = true/);
  assert.match(migration, /plot_sigpac_recintos_active_uq/);
});

test('association routes are registered in the API app', async () => {
  const app = await read('./app.ts');
  assert.match(app, /registerPlotSigpacAssociationRoutes/);
});
