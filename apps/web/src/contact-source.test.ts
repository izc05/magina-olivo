import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('public contact form submits to the API and no longer depends on mailto', async () => {
  const page = await read('./ContactPage.tsx');

  assert.match(page, /\/api\/v1\/public\/contact/);
  assert.match(page, /method: 'POST'/);
  assert.match(page, /credentials: 'include'/);
  assert.match(page, /Enviar consulta/);
  assert.match(page, /maxLength=\{4000\}/);
  assert.match(page, /Política de privacidad/);
  assert.match(page, /name="website"/);
  assert.doesNotMatch(page, /mailto:/);
  assert.doesNotMatch(page, /VITE_CONTACT_EMAIL/);
});

test('contact API minimizes stored data and keeps abuse controls outside message persistence', async () => {
  const route = await read('../../api/src/contact-routes.ts');
  const migration = await read('../../../db/migrations/0022_contact_messages.sql');

  assert.match(route, /CONTACT_CATEGORIES/);
  assert.match(route, /RATE_MAX = 5/);
  assert.match(route, /RATE_WINDOW_MS = 15 \* 60_000/);
  assert.match(route, /website/);
  assert.match(route, /getAuthenticatedSession/);
  assert.match(route, /session\?\.user\.id \?\? null/);
  assert.match(route, /message\.length < 10 \|\| message\.length > 4000/);
  assert.match(route, /reply\.code\(202\)\.send\(\{ accepted: true \}\)/);

  assert.match(migration, /create table contact_messages/);
  assert.match(migration, /reply_email text not null/);
  assert.match(migration, /message text not null/);
  assert.doesNotMatch(migration, /\bip\b text/i);
  assert.doesNotMatch(migration, /user_agent/i);
});
