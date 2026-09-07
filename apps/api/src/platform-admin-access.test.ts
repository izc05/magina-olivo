import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessPlatformConsole, isPlatformAdminRole } from './platform-admin-access.ts';

test('platform administration roles are explicit and never reuse holding membership roles', () => {
  assert.equal(isPlatformAdminRole('super_admin'), true);
  assert.equal(isPlatformAdminRole('admin'), true);
  assert.equal(isPlatformAdminRole('owner'), false);
  assert.equal(isPlatformAdminRole('viewer'), false);
  assert.equal(canAccessPlatformConsole('super_admin'), true);
  assert.equal(canAccessPlatformConsole(null), false);
});
