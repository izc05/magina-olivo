import assert from 'node:assert/strict';
import test from 'node:test';
import {
  configuredPlatformAdminEmails,
  isConfiguredPlatformAdmin,
  normalizeAdminEmail,
} from './platform-admin-policy.ts';

test('normalizes platform admin emails safely', () => {
  assert.equal(normalizeAdminEmail('  Admin@Example.COM '), 'admin@example.com');
  assert.equal(normalizeAdminEmail('   '), null);
  assert.equal(normalizeAdminEmail(null), null);
});

test('parses a comma-separated allowlist and matches case-insensitively', () => {
  const configured = configuredPlatformAdminEmails('owner@example.com, ADMIN@example.com, ,owner@example.com');
  assert.deepEqual([...configured].sort(), ['admin@example.com', 'owner@example.com']);
  assert.equal(isConfiguredPlatformAdmin('Admin@Example.com', configured), true);
  assert.equal(isConfiguredPlatformAdmin('farmer@example.com', configured), false);
});

test('fails closed when no platform admins are configured', () => {
  assert.equal(isConfiguredPlatformAdmin('admin@example.com', new Set()), false);
});
