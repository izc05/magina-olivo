import assert from 'node:assert/strict';
import test from 'node:test';
import { areaDifferencePercent, differenceBand, numericArea } from './parcel-source-comparison.ts';

function assertClose(actual: number | null, expected: number): void {
  assert.notEqual(actual, null);
  assert.ok(Math.abs(actual! - expected) < 1e-9, `expected ${actual} to be close to ${expected}`);
}

test('parcel comparison computes absolute percentage difference against declared area', () => {
  assertClose(areaDifferencePercent('1', '1.01'), 1);
  assertClose(areaDifferencePercent('2', '2.1'), 5);
  assertClose(areaDifferencePercent('4', '3.6'), 10);
});

test('parcel comparison treats missing, invalid and zero declared areas as not comparable', () => {
  assert.equal(areaDifferencePercent(null, '1'), null);
  assert.equal(areaDifferencePercent('1', null), null);
  assert.equal(areaDifferencePercent('0', '1'), null);
  assert.equal(areaDifferencePercent('bad', '1'), null);
  assert.equal(numericArea('-1'), null);
});

test('parcel comparison bands are neutral and deterministic', () => {
  assert.equal(differenceBand(null), 'none');
  assert.equal(differenceBand(0), 'low');
  assert.equal(differenceBand(1.999), 'low');
  assert.equal(differenceBand(2), 'medium');
  assert.equal(differenceBand(4.999), 'medium');
  assert.equal(differenceBand(5), 'high');
  assert.equal(differenceBand(30), 'high');
});
