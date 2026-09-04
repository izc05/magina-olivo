import assert from 'node:assert/strict';
import test from 'node:test';
import { isUniqueViolation } from './campaign-routes.ts';

test('campaign duplicate classifier only accepts PostgreSQL unique violations', () => {
  assert.equal(isUniqueViolation({ code: '23505' }), true);
  assert.equal(isUniqueViolation({ code: '23503' }), false);
  assert.equal(isUniqueViolation(new Error('boom')), false);
  assert.equal(isUniqueViolation(null), false);
  assert.equal(isUniqueViolation(undefined), false);
  assert.equal(isUniqueViolation('23505'), false);
});
