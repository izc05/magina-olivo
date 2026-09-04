import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyRewardRedemptionStatus,
  rewardRedemptionStatusNotice,
} from './reward-redemption-status.ts';

test('keeps only reserved and issued redemptions active', () => {
  assert.equal(classifyRewardRedemptionStatus('reserved'), 'active');
  assert.equal(classifyRewardRedemptionStatus('issued'), 'active');
  assert.equal(classifyRewardRedemptionStatus('redeemed'), 'redeemed');
  assert.equal(classifyRewardRedemptionStatus('expired'), 'expired');
  assert.equal(classifyRewardRedemptionStatus('cancelled'), 'inactive');
});

test('uses terminal notices that explain why the QR disappeared', () => {
  assert.match(rewardRedemptionStatusNotice('redeemed'), /Entrega confirmada/);
  assert.match(rewardRedemptionStatusNotice('expired'), /aceitunas han vuelto a tu saldo/);
  assert.match(rewardRedemptionStatusNotice('cancelled'), /QR se ha retirado/);
});
