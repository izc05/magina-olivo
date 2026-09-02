import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearOutbox,
  enqueueDeliveryCreate,
  listPendingOperations,
  syncPendingOperations,
} from './outbox.ts';

test('delivery stays pending across database reopen and is deleted only after confirmed sync', async () => {
  await clearOutbox();

  await enqueueDeliveryCreate({
    campaignId: '33333333-3333-4333-8333-333333333333',
    idempotencyKey: '44444444-4444-4444-8444-444444444444',
    createdAt: '2026-11-18T17:42:00.000Z',
    body: {
      deliveredAt: '2026-11-18T18:42:00+01:00',
      kilograms: '1842.000',
      customDestination: 'Cooperativa piloto',
    },
  });

  const afterEnqueue = await listPendingOperations();
  assert.equal(afterEnqueue.length, 1);
  assert.equal(afterEnqueue[0]?.idempotencyKey, '44444444-4444-4444-8444-444444444444');
  assert.equal(afterEnqueue[0]?.attempts, 0);

  const failedSync = await syncPendingOperations(async () => {
    throw new TypeError('network unavailable');
  });
  assert.deepEqual(failedSync, { attempted: 1, synced: 0, pending: 1 });

  const afterFailure = await listPendingOperations();
  assert.equal(afterFailure.length, 1);
  assert.equal(afterFailure[0]?.attempts, 1);
  assert.equal(afterFailure[0]?.lastError, 'network unavailable');

  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;
  const successfulSync = await syncPendingOperations(async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(JSON.stringify({ id: 'delivery-1' }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  });

  assert.deepEqual(successfulSync, { attempted: 1, synced: 1, pending: 0 });
  assert.equal(
    capturedUrl,
    '/api/v1/campaigns/33333333-3333-4333-8333-333333333333/deliveries',
  );
  assert.equal(capturedInit?.method, 'POST');
  assert.equal(
    (capturedInit?.headers as Record<string, string>)['idempotency-key'],
    '44444444-4444-4444-8444-444444444444',
  );
  assert.equal((await listPendingOperations()).length, 0);
});

test('non-2xx response never deletes the pending operation', async () => {
  await clearOutbox();

  await enqueueDeliveryCreate({
    campaignId: '55555555-5555-4555-8555-555555555555',
    idempotencyKey: '66666666-6666-4666-8666-666666666666',
    body: {
      deliveredAt: '2026-11-20T09:00:00+01:00',
      kilograms: '1000.000',
      customDestination: 'Cooperativa piloto',
    },
  });

  const result = await syncPendingOperations(async () => new Response(null, { status: 409 }));
  assert.deepEqual(result, { attempted: 1, synced: 0, pending: 1 });

  const pending = await listPendingOperations();
  assert.equal(pending.length, 1);
  assert.equal(pending[0]?.attempts, 1);
  assert.equal(pending[0]?.lastError, 'HTTP 409');
});
