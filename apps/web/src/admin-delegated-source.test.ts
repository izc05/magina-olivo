import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('admin router uses role-aware entry points for shared admin paths', async () => {
  const main = await read('./main.tsx');
  assert.match(main, /<AdminRoleEntry kind="home" \/>/);
  assert.match(main, /<AdminRoleEntry kind="support" \/>/);
  assert.match(main, /<AdminRoleEntry kind="operations" \/>/);
});

test('delegated home only links to explicitly granted modules', async () => {
  const home = await read('./AdminDelegatedHomePage.tsx');
  assert.match(home, /access\.capabilities\.finance/);
  assert.match(home, /access\.capabilities\.content/);
  assert.match(home, /access\.capabilities\.support/);
  assert.match(home, /access\.capabilities\.operations/);
  assert.doesNotMatch(home, /\/admin\/roles/);
  assert.doesNotMatch(home, /\/admin\/publicidad/);
});

test('delegated support UI cannot reach legal, system or user administration endpoints', async () => {
  const support = await read('./AdminSupportInboxPage.tsx');
  assert.match(support, /\/api\/v1\/admin\/delegated\/support\/tickets/);
  assert.doesNotMatch(support, /\/api\/v1\/admin\/legal/);
  assert.doesNotMatch(support, /\/api\/v1\/admin\/system/);
  assert.doesNotMatch(support, /\/api\/v1\/admin\/users/);
});

test('delegated operations UI excludes global user and session management', async () => {
  const operations = await read('./AdminOperationsScopedPage.tsx');
  assert.match(operations, /\/delegated\/operations\/directory/);
  assert.match(operations, /\/delegated\/operations\/sources/);
  assert.match(operations, /\/delegated\/operations\/system/);
  assert.doesNotMatch(operations, /\/api\/v1\/admin\/users/);
  assert.doesNotMatch(operations, /revoke-sessions/);
  assert.doesNotMatch(operations, /requesterEmail/);
});

test('role management marks all delegated roles operational and preserves existing roles', async () => {
  const roles = await read('./AdminRolesPage.tsx');
  assert.match(roles, /role: 'content'.*activeNow: true/);
  assert.match(roles, /role: 'support'.*activeNow: true/);
  assert.match(roles, /role: 'operations'.*activeNow: true/);
  assert.match(roles, /new Set<Role>\(user\.roles\)/);
  assert.match(roles, /persistentSuperadmin/);
});
