import assert from 'node:assert/strict';
import test from 'node:test';
import { isAllowedPushEndpoint } from './push-subscription-routes.ts';

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
