import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isPlatformAdminEmail,
  parsePlatformAdminEmails,
} from './admin-access.ts';

test('platform admin email parsing is normalized and exact', () => {
  const emails = parsePlatformAdminEmails(' Owner@Example.test,admin@example.test ,, ');
  assert.deepEqual([...emails], ['owner@example.test', 'admin@example.test']);
  assert.equal(isPlatformAdminEmail('OWNER@example.test', 'owner@example.test'), true);
  assert.equal(isPlatformAdminEmail('other@example.test', 'owner@example.test'), false);
  assert.equal(isPlatformAdminEmail(undefined, 'owner@example.test'), false);
});
