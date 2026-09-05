import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(path: string): Promise<string> {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('Mi Campo keeps the private farm overview wired to real holdings and farms', async () => {
  const app = await source('./App.tsx');
  const vite = await source('../vite.config.ts');

  assert.match(app, /<PrivateAccessGate returnTo=\{window\.location\.pathname\} \/>/);
  assert.match(app, /api\.farms\(holdingId\)/);
  assert.match(app, /farms\.map\(\(farm\) =>/);
  assert.match(app, /onClick=\{\(\) => setSelectedFarmId\(farm\.id\)\}/);
  assert.match(app, /aria-pressed=\{farm\.id === selectedFarmId\}/);
  assert.match(app, /api\.createFarm\(holdingId, body\)/);
  assert.match(app, /Aún no has añadido ninguna finca\./);
  assert.match(app, /Añadir mi primera finca/);
  assert.match(app, /<FieldNotebook holdingId=\{selectedHolding\.id\} farmId=\{selectedFarm\.id\} plots=\{plots\} \/>/);
  assert.ok(vite.includes('urlPattern: /\\/api\\/v1\\/public\\//'));
  assert.equal(vite.includes('urlPattern: /\\/api\\/v1\\//,'), false);
});

test('farm detail and plots remain a local visual layer over the existing private contract', async () => {
  const app = await source('./App.tsx');

  assert.match(app, /void loadPlots\(selectedFarmId\)/);
  assert.match(app, /const \[selectedPlotId, setSelectedPlotId\] = useState\(''\)/);
  assert.match(app, /plots\.some\(\(plot\) => plot\.id === current\)/);
  assert.match(app, /<section className="farm-detail-card"/);
  assert.match(app, /plots\.map\(\(plot\) =>/);
  assert.match(app, /onClick=\{\(\) => setSelectedPlotId\(plot\.id\)\}/);
  assert.match(app, /aria-pressed=\{plot\.id === selectedPlotId\}/);
  assert.match(app, /Aún no has añadido parcelas a esta finca\./);
  assert.match(app, /api\.createPlot\(farmId, body\)/);
  assert.match(app, /<FieldNotebook holdingId=\{selectedHolding\.id\} farmId=\{selectedFarm\.id\} plots=\{plots\} \/>/);
  assert.doesNotMatch(app, /boundaryGeoJson|<polygon/);
});
