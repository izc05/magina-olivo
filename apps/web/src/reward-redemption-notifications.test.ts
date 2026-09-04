import assert from 'node:assert/strict';
import test from 'node:test';
import type { RedemptionSummary } from './reward-api.ts';
import { buildRewardRedemptionNotifications } from './reward-redemption-notifications.ts';

function redemption(overrides: Partial<RedemptionSummary> = {}): RedemptionSummary {
  return {
    id: 'redemption-1',
    rewardId: 'reward-1',
    rewardCode: 'AOVE-500',
    rewardTitle: 'Botella AOVE 500 ml',
    status: 'reserved',
    olivesCost: 2500,
    reservedAt: '2026-09-04T08:00:00.000Z',
    expiresAt: '2026-09-06T08:00:00.000Z',
    redeemedAt: null,
    pickupPoint: { id: 'pickup-1', name: 'Cooperativa', address: 'Sierra Mágina' },
    partnerName: 'Cooperativa Sierra Mágina',
    tokenHint: 'ABCD1234',
    ...overrides,
  };
}

const NOW = new Date('2026-09-04T12:00:00.000Z');

test('warns only when an active redemption expires inside 48 hours', () => {
  const notifications = buildRewardRedemptionNotifications([
    redemption({ id: 'inside', expiresAt: '2026-09-06T10:00:00.000Z' }),
    redemption({ id: 'outside', expiresAt: '2026-09-06T13:00:00.000Z' }),
  ], NOW);

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0]?.kind, 'expiring');
  assert.equal(notifications[0]?.redemptionId, 'inside');
  assert.match(notifications[0]?.detail ?? '', /46 h/);
});

test('shows a recent confirmed pickup as success', () => {
  const notifications = buildRewardRedemptionNotifications([
    redemption({
      status: 'redeemed',
      redeemedAt: '2026-09-04T10:30:00.000Z',
    }),
  ], NOW);

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0]?.tone, 'success');
  assert.equal(notifications[0]?.title, 'Recogida confirmada');
});

test('shows refunded olives after a recent expiration', () => {
  const notifications = buildRewardRedemptionNotifications([
    redemption({
      status: 'expired',
      expiresAt: '2026-09-04T09:00:00.000Z',
      olivesCost: 2500,
    }),
  ], NOW);

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0]?.kind, 'refunded');
  assert.match(notifications[0]?.detail ?? '', /2\.500 🫒/);
  assert.match(notifications[0]?.detail ?? '', /han vuelto a tu saldo/);
});

test('does not keep old terminal events as permanent alerts', () => {
  const notifications = buildRewardRedemptionNotifications([
    redemption({
      status: 'redeemed',
      redeemedAt: '2026-08-20T10:00:00.000Z',
    }),
    redemption({
      status: 'expired',
      expiresAt: '2026-08-20T10:00:00.000Z',
    }),
  ], NOW);

  assert.deepEqual(notifications, []);
});

test('sorts expiring redemptions by urgency before recent terminal notices', () => {
  const notifications = buildRewardRedemptionNotifications([
    redemption({
      id: 'redeemed',
      status: 'redeemed',
      redeemedAt: '2026-09-04T11:30:00.000Z',
    }),
    redemption({ id: 'later', expiresAt: '2026-09-06T08:00:00.000Z' }),
    redemption({ id: 'sooner', expiresAt: '2026-09-05T08:00:00.000Z' }),
  ], NOW);

  assert.deepEqual(notifications.map((item) => item.redemptionId), ['sooner', 'later', 'redeemed']);
});
