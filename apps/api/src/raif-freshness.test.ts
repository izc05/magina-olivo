import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyRaifFreshness } from './raif-freshness.ts';

const now = new Date('2026-09-03T12:00:00Z');

test('classifies a weekly RAIF update as current within 10 days', () => {
  assert.deepEqual(classifyRaifFreshness('2026-08-31T00:00:00Z', now), {
    status: 'current',
    ageDays: 3,
  });
});

test('asks for review between 11 and 17 days', () => {
  assert.equal(classifyRaifFreshness('2026-08-20T00:00:00Z', now).status, 'review');
});

test('marks RAIF data stale after 17 days', () => {
  assert.equal(classifyRaifFreshness('2026-08-10T00:00:00Z', now).status, 'stale');
});

test('does not trust missing, invalid or far-future timestamps', () => {
  assert.equal(classifyRaifFreshness(null, now).status, 'unknown');
  assert.equal(classifyRaifFreshness('not-a-date', now).status, 'unknown');
  assert.equal(classifyRaifFreshness('2026-09-10T00:00:00Z', now).status, 'unknown');
});
