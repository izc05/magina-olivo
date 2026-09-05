import assert from 'node:assert/strict';
import test from 'node:test';
import {
  effectiveDirectoryVerificationStatus,
  normalizePublicHttpsUrl,
} from './public-directory-trust.ts';

const NOW = Date.parse('2026-09-03T12:00:00Z');

test('only exposes credential-free HTTPS public URLs', () => {
  assert.equal(normalizePublicHttpsUrl('https://sierramagina.org/almazaras-envasadoras/'), 'https://sierramagina.org/almazaras-envasadoras/');
  assert.equal(normalizePublicHttpsUrl('http://example.com'), null);
  assert.equal(normalizePublicHttpsUrl('javascript:alert(1)'), null);
  assert.equal(normalizePublicHttpsUrl('https://user:pass@example.com/path'), null);
  assert.equal(normalizePublicHttpsUrl('not a url'), null);
  assert.equal(normalizePublicHttpsUrl(null), null);
});

test('keeps recent verified directory entries verified', () => {
  assert.equal(
    effectiveDirectoryVerificationStatus('verified', '2026-09-02T00:00:00Z', NOW),
    'verified',
  );
});

test('downgrades verified entries when provenance is missing or invalid', () => {
  assert.equal(effectiveDirectoryVerificationStatus('verified', null, NOW), 'unverified');
  assert.equal(effectiveDirectoryVerificationStatus('verified', 'invalid', NOW), 'unverified');
  assert.equal(effectiveDirectoryVerificationStatus('verified', '2026-09-10T00:00:00Z', NOW), 'unverified');
});

test('marks old verified entries stale after the bounded review window', () => {
  assert.equal(
    effectiveDirectoryVerificationStatus('verified', '2026-01-01T00:00:00Z', NOW),
    'stale',
  );
});

test('preserves explicit unverified and stale states', () => {
  assert.equal(effectiveDirectoryVerificationStatus('unverified', '2026-09-02T00:00:00Z', NOW), 'unverified');
  assert.equal(effectiveDirectoryVerificationStatus('stale', '2026-09-02T00:00:00Z', NOW), 'stale');
});
