import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyNdvi, buildCopernicusWmsUrl, evaluatePlotNdvi } from './sentinel-ndvi.ts';

test('classifyNdvi categorizes NDVI ranges accurately', () => {
  assert.equal(classifyNdvi(0.1).status, 'low');
  assert.equal(classifyNdvi(0.3).status, 'moderate');
  assert.equal(classifyNdvi(0.5).status, 'good');
  assert.equal(classifyNdvi(0.7).status, 'high');
});

test('buildCopernicusWmsUrl generates valid WMS request URL', () => {
  const url = buildCopernicusWmsUrl([-3.55, 37.70, -3.50, 37.75]);
  assert.ok(url.startsWith('https://shservices.sentinel-hub.com/ogc/wms/v1'));
  assert.ok(url.includes('LAYERS=NDVI'));
  assert.ok(url.includes('BBOX=-3.55,37.7,-3.5,37.75'));
});

test('evaluatePlotNdvi combines classification and tile URL', () => {
  const result = evaluatePlotNdvi(0.52, [-3.55, 37.70, -3.50, 37.75]);
  assert.equal(result.status, 'good');
  assert.ok(result.wmsTileUrl.includes('LAYERS=NDVI'));
});
