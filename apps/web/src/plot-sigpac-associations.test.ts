import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('Mi Campo exposes explicit SIGPAC association controls only for Catastro plots', async () => {
  const panel = await read('./PlotMapPanel.tsx');
  const associations = await read('./PlotSigpacAssociationPanel.tsx');

  assert.match(panel, /PlotSigpacAssociationPanel/);
  assert.match(associations, /boundarySource === 'catastro'/);
  assert.match(associations, /Ver recintos SIGPAC de esta zona/);
  assert.match(associations, /Catastro y SIGPAC son fuentes diferentes/);
  assert.match(associations, /tú decides cuáles quieres asociar/);
});

test('candidate review never auto-associates and does not claim geometric equivalence', async () => {
  const associations = await read('./PlotSigpacAssociationPanel.tsx');
  assert.match(associations, /type="checkbox"/);
  assert.match(associations, /Posible solape/);
  assert.match(associations, /Cercano/);
  assert.match(associations, /Guardar recintos asociados/);
  assert.doesNotMatch(associations, /equivalente/i);
  assert.doesNotMatch(associations, /automáticamente asociados/i);
});

test('SIGPAC association save sends only recinto ids and preserves olive/agronomic fields', async () => {
  const associations = await read('./PlotSigpacAssociationPanel.tsx');
  assert.match(associations, /method: 'PUT'/);
  assert.match(associations, /JSON\.stringify\(\{ recintoIds: selectedIds \}\)/);
  assert.doesNotMatch(associations, /boundaryGeoJson:/);
  assert.doesNotMatch(associations, /oliveTreeCount:/);
  assert.doesNotMatch(associations, /irrigationType:/);
  assert.match(associations, /nunca modifica el perímetro Catastro/);
});
