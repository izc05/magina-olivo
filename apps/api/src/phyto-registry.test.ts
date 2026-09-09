import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchPhytoProducts } from './phyto-registry.ts';

test('searchPhytoProducts finds copper products by active substance or name', () => {
  const results = searchPhytoProducts('cobre');
  assert.ok(results.length >= 2);
  assert.ok(results.some((p) => p.registrationNumber === 'ES-00124'));
});

test('searchPhytoProducts matches exact registration number', () => {
  const results = searchPhytoProducts('ES-01052');
  assert.equal(results.length, 1);
  assert.equal(results[0]?.name, 'Deltametrín 2.5% EC');
});
