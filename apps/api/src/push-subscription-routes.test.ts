import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { isAllowedPushEndpoint } from './push-endpoint-policy.ts';

test('push endpoint policy only accepts configured HTTPS host suffixes', () => {
  const previous = process.env.WEB_PUSH_ALLOWED_HOST_SUFFIXES;
  process.env.WEB_PUSH_ALLOWED_HOST_SUFFIXES = 'push.example.com,127.0.0.1,localhost';
  try {
    assert.equal(isAllowedPushEndpoint('https://push.example.com/send/abc'), true);
    assert.equal(isAllowedPushEndpoint('https://eu.push.example.com/send/abc'), true);
    assert.equal(isAllowedPushEndpoint('https://push.example.com.evil.test/send/abc'), false);
    assert.equal(isAllowedPushEndpoint('http://push.example.com/send/abc'), false);
    assert.equal(isAllowedPushEndpoint('https://127.0.0.1/send/abc'), false);
    assert.equal(isAllowedPushEndpoint('https://localhost/send/abc'), false);
    assert.equal(isAllowedPushEndpoint('https://api.localhost/send/abc'), false);
    assert.equal(isAllowedPushEndpoint('https://user:pass@push.example.com/send/abc'), false);
    assert.equal(isAllowedPushEndpoint('not-a-url'), false);
  } finally {
    if (previous == null) delete process.env.WEB_PUSH_ALLOWED_HOST_SUFFIXES;
    else process.env.WEB_PUSH_ALLOWED_HOST_SUFFIXES = previous;
  }
});

test('push subscription upsert cannot transfer an endpoint between accounts', async () => {
  const source = await readFile(new URL('./push-subscription-routes.ts', import.meta.url), 'utf8');

  assert.match(source, /on conflict \(endpoint\)/);
  assert.match(source, /where push_subscriptions\.user_id = excluded\.user_id/);

  const updateClause = source.match(
    /on conflict \(endpoint\)\s+do update set([\s\S]*?)where push_subscriptions\.user_id = excluded\.user_id/,
  )?.[1];
  assert.ok(updateClause, 'expected guarded ON CONFLICT update clause');
  assert.doesNotMatch(updateClause, /\buser_id\s*=\s*excluded\.user_id/);
  assert.match(source, /PUSH_SUBSCRIPTION_CONFLICT/);
});
