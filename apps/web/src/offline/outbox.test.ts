import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearOutbox,
  enqueueDeliveryCreate,
  listPendingOperations,
  syncPendingOperations,
} from './outbox.ts';

const USER_A = 'user-a';
const USER_B = 'user-b';

test('delivery stays pending across database reopen and is deleted only after confirmed sync', async () => {
  await clearOutbox();

  await enqueueDeliveryCreate({
    ownerUserId: USER_A,
    campaignId: '33333333-3333-4333-8333-333333333333',
    idempotencyKey: '44444444-4444-4444-8444-444444444444',
    createdAt: '2026-11-18T17:42:00.000Z',
    body: {
      deliveredAt: '2026-11-18T18:42:00+01:00',
      kilograms: '1842.000',
      customDestination: 'Cooperativa piloto',
    },
  });

  const afterEnqueue = await listPendingOperations(USER_A);
  assert.equal(afterEnqueue.length, 1);
  assert.equal(afterEnqueue[0]?.ownerUserId, USER_A);
  assert.equal(afterEnqueue[0]?.idempotencyKey, '44444444-4444-4444-8444-444444444444');
  assert.equal(afterEnqueue[0]?.attempts, 0);

  const failedSync = await syncPendingOperations(USER_A, async () => {
    throw new TypeError('network unavailable');
  });
  assert.deepEqual(failedSync, { attempted: 1, synced: 0, pending: 1 });

  const afterFailure = await listPendingOperations(USER_A);
  assert.equal(afterFailure.length, 1);
  assert.equal(afterFailure[0]?.attempts, 1);
  assert.equal(afterFailure[0]?.lastError, 'network unavailable');

  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;
  const successfulSync = await syncPendingOperations(USER_A, async (input, init) => {
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
  assert.equal((await listPendingOperations(USER_A)).length, 0);
});

test('non-2xx response never deletes the pending operation', async () => {
  await clearOutbox();

  await enqueueDeliveryCreate({
    ownerUserId: USER_A,
    campaignId: '55555555-5555-4555-8555-555555555555',
    idempotencyKey: '66666666-6666-4666-8666-666666666666',
    body: {
      deliveredAt: '2026-11-20T09:00:00+01:00',
      kilograms: '1000.000',
      customDestination: 'Cooperativa piloto',
    },
  });

  const result = await syncPendingOperations(USER_A, async () => new Response(null, { status: 409 }));
  assert.deepEqual(result, { attempted: 1, synced: 0, pending: 1 });

  const pending = await listPendingOperations(USER_A);
  assert.equal(pending.length, 1);
  assert.equal(pending[0]?.attempts, 1);
  assert.equal(pending[0]?.lastError, 'HTTP 409');
});

test('switching users never exposes or syncs another users pending operations', async () => {
  await clearOutbox();

  const sharedIdempotencyKey = '77777777-7777-4777-8777-777777777777';

  await enqueueDeliveryCreate({
    ownerUserId: USER_A,
    campaignId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    idempotencyKey: sharedIdempotencyKey,
    body: { kilograms: '1842.000', customDestination: 'A' },
  });
  await enqueueDeliveryCreate({
    ownerUserId: USER_B,
    campaignId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    idempotencyKey: sharedIdempotencyKey,
    body: { kilograms: '1000.000', customDestination: 'B' },
  });

  const pendingA = await listPendingOperations(USER_A);
  const pendingB = await listPendingOperations(USER_B);
  assert.equal(pendingA.length, 1);
  assert.equal(pendingB.length, 1);
  assert.equal(pendingA[0]?.ownerUserId, USER_A);
  assert.equal(pendingB[0]?.ownerUserId, USER_B);
  assert.notEqual(pendingA[0]?.id, pendingB[0]?.id);

  const seenBodies: string[] = [];
  const syncB = await syncPendingOperations(USER_B, async (_input, init) => {
    seenBodies.push(String(init?.body));
    return new Response(null, { status: 201 });
  });

  assert.deepEqual(syncB, { attempted: 1, synced: 1, pending: 0 });
  assert.equal(seenBodies.length, 1);
  assert.match(seenBodies[0] ?? '', /1000\.000/);
  assert.doesNotMatch(seenBodies[0] ?? '', /1842\.000/);
  assert.equal((await listPendingOperations(USER_B)).length, 0);
  assert.equal((await listPendingOperations(USER_A)).length, 1);

  await clearOutbox(USER_A);
  assert.equal((await listPendingOperations(USER_A)).length, 0);
});
