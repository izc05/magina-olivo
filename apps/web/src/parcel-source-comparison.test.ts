import assert from 'node:assert/strict';
import test from 'node:test';
import { areaDifferencePercent, differenceBand, numericArea } from './parcel-source-comparison.ts';

test('parcel comparison computes absolute percentage difference against declared area', () => {
  assert.equal(areaDifferencePercent('1', '1.01'), 1);
  assert.equal(areaDifferencePercent('2', '2.1'), 5.000000000000004);
  assert.equal(areaDifferencePercent('4', '3.6'), 9.999999999999998);
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
