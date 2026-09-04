import assert from 'node:assert/strict';
import test from 'node:test';
import { bboxesIntersect, expandSigpacBbox, geometryBbox } from './plot-sigpac-geometry.ts';
import type { GeoJsonPolygon } from './plot-boundary-geometry.ts';

test('SIGPAC candidate bbox derives from the verified Catastro perimeter', () => {
  const boundary: GeoJsonPolygon = {
    type: 'Polygon',
    coordinates: [[
      [-3.52, 37.74],
      [-3.51, 37.74],
      [-3.51, 37.75],
      [-3.52, 37.75],
      [-3.52, 37.74],
    ]],
  };
  assert.deepEqual(geometryBbox(boundary), {
    minLon: -3.52,
    minLat: 37.74,
    maxLon: -3.51,
    maxLat: 37.75,
  });
});

test('SIGPAC search bbox adds a small margin without breaking the adapter maximum span', () => {
  const expanded = expandSigpacBbox({ minLon: -3.52, minLat: 37.74, maxLon: -3.51, maxLat: 37.75 });
  assert.ok(expanded);
  assert.ok(expanded!.minLon < -3.52);
  assert.ok(expanded!.maxLon > -3.51);
  assert.ok(expanded!.minLat < 37.74);
  assert.ok(expanded!.maxLat > 37.75);
  assert.ok(expanded!.maxLon - expanded!.minLon <= 0.05);
  assert.ok(expanded!.maxLat - expanded!.minLat <= 0.05);
});

test('candidate classification uses conservative bbox intersection rather than claiming equivalence', () => {
  const plot = { minLon: -3.52, minLat: 37.74, maxLon: -3.51, maxLat: 37.75 };
  assert.equal(bboxesIntersect(plot, { minLon: -3.515, minLat: 37.745, maxLon: -3.505, maxLat: 37.755 }), true);
  assert.equal(bboxesIntersect(plot, { minLon: -3.50, minLat: 37.76, maxLon: -3.49, maxLat: 37.77 }), false);
});

test('oversized parcel bbox is rejected instead of issuing an unbounded SIGPAC query', () => {
  assert.equal(expandSigpacBbox({ minLon: -3.60, minLat: 37.70, maxLon: -3.50, maxLat: 37.71 }), null);
});
