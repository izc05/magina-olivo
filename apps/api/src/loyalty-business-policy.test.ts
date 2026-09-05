import assert from 'node:assert/strict';
import test from 'node:test';
import {
  firstPlotLoyaltyAward,
  yieldRecordedLoyaltyAward,
} from './loyalty-business-policy.ts';

test('first plot award reuses the bootstrap idempotency identity', () => {
  const award = firstPlotLoyaltyAward('user-1', '11111111-1111-4111-8111-111111111111');
  assert.equal(award.eventType, 'parcel.first_created');
  assert.equal(award.idempotencyKey, 'parcel.first_created:11111111-1111-4111-8111-111111111111');
  assert.equal(award.sourceType, 'plot');
  assert.equal(award.sourceId, '11111111-1111-4111-8111-111111111111');
});

test('yield award is once per delivery even when result is corrected', () => {
  const first = yieldRecordedLoyaltyAward(
    'user-1',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
  );
  const correction = yieldRecordedLoyaltyAward(
    'user-1',
    '22222222-2222-4222-8222-222222222222',
    '44444444-4444-4444-8444-444444444444',
  );

  assert.equal(first.eventType, 'yield.recorded');
  assert.equal(first.idempotencyKey, 'yield.recorded:22222222-2222-4222-8222-222222222222');
  assert.equal(correction.idempotencyKey, first.idempotencyKey);
  assert.notDeepEqual(correction.metadata, first.metadata);
  assert.equal(first.sourceType, 'delivery');
  assert.equal(first.sourceId, '22222222-2222-4222-8222-222222222222');
});

test('different deliveries have different yield reward identities', () => {
  const first = yieldRecordedLoyaltyAward('user-1', 'delivery-a', 'result-a');
  const second = yieldRecordedLoyaltyAward('user-1', 'delivery-b', 'result-b');
  assert.notEqual(first.idempotencyKey, second.idempotencyKey);
});
