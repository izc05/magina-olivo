import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = (name: string) => readFile(new URL(name, import.meta.url), 'utf8');

test('the global action center uses real routes and carries the chosen farm context', async () => {
  const [center, app, map] = await Promise.all([source('./FieldActionCenter.tsx'), source('./App.tsx'), source('./PlotMapPanel.tsx')]);
  assert.match(center, /selectedFarmId/);
  assert.match(center, /onSelectFarm/);
  assert.match(center, /contextualHref/);
  assert.match(center, /Finca para la nueva acción/);
  assert.match(center, /const requestedPlotId = initialPlotId \|\| new URLSearchParams\(window\.location\.search\)\.get\('parcela'\)/);
  assert.match(center, /id="action-plot"/);
  assert.match(center, /Nueva finca/);
  for (const route of ['/mi-campo/cuaderno?new=activity', '/mi-campo/tratamientos?new=activity', '/mi-campo/riegos?new=activity', '/campana?new=delivery', '/calendario?new=task', '/mi-campo/mapa?new=plot', '/mi-campo/recursos']) assert.ok(center.includes(route), route);
  assert.match(center, /lucide-react/);
  assert.doesNotMatch(center, /🚜|📋|💧|🌱|👨‍🌾|⚙️|📦|📝|🏞️/);
  assert.match(app, /aria-label="Centro de acciones"/);
  assert.match(map, /get\('new'\) === 'plot'/);
});
