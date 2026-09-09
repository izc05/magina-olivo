import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessPlatformConsole, canManagePublicContent, isPlatformAdminRole } from './platform-admin-access.ts';

test('platform administration roles are explicit and never reuse holding membership roles', () => {
  assert.equal(isPlatformAdminRole('super_admin'), true);
  assert.equal(isPlatformAdminRole('admin'), true);
  assert.equal(isPlatformAdminRole('owner'), false);
  assert.equal(isPlatformAdminRole('viewer'), false);
  assert.equal(canAccessPlatformConsole('super_admin'), true);
  assert.equal(canAccessPlatformConsole(null), false);
});

test('public verified content can be managed by editors without granting source administration', () => {
  assert.equal(canManagePublicContent('super_admin'), true);
  assert.equal(canManagePublicContent('admin'), true);
  assert.equal(canManagePublicContent('editor'), true);
  assert.equal(canManagePublicContent('support'), false);
  assert.equal(canManagePublicContent(null), false);
});
