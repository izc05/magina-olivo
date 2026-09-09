import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = (name: string) => readFile(new URL(name, import.meta.url), 'utf8');

test('the global action center keeps additions in one contextual flow', async () => {
  const [center, app, map] = await Promise.all([source('./FieldActionCenter.tsx'), source('./App.tsx'), source('./PlotMapPanel.tsx')]);
  assert.match(center, /selectedFarmId/);
  assert.match(center, /onSelectFarm/);
  assert.match(center, /onSaved/);
  assert.match(center, /api\.createActivity/);
  assert.match(center, /api\.createDelivery/);
  assert.match(center, /api\.createTask/);
  assert.match(center, /api\.createFarm/);
  assert.match(center, /api\.createPlot/);
  assert.match(center, /isoDateTime\(values\.get\('occurredAt'\)\)/);
  assert.match(center, /DESTINATION_REQUIRED/);
  assert.match(center, /field-action-form-title/);
  assert.match(center, /const requestedPlotId = initialPlotId \|\| new URLSearchParams\(window\.location\.search\)\.get\('parcela'\)/);
  assert.match(center, /aria-label="Parcela para la nueva acción"/);
  assert.match(center, /Nueva finca/);
  for (const label of ['Trabajo', 'Tratamiento', 'Riego', 'Entrega', 'Tarea', 'Nueva parcela', 'Nueva finca']) assert.ok(center.includes(label), label);
  assert.doesNotMatch(center, /field-action-more/);
  assert.match(center, /lucide-react/);
  assert.doesNotMatch(center, /🚜|📋|💧|🌱|👨‍🌾|⚙️|📦|📝|🏞️/);
  assert.match(app, /aria-label="Centro de acciones"/);
  assert.match(app, /holdingId=\{selectedHoldingId\}/);
  assert.match(map, /get\('new'\) === 'plot'/);
});
