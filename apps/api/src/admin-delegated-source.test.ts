import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('legacy platform admin guard accepts only superadmin authority', async () => {
  const access = await read('./admin-access.ts');
  assert.match(access, /requireSuperadmin/);
  assert.doesNotMatch(access, /isPlatformAdminEmail/);
});

test('content endpoints are delegated only to content role', async () => {
  const content = await read('./admin-content-routes.ts');
  assert.match(content, /requireAdminSessionRole\(request, reply, 'content'\)/);
  assert.doesNotMatch(content, /requirePlatformAdmin/);
  assert.match(content, /\/api\/v1\/admin\/content\/news/);
  assert.match(content, /\/api\/v1\/admin\/content\/announcements/);
});

test('support and operations delegated endpoints keep narrow server-side scopes', async () => {
  const delegated = await read('./admin-delegated-routes.ts');
  assert.match(delegated, /requireAdminSessionRole\(request, reply, 'support'\)/);
  assert.match(delegated, /requireAdminSessionRole\(request, reply, 'operations'\)/);
  assert.match(delegated, /\/delegated\/support\/tickets/);
  assert.match(delegated, /\/delegated\/operations\/directory/);
  assert.match(delegated, /\/delegated\/operations\/sources/);
  assert.match(delegated, /\/delegated\/operations\/system/);

  assert.doesNotMatch(delegated, /\/delegated\/.*\/legal/);
  assert.doesNotMatch(delegated, /\/delegated\/.*\/users/);
  assert.doesNotMatch(delegated, /revoke-sessions/);
  assert.doesNotMatch(delegated, /holding_members/);
  assert.doesNotMatch(delegated, /\bplots\b/);
  assert.doesNotMatch(delegated, /\bdeliveries\b/);
});

test('delegated capability contract keeps privileged areas superadmin-only', async () => {
  const delegated = await read('./admin-delegated-routes.ts');
  assert.match(delegated, /advertising: superadmin/);
  assert.match(delegated, /legal: superadmin/);
  assert.match(delegated, /users: superadmin/);
  assert.match(delegated, /roles: superadmin/);
  assert.match(delegated, /browserRestoreExecution: false/);
  assert.doesNotMatch(delegated, /child_process|exec\(|spawn\(/);
});
