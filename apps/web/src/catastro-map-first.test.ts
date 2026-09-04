import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  buildCatastroSelectorMap,
  DEFAULT_CATASTRO_CENTER,
  MIN_CATASTRO_ZOOM,
  exteriorRings,
  geometryCenter,
  isSimpleImportablePolygon,
  panCenter,
  pnoaTileUrl,
  viewportBbox,
  type CatastroGeometry,
} from './catastro-selector-map.ts';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('map-first viewport stays inside Catastro V1 bbox limits', () => {
  const bbox = viewportBbox(DEFAULT_CATASTRO_CENTER, MIN_CATASTRO_ZOOM);
  assert.ok(bbox.maxLon - bbox.minLon > 0 && bbox.maxLon - bbox.minLon <= 0.05);
  assert.ok(bbox.maxLat - bbox.minLat > 0 && bbox.maxLat - bbox.minLat <= 0.05);
});

test('map-first pan changes center without private plot', () => {
  const next = panCenter(DEFAULT_CATASTRO_CENTER, 17, 100, -50);
  assert.notEqual(next.longitude, DEFAULT_CATASTRO_CENTER.longitude);
});

test('complex Catastro geometry stays visible but non-importable', () => {
  const polygon: CatastroGeometry = { type: 'Polygon', coordinates: [[[-3.5, 37.7], [-3.49, 37.7], [-3.49, 37.71], [-3.5, 37.7]]] };
  const multi: CatastroGeometry = { type: 'MultiPolygon', coordinates: [[[[-3.5, 37.7], [-3.49, 37.7], [-3.49, 37.71], [-3.5, 37.7]]], [[[-3.48, 37.7], [-3.47, 37.7], [-3.47, 37.71], [-3.48, 37.7]]]] };
  assert.equal(isSimpleImportablePolygon(polygon), true);
  assert.equal(isSimpleImportablePolygon(multi), false);
  assert.equal(exteriorRings(multi).length, 2);
  assert.ok(geometryCenter(multi));
});

test('PNOA uses official IGN WMTS GoogleMapsCompatible contract', () => {
  const url = new URL(pnoaTileUrl(18, 128743, 101234));
  assert.equal(url.origin, 'https://www.ign.es');
  assert.equal(url.pathname, '/wmts/pnoa-ma');
  assert.equal(url.searchParams.get('LAYER'), 'OI.OrthoimageCoverage');
  assert.equal(url.searchParams.get('TILEMATRIXSET'), 'GoogleMapsCompatible');
  const map = buildCatastroSelectorMap(DEFAULT_CATASTRO_CENTER, 18, 'pnoa');
  assert.ok(map.tiles.every((tile) => tile.href.startsWith('https://www.ign.es/wmts/pnoa-ma?')));
});

test('selector remains explicit, server-verified and usable before a farm exists', async () => {
  const panel = await read('./PlotMapPanel.tsx');
  const selector = await read('./CatastroMapFirstSelector.tsx');
  const routes = await read('../../api/src/catastro-map-routes.ts');

  assert.match(panel, /CatastroMapFirstSelector/);
  assert.match(selector, /holdingId: string/);
  assert.match(selector, /farmId\?: string/);
  assert.match(selector, /if \(!farmId\)/);
  assert.match(selector, /Buscar mis parcelas en el mapa/);
  assert.match(selector, /selectedReferences/);
  assert.match(selector, /14, 18 o 20 caracteres/);
  assert.match(selector, /Mi ubicación/);
  assert.match(selector, /no acredita titularidad ni propiedad/);
  assert.match(selector, /defaultDestination=\{farmId \? 'existing' : 'new'\}/);
  assert.match(routes, /fetchCatastroParcelByReference\(reference\)/);
});

test('batch review keeps olives individual and supports explicit shared irrigation and variety', async () => {
  const review = await read('./CatastroBatchReview.tsx');
  const service = await read('../../api/src/catastro-import-service.ts');

  assert.match(review, /Olivos en esta parcela/);
  assert.match(review, /Aplicar riego a todas/);
  assert.match(review, /Aplicar variedad a todas/);
  assert.doesNotMatch(review, /Aplicar olivos a todas/);
  assert.match(review, /Variedad principal o mezcla/);
  assert.match(review, /Notas \(opcional\)/);
  assert.match(review, /oliveVariety: draft\.oliveVariety\.trim\(\) \|\| null/);
  assert.match(review, /Olivos, riego, variedad y notas son datos privados declarados por ti/);
  assert.match(review, /const VARIETIES = \['Picual'/);
  assert.doesNotMatch(review, /oliveVariety: 'Picual'/);
  assert.match(service, /oliveVariety\?: string \| null/);
  assert.match(service, /olive_variety/);
  assert.match(service, /fetchCatastroParcelByReference\(reference\)/);
});

test('batch review can create a new farm and plots in the same explicit flow', async () => {
  const review = await read('./CatastroBatchReview.tsx');
  const selector = await read('./CatastroMapFirstSelector.tsx');
  const farmRoutes = await read('../../api/src/catastro-farm-import-routes.ts');

  assert.match(review, /Crear una finca nueva/);
  assert.match(review, /Nombre de la finca nueva/);
  assert.match(review, /\/api\/v1\/holdings\/\$\{holdingId\}\/farms\/import-catastro/);
  assert.match(review, /farm: \{ name: farmName\.trim\(\) \}/);
  assert.match(review, /Crear finca y/);
  assert.match(review, /La finca y el lote son todo-o-nada/);
  assert.match(selector, /allowCreateFarm = true/);
  assert.match(farmRoutes, /insert into farms/);
  assert.match(farmRoutes, /insertPreparedCatastroPlots/);
  assert.match(farmRoutes, /client\.query\('rollback'\)/);
});

test('PNOA, SIGPAC and private plot layers remain visual aids', async () => {
  const selector = await read('./CatastroMapFirstSelector.tsx');
  const overlays = await read('./OfficialMapOverlays.tsx');
  const styles = await read('./official-map-layers.css');
  assert.match(selector, /Ortofoto PNOA/);
  assert.match(selector, /Hemos vuelto al mapa sin perder tu selección/);
  assert.match(overlays, /\/api\/v1\/maps\/sigpac\/recintos\?/);
  assert.doesNotMatch(overlays, /method:\s*['"]POST['"]/);
  assert.match(styles, /pointer-events:\s*none/);
});

test('editable agronomy profile is mounted and never infers Picual', async () => {
  const panel = await read('./PlotMapPanel.tsx');
  const profile = await read('./PlotOliveCountPanel.tsx');
  const api = await read('../../api/src/plot-agronomy-routes.ts');
  assert.match(panel, /PlotOliveCountPanel/);
  assert.match(profile, /Ficha agrícola por parcela/);
  assert.match(profile, /Picual/);
  assert.doesNotMatch(profile, /useState\('Picual'\)/);
  assert.match(profile, /Densidad pendiente/);
  assert.match(api, /olive_variety/);
  assert.match(api, /canWrite/);
});
