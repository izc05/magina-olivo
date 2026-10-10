import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('territorial migration 0050 extends municipalities with INE code and centroids for Bedmar and Jódar', async () => {
  const migration = await read('../../../db/migrations/0050_territorial_foundation.sql');

  assert.match(migration, /add column if not exists ine_code char\(5\)/);
  assert.match(migration, /add column if not exists electronic_seat_url text/);
  assert.match(migration, /add column if not exists center_latitude double precision/);

  assert.match(migration, /slug = 'bedmar-y-garciez'/);
  assert.match(migration, /ine_code = '23902'/);
  assert.match(migration, /https:\/\/bedmargarciez.sedelectronica.es\//);

  assert.match(migration, /slug = 'jodar'/);
  assert.match(migration, /ine_code = '23053'/);
  assert.match(migration, /https:\/\/jodar.sedelectronica.es\//);
});

test('territorial migration 0050 inserts verified irrigation communities for Bedmar and Jódar', async () => {
  const migration = await read('../../../db/migrations/0050_territorial_foundation.sql');

  assert.match(migration, /Comunidad de Regantes Canal del Jandulilla/);
  assert.match(migration, /BOE-B-2025-14108/);
  assert.match(migration, /https:\/\/canaljandulilla.com\//);

  assert.match(migration, /Comunidad de Regantes Lagunillas y Cerrón/);
  assert.match(migration, /BOE-B-2026-19273/);

  assert.match(migration, /Comunidad de Regantes Caz de los Molinos de Jódar/);
  assert.match(migration, /BOP Jaén 2025-03-14 \/ BOP 2019-05-09 Edicto 1899/);

  assert.match(migration, /S.A.T. Fique \(Regantes\)/);
  assert.match(migration, /BOE-B-2025-43655/);
});

test('territorial migration 0050 prepares community notices and plot links with strict checks', async () => {
  const migration = await read('../../../db/migrations/0050_territorial_foundation.sql');

  assert.match(migration, /create table if not exists community_water_notices/);
  assert.match(migration, /check \(ends_at >= starts_at\)/);
  assert.match(migration, /create table if not exists plot_irrigation_links/);
  assert.match(migration, /check \(water_supply_type in \('gravity_acequia', 'drip_pressurized', 'well_private', 'dryland', 'other'\)\)/);
});

test('homonymous entities and sector uniqueness maintain strict constraints without collisions', async () => {
  const migration = await read('../../../db/migrations/0050_territorial_foundation.sql');

  // Verifica restricción de unicidad para sectores por comunidad y código de sector
  assert.match(migration, /unique \(community_id, sector_code\)/);

  // Comprueba que cada comunidad insertada tiene su propio UUID único
  assert.match(migration, /'20000000-0000-4000-8000-000000000001'/); // Canal del Jandulilla
  assert.match(migration, /'20000000-0000-4000-8000-000000000002'/); // Lagunillas y Cerrón
  assert.match(migration, /'20000000-0000-4000-8000-000000000003'/); // Caz de los Molinos
  assert.match(migration, /'20000000-0000-4000-8000-000000000004'/); // SAT Fique
});

test('community water notices handle revoked/cancelled status and missing entity gracefully', async () => {
  const routes = await read('../../api/src/public-irrigation-routes.ts');

  // Soporta filtrado por estado incluyendo avisos revocados/cancelados
  assert.match(routes, /enum: \['published', 'revoked', 'expired', 'all'\]/);

  // Maneja datos inexistentes devolviendo 404 estricto en lugar de respuestas ambiguas
  assert.match(routes, /reply\.code\(404\)\.send\(\{/);
  assert.match(routes, /Comunidad de regantes no encontrada o inactiva/);
});

test('security of access ensures public territorial routes never query private plots or holdings', async () => {
  const routes = await read('../../api/src/public-irrigation-routes.ts');

  // Comprueba que las consultas públicas leen únicamente tablas territoriales verificadas
  assert.match(routes, /from irrigation_communities/);
  assert.match(routes, /from community_water_notices/);

  // No consulta ni expone información privada de parcelas, fincas o explotaciones
  assert.doesNotMatch(routes, /from plots/);
  assert.doesNotMatch(routes, /from holdings/);
  assert.doesNotMatch(routes, /from activities/);
});
