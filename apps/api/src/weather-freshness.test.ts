import assert from 'node:assert/strict';
import test from 'node:test';
import { canServeWeatherFallback, classifyWeatherFreshness } from './weather-freshness.ts';

const NOW = Date.parse('2026-09-03T18:00:00Z');

test('classifies recent weather as fresh', () => {
  assert.deepEqual(classifyWeatherFreshness('2026-09-03T06:00:00', NOW), {
    status: 'fresh',
    ageHours: 12,
  });
});

test('classifies intermediate weather as aging', () => {
  assert.deepEqual(classifyWeatherFreshness('2026-09-02T18:00:00Z', NOW), {
    status: 'aging',
    ageHours: 24,
  });
});

test('classifies old weather as stale', () => {
  assert.deepEqual(classifyWeatherFreshness('2026-09-01T18:00:00+00:00', NOW), {
    status: 'stale',
    ageHours: 48,
  });
});

test('does not claim freshness for missing, invalid or implausibly future timestamps', () => {
  assert.deepEqual(classifyWeatherFreshness(null, NOW), { status: 'unknown', ageHours: null });
  assert.deepEqual(classifyWeatherFreshness('not-a-date', NOW), { status: 'unknown', ageHours: null });
  assert.deepEqual(classifyWeatherFreshness('2026-09-04T06:00:00Z', NOW), { status: 'unknown', ageHours: null });
});

test('tolerates small provider or clock skew without reporting a negative age', () => {
  assert.deepEqual(classifyWeatherFreshness('2026-09-03T20:00:00Z', NOW), {
    status: 'fresh',
    ageHours: 0,
  });
});

test('only fresh or aging forecasts may be served while AEMET is unavailable', () => {
  assert.equal(canServeWeatherFallback({ status: 'fresh', ageHours: 2 }), true);
  assert.equal(canServeWeatherFallback({ status: 'aging', ageHours: 30 }), true);
  assert.equal(canServeWeatherFallback({ status: 'stale', ageHours: 48 }), false);
  assert.equal(canServeWeatherFallback({ status: 'unknown', ageHours: null }), false);
});
