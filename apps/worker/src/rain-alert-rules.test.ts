import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePlace, selectRainTriggers } from './rain-alert-rules.ts';

test('normalizePlace matches accents and whitespace consistently', () => {
  assert.equal(normalizePlace('  Bélmez   de la Moraleda '), 'belmez de la moraleda');
  assert.equal(normalizePlace('Garcíez'), 'garciez');
});

test('selectRainTriggers only evaluates the configured horizon', () => {
  const triggers = selectRainTriggers([
    { date: '2026-09-04', precipitationProbabilityPercent: 40 },
    { date: '2026-09-05', precipitationProbabilityPercent: 70 },
    { date: '2026-09-06', precipitationProbabilityPercent: 95 },
  ], 60, 2);

  assert.deepEqual(triggers, [
    { date: '2026-09-05', precipitationProbabilityPercent: 70 },
  ]);
});

test('selectRainTriggers includes the threshold boundary and ignores missing values', () => {
  const triggers = selectRainTriggers([
    { date: '2026-09-04', precipitationProbabilityPercent: null },
    { date: '2026-09-05', precipitationProbabilityPercent: 60 },
  ], 60, 2);

  assert.deepEqual(triggers, [
    { date: '2026-09-05', precipitationProbabilityPercent: 60 },
  ]);
});
