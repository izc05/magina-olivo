import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('parcel comparator is wired into the map workflow after the private editor', async () => {
  const mapPanel = await read('./PlotMapPanel.tsx');
  const comparator = await read('./ParcelSourceComparisonPanel.tsx');

  assert.match(mapPanel, /ParcelSourceComparisonPanel/);
  assert.match(mapPanel, /revision=\{mapRevision\}/);
  assert.match(comparator, /Comparador de parcela/);
  assert.match(comparator, /Superficie declarada/);
  assert.match(comparator, /Superficie geométrica/);
  assert.match(comparator, /Referencia SIGPAC/);
  assert.match(comparator, /Referencia catastral/);
  assert.match(comparator, /boundarySourceCheckedAt/);
  assert.match(comparator, /Actualizar comparación/);
});

test('parcel comparator is read-only and does not choose an administrative truth', async () => {
  const comparator = await read('./ParcelSourceComparisonPanel.tsx');

  assert.match(comparator, /\/api\/v1\/farms\/\$\{farmId\}\/plots/);
  assert.match(comparator, /credentials: 'include'/);
  assert.doesNotMatch(comparator, /method:\s*['"](?:POST|PATCH|PUT|DELETE)['"]/);
  assert.doesNotMatch(comparator, /\/import-sigpac|\/import-catastro|\/boundary/);
  assert.match(comparator, /No se elige automáticamente una superficie “correcta”/);
  assert.match(comparator, /pueden responder a finalidades distintas/);
});

test('official provenance remains distinguishable from manual and imported geometry', async () => {
  const comparator = await read('./ParcelSourceComparisonPanel.tsx');

  assert.match(comparator, /SIGPAC verificado/);
  assert.match(comparator, /Catastro verificado/);
  assert.match(comparator, /Perímetro dibujado/);
  assert.match(comparator, /Perímetro GPS/);
  assert.match(comparator, /Geometría externa sin certificación oficial activa/);
  assert.match(comparator, /boundaryExternalId/);
});
