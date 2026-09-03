import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import test from 'node:test';
import { api } from './api.ts';
import { clearOutbox, listPendingOperations } from './offline/outbox.ts';

class LocalStorageMock {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const storage = new LocalStorageMock();
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true });

test('delivery creation is queued per user while offline', async () => {
  const ownerUserId = 'synthetic-user-a';
  storage.setItem('magina-olivo-current-user-id', ownerUserId);
  await clearOutbox();

  const body = {
    deliveredAt: '2026-11-18T18:42:00.000Z',
    kilograms: '1842',
    customDestination: 'Synthetic mill',
    ticketNumber: '004281',
    clientGeneratedId: '11111111-1111-4111-8111-111111111111',
  };

  const result = await api.createDelivery(
    '22222222-2222-4222-8222-222222222222',
    body,
    'offline-delivery-004281',
  );

  assert.deepEqual(result, { offlineQueued: true, clientGeneratedId: body.clientGeneratedId });
  const pending = await listPendingOperations(ownerUserId);
  assert.equal(pending.length, 1);
  assert.equal(pending[0]?.ownerUserId, ownerUserId);
  assert.equal(pending[0]?.kind, 'delivery.create');
  assert.equal(pending[0]?.idempotencyKey, 'offline-delivery-004281');
  assert.equal(pending[0]?.body.kilograms, '1842');
  assert.equal(pending[0]?.body.ticketNumber, '004281');

  await clearOutbox();
});

test('field activity creation gets a stable client id and queues offline', async () => {
  const ownerUserId = 'synthetic-user-activity';
  storage.setItem('magina-olivo-current-user-id', ownerUserId);
  await clearOutbox();

  const result = await api.createActivity(
    '33333333-3333-4333-8333-333333333333',
    {
      activityType: 'irrigation',
      occurredAt: '2026-11-19T08:15:00.000Z',
      farmId: '44444444-4444-4444-8444-444444444444',
      plotId: '55555555-5555-4555-8555-555555555555',
      quantity: 12.5,
      quantityUnit: 'm3',
      costEur: 18,
      notes: 'Synthetic irrigation entry',
    },
  );

  assert.equal('offlineQueued' in result, true);
  if (!('offlineQueued' in result)) throw new Error('Expected offline queued activity');
  assert.equal(result.offlineQueued, true);
  assert.match(result.clientGeneratedId, /^[0-9a-f-]{36}$/i);

  const pending = await listPendingOperations(ownerUserId);
  assert.equal(pending.length, 1);
  assert.equal(pending[0]?.kind, 'activity.create');
  assert.equal(pending[0]?.ownerUserId, ownerUserId);
  assert.equal(pending[0]?.idempotencyKey, result.clientGeneratedId);
  assert.equal(pending[0]?.body.clientGeneratedId, result.clientGeneratedId);
  assert.equal(pending[0]?.body.activityType, 'irrigation');
  assert.equal(pending[0]?.body.quantity, 12.5);
  assert.equal(pending[0]?.body.quantityUnit, 'm3');

  await clearOutbox();
});
