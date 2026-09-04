import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('platform operations stay behind global admin authorization and private cache policy', async () => {
  const source = await read('./admin-operations-routes.ts');
  assert.match(source, /requirePlatformAdmin/);
  assert.match(source, /\/api\/v1\/admin\/users/);
  assert.match(source, /\/api\/v1\/admin\/directory/);
  assert.match(source, /\/api\/v1\/admin\/sources/);
  assert.match(source, /\/api\/v1\/admin\/audit/);
  assert.match(source, /private, no-store/);
});

test('directory writes are audited and public URLs are normalized before persistence', async () => {
  const routes = await read('./admin-operations-routes.ts');
  const audit = await read('./admin-audit.ts');
  const migration = await read('../../../db/migrations/0022_admin_audit_log.sql');

  assert.match(routes, /normalizePublicHttpsUrl/);
  assert.match(routes, /recordAdminAudit/);
  assert.match(routes, /directory\.update/);
  assert.match(routes, /user\.sessions\.revoke/);
  assert.match(routes, /ADMIN_SELF_SESSION_REVOKE_BLOCKED/);
  assert.match(audit, /platform_admin_audit_log/);
  assert.match(migration, /no passwords, session tokens, precise plot coordinates or private agricultural payloads/i);
});
