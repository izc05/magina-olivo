import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(path: string): Promise<string> {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('advertiser portal exposes commercial notifications without official-alert language', async () => {
  const page = await read('./AdvertiserPortalPage.tsx');
  assert.match(page, /Avisos del anunciante/);
  assert.match(page, /No son alertas agrícolas, meteorológicas ni oficiales/);
  assert.match(page, /\/api\/v1\/advertiser\/notifications/);
  assert.match(page, /Marcar leído/);
});

test('advertiser email is visibly optional and independent from in-app notices', async () => {
  const page = await read('./AdvertiserPortalPage.tsx');
  assert.match(page, /Recibir también por correo/);
  assert.match(page, /El correo es opcional y está desactivado por defecto/);
  assert.match(page, /Los avisos dentro del portal no dependen del correo/);
  assert.doesNotMatch(page, /\/api\/v1\/admin\//);
});
