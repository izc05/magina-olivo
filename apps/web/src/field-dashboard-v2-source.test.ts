import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('Mi Campo Visual V2 is wired to real MVP Core field data', async () => {
  const [app, dashboard, main, notebook] = await Promise.all([
    read('./App.tsx'),
    read('./FieldDashboardV2.tsx'),
    read('./main.tsx'),
    read('./FieldNotebook.tsx'),
  ]);

  assert.match(app, /import \{ FieldDashboardV2 \} from '\.\/FieldDashboardV2'/);
  assert.match(app, /tab === 'field'[\s\S]*?<FieldTab/);
  assert.match(app, /<FieldDashboardV2/);
  assert.match(app, /createHolding=\{holdings\.length === 0 \? <CreateHoldingCard/);
  assert.match(app, /createFarm=\{selectedHolding \? <CreateFarmCard/);
  assert.match(app, /createPlot=\{selectedFarm \? <CreatePlotCard/);
  assert.match(app, /notebook=\{selectedFarm && selectedHolding \? <FieldNotebook/);
  assert.match(main, /import '\.\/field-dashboard-v2\.css'/);

  assert.match(dashboard, /Finca activa/);
  assert.match(dashboard, /Superficie/);
  assert.match(dashboard, /Parcelas/);
  assert.match(dashboard, /Olivos/);
  assert.match(dashboard, /SIGPAC/);
  assert.match(dashboard, /\/calendario/);
  assert.match(dashboard, /onNavigate\('campaign'\)/);
  assert.doesNotMatch(dashboard, /localStorage/);
  assert.doesNotMatch(dashboard, /Math\.random/);

  assert.match(notebook, /PlotMapPanel/);
  assert.match(notebook, /api\.plotTimeline/);
  assert.match(notebook, /api\.createActivity/);
});

test('Mi Campo keeps map and cuaderno attached to the selected real farm', async () => {
  const app = await read('./App.tsx');
  assert.match(app, /farmId=\{selectedFarm\.id\}/);
  assert.match(app, /plots=\{plots\}/);
  assert.match(app, /reloadPlots=\{\(\) => loadPlots\(selectedFarmId\)\}/);
});

test('parcel map keeps real editor behavior while using the Visual V2 layer', async () => {
  const [editor, styles] = await Promise.all([
    read('./PlotMapEditor.tsx'),
    read('./plot-map.css'),
  ]);

  assert.match(editor, /\/api\/v1\/farms\/\$\{farmId\}\/plots/);
  assert.match(editor, /\/api\/v1\/plots\/\$\{selectedPlot\.id\}\/location/);
  assert.match(editor, /\/api\/v1\/plots\/\$\{selectedPlot\.id\}\/boundary/);
  assert.match(editor, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(editor, /tile\.openstreetmap\.org/);
  assert.match(editor, /Guardar perímetro/);

  assert.match(styles, /\.plot-map-shell \{/);
  assert.match(styles, /var\(--v2-olive-deep/);
  assert.match(styles, /var\(--v2-gold/);
  assert.match(styles, /\.plot-map-editor image/);
  assert.match(styles, /@media \(max-width: 620px\)/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /forced-colors/);
});
