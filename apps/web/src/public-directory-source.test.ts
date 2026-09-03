import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('public Sierra Mágina seed keeps the audited 23-entity universe', async () => {
  const migration = await read('../../../db/migrations/0005_public_magina_destinations.sql');
  const ids = migration.match(/10000000-0000-4000-8000-0000000000\d{2}/g) ?? [];
  const uniqueIds = new Set(ids);

  assert.equal(uniqueIds.size, 23);
  assert.match(migration, /Aceites Campoliva, S\.L\./);
  assert.match(migration, /S\.C\.A\. San Sebastián/);
  assert.match(migration, /Oleozumo, S\.L\./);
  assert.match(migration, /Thuelma, S\.L\./);
  assert.match(migration, /entity_type in \('cooperative', 'sat', 'company', 'other'\)/);
  assert.match(migration, /2026-09-02T00:00:00Z/);
});

test('public directory UI does not imply private cooperation or integration', async () => {
  const page = await read('./MaginaDirectoryPage.tsx');

  assert.match(page, /no significa que la entidad colabore con Mágina Olivo/i);
  assert.match(page, /ni que exista integración con su área privada/i);
  assert.match(page, /source\.checkedAt/);
  assert.match(page, /Cooperativa/);
  assert.match(page, /S\.A\.T\./);
  assert.match(page, /Empresa \/ almazara/);
});
