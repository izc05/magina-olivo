import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyNewsFreshness } from './news-freshness.ts';

const now = new Date('2026-09-03T12:00:00Z');

test('classifies recent public news as fresh for 14 days', () => {
  assert.deepEqual(classifyNewsFreshness('2026-09-02T00:00:00Z', now), { status: 'fresh', ageDays: 1 });
  assert.equal(classifyNewsFreshness('2026-08-20T12:00:00Z', now).status, 'fresh');
});

test('keeps news visible but aging from day 15 through day 45', () => {
  assert.equal(classifyNewsFreshness('2026-08-19T00:00:00Z', now).status, 'aging');
  assert.equal(classifyNewsFreshness('2026-07-20T12:00:00Z', now).status, 'aging');
});

test('classifies older news as archive instead of current', () => {
  assert.equal(classifyNewsFreshness('2026-07-19T00:00:00Z', now).status, 'archive');
});

test('does not trust missing, invalid or implausibly future publication dates', () => {
  assert.deepEqual(classifyNewsFreshness(null, now), { status: 'unknown', ageDays: null });
  assert.deepEqual(classifyNewsFreshness('not-a-date', now), { status: 'unknown', ageDays: null });
  assert.deepEqual(classifyNewsFreshness('2026-09-06T00:00:00Z', now), { status: 'unknown', ageDays: null });
});
