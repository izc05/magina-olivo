import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getOrGenerateVapidKeys } from './push-vapid.ts';

test('getOrGenerateVapidKeys returns valid Base64URL keys', () => {
  const keys = getOrGenerateVapidKeys();
  assert.ok(keys.publicKey);
  assert.ok(keys.privateKey);
  assert.ok(keys.publicKey.length > 30);
});
