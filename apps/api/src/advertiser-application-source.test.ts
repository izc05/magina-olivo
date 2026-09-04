import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('advertiser applications fail closed and derive email from session', async () => {
  const routes = await read('./advertiser-application-routes.ts');
  const env = await read('../../../.env.example');

  assert.match(env, /MAGINA_ADVERTISING_APPLICATIONS_ENABLED=false/);
  assert.match(routes, /ADVERTISING_APPLICATIONS_DISABLED/);
  assert.match(routes, /session\.user\.email/);
  assert.doesNotMatch(routes, /contactEmail\s*:/);
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
