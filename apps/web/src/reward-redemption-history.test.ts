import assert from 'node:assert/strict';
import test from 'node:test';
import type { RedemptionSummary } from './reward-api.ts';
import {
  bucketRewardRedemptionStatus,
  groupRewardRedemptions,
} from './reward-redemption-history.ts';

function redemption(overrides: Partial<RedemptionSummary> = {}): RedemptionSummary {
  return {
    id: 'redemption-1',
    rewardId: 'reward-1',
    rewardCode: 'AOVE-500',
    rewardTitle: 'Botella AOVE 500 ml',
    status: 'reserved',
    olivesCost: 2500,
    reservedAt: '2026-09-01T10:00:00.000Z',
    expiresAt: '2026-09-08T10:00:00.000Z',
    redeemedAt: null,
    pickupPoint: { id: 'pickup-1', name: 'Cooperativa', address: 'Sierra Mágina' },
    partnerName: 'Cooperativa Sierra Mágina',
    tokenHint: 'ABCD1234',
    ...overrides,
  };
}

test('maps supported redemption statuses to history buckets', () => {
  assert.equal(bucketRewardRedemptionStatus('reserved'), 'pending');
  assert.equal(bucketRewardRedemptionStatus('issued'), 'pending');
  assert.equal(bucketRewardRedemptionStatus('redeemed'), 'redeemed');
  assert.equal(bucketRewardRedemptionStatus('expired'), 'expired');
  assert.equal(bucketRewardRedemptionStatus('cancelled'), 'other');
});

test('groups every redemption without dropping inactive states', () => {
  const groups = groupRewardRedemptions([
    redemption({ id: 'pending', status: 'issued' }),
    redemption({ id: 'redeemed', status: 'redeemed', redeemedAt: '2026-09-03T10:00:00.000Z' }),
    redemption({ id: 'expired', status: 'expired' }),
    redemption({ id: 'cancelled', status: 'cancelled' }),
  ]);

  assert.deepEqual(groups.pending.map((item) => item.id), ['pending']);
  assert.deepEqual(groups.redeemed.map((item) => item.id), ['redeemed']);
  assert.deepEqual(groups.expired.map((item) => item.id), ['expired']);
  assert.deepEqual(groups.other.map((item) => item.id), ['cancelled']);
});

test('sorts each history group newest first using delivery date when available', () => {
  const groups = groupRewardRedemptions([
    redemption({
      id: 'older',
      status: 'redeemed',
      reservedAt: '2026-09-02T10:00:00.000Z',
      redeemedAt: '2026-09-02T12:00:00.000Z',
    }),
    redemption({
      id: 'newer',
      status: 'redeemed',
      reservedAt: '2026-09-01T10:00:00.000Z',
      redeemedAt: '2026-09-04T09:00:00.000Z',
    }),
  ]);

  assert.deepEqual(groups.redeemed.map((item) => item.id), ['newer', 'older']);
});
