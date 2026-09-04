import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('advertiser applications fail closed and derive input email from session', async () => {
  const routes = await read('./advertiser-application-routes.ts');
  const env = await read('../../../.env.example');
  const applicationBody = routes.match(/type ApplicationBody = \{([\s\S]*?)\n\};/)?.[1] ?? '';

  assert.match(env, /MAGINA_ADVERTISING_APPLICATIONS_ENABLED=false/);
  assert.match(routes, /ADVERTISING_APPLICATIONS_DISABLED/);
  assert.match(routes, /session\.user\.email/);
  assert.ok(applicationBody.length > 0, 'ApplicationBody source contract must be discoverable');
  assert.doesNotMatch(applicationBody, /contactEmail/);
  assert.match(routes, /contact_email[\s\S]*session\.user\.email/);
});

test('advertiser application submission serializes concurrent requests and caps pending work', async () => {
  const routes = await read('./advertiser-application-routes.ts');

  assert.match(routes, /pg_advisory_xact_lock/);
  assert.match(routes, /ADVERTISING_APPLICATION_ALREADY_PENDING/);
  assert.match(routes, /TOO_MANY_PENDING_ADVERTISING_APPLICATIONS/);
  assert.match(routes, />= 3/);
  assert.match(routes, /begin/);
  assert.match(routes, /commit/);
  assert.match(routes, /rollback/);
});
