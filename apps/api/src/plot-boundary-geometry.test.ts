import assert from 'node:assert/strict';
import test from 'node:test';
import { polygonAreaSquareMeters, validateBoundary, type GeoJsonPolygon } from './plot-boundary-geometry.ts';

const square: GeoJsonPolygon = {
  type: 'Polygon',
  coordinates: [[
    [-3.5000, 37.7000],
    [-3.4990, 37.7000],
    [-3.4990, 37.7010],
    [-3.5000, 37.7010],
    [-3.5000, 37.7000],
  ]],
};

test('boundary area is deterministic and plausible for a known small square', () => {
  const ring = square.coordinates[0]!;
  const first = polygonAreaSquareMeters(ring);
  const second = polygonAreaSquareMeters(ring);

  assert.equal(first, second);
  assert.ok(first > 9_000, `expected > 9000 m², got ${first}`);
  assert.ok(first < 11_000, `expected < 11000 m², got ${first}`);
});

test('valid closed polygon returns area in hectares', () => {
  const result = validateBoundary(square);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(result.areaHa > 0.9);
  assert.ok(result.areaHa < 1.1);
});

test('open ring is rejected', () => {
  const open: GeoJsonPolygon = {
    type: 'Polygon',
    coordinates: [[
      [-3.5000, 37.7000],
      [-3.4990, 37.7000],
      [-3.4990, 37.7010],
      [-3.5000, 37.7010],
    ]],
  };
  const result = validateBoundary(open);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.message, /closed/);
});

test('boundary with fewer than three distinct vertices is rejected', () => {
  const invalid: GeoJsonPolygon = {
    type: 'Polygon',
    coordinates: [[
      [-3.5000, 37.7000],
      [-3.4990, 37.7000],
      [-3.5000, 37.7000],
      [-3.5000, 37.7000],
    ]],
  };
  const result = validateBoundary(invalid);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.message, /distinct vertices/);
});
