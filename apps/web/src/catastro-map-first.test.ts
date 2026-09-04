import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  DEFAULT_CATASTRO_CENTER,
  MIN_CATASTRO_ZOOM,
  exteriorRings,
  geometryCenter,
  isSimpleImportablePolygon,
  panCenter,
  viewportBbox,
  type CatastroGeometry,
} from './catastro-selector-map.ts';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('map-first viewport stays inside Catastro V1 bbox limits at minimum query zoom', () => {
  const bbox = viewportBbox(DEFAULT_CATASTRO_CENTER, MIN_CATASTRO_ZOOM);
  assert.ok(bbox.maxLon - bbox.minLon > 0);
  assert.ok(bbox.maxLat - bbox.minLat > 0);
  assert.ok(bbox.maxLon - bbox.minLon <= 0.05);
  assert.ok(bbox.maxLat - bbox.minLat <= 0.05);
});

test('map-first pan changes center without requiring a private plot', () => {
  const next = panCenter(DEFAULT_CATASTRO_CENTER, 17, 100, -50);
  assert.notEqual(next.longitude, DEFAULT_CATASTRO_CENTER.longitude);
  assert.notEqual(next.latitude, DEFAULT_CATASTRO_CENTER.latitude);
});

test('Catastro geometry helpers keep complex parcels visible but non-importable', () => {
  const polygon: CatastroGeometry = {
    type: 'Polygon',
    coordinates: [[[-3.5, 37.7], [-3.49, 37.7], [-3.49, 37.71], [-3.5, 37.7]]],
  };
  const multi: CatastroGeometry = {
    type: 'MultiPolygon',
    coordinates: [
      [[[-3.5, 37.7], [-3.49, 37.7], [-3.49, 37.71], [-3.5, 37.7]]],
      [[[-3.48, 37.7], [-3.47, 37.7], [-3.47, 37.71], [-3.48, 37.7]]],
    ],
  };
  assert.equal(isSimpleImportablePolygon(polygon), true);
  assert.equal(isSimpleImportablePolygon(multi), false);
  assert.equal(exteriorRings(multi).length, 2);
  assert.ok(geometryCenter(multi));
});

test('selector is wired into Mi Campo and preserves explicit user selection semantics', async () => {
  const panel = await read('./PlotMapPanel.tsx');
  const selector = await read('./CatastroMapFirstSelector.tsx');
  const routes = await read('../../api/src/catastro-map-routes.ts');

  assert.match(panel, /CatastroMapFirstSelector/);
  assert.match(selector, /Buscar mis parcelas en el mapa/);
  assert.match(selector, /MIN_CATASTRO_ZOOM/);
  assert.match(selector, /450/);
  assert.match(selector, /AbortController/);
  assert.match(selector, /selectedReferences/);
  assert.match(selector, /Ya está añadida|ya está añadida|ya está añadida a esta finca/);
  assert.match(selector, /14, 18 o 20 caracteres/);
  assert.match(selector, /Mi ubicación/);
  assert.match(selector, /aria-pressed=\{isSelected\}/);
  assert.match(selector, /Continuar con esta parcela/);
  assert.match(selector, /no interpreta la selección como prueba de propiedad/);

  assert.match(routes, /\/api\/v1\/maps\/catastro\/parcelas\/by-reference\/:reference/);
  assert.match(routes, /fetchCatastroParcelByReference\(reference\)/);
  assert.match(routes, /cache-control', 'private, max-age=300/);
});

test('batch review keeps olive count individual per parcel and confirms through the server', async () => {
  const selector = await read('./CatastroMapFirstSelector.tsx');
  const review = await read('./CatastroBatchReview.tsx');
  const routes = await read('../../api/src/catastro-batch-import-routes.ts');

  assert.match(selector, /CatastroBatchReview/);
  assert.match(review, /Olivos en esta parcela/);
  assert.match(review, /oliveTreeCount: draft\.oliveTreeCount/);
  assert.match(review, /Aplicar riego a todas/);
  assert.doesNotMatch(review, /Aplicar olivos a todas/);
  assert.match(review, /\/api\/v1\/farms\/\$\{farmId\}\/plots\/import-catastro/);
  assert.match(review, /El lote es todo-o-nada/);
  assert.match(review, /Los olivos y el riego son datos privados declarados por ti/);

  assert.match(routes, /oliveTreeCount\?: number \| null/);
  assert.match(routes, /fetchCatastroParcelByReference\(reference\)/);
  assert.match(routes, /validationItems\.some/);
  assert.match(routes, /await client\.query\('begin'\)/);
  assert.match(routes, /await client\.query\('commit'\)/);
});
