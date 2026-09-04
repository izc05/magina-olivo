import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('private administration console is routed separately from the farmer app', async () => {
  const main = await read('./main.tsx');
  const admin = await read('./AdminPage.tsx');

  assert.match(main, /path === '\/admin'/);
  assert.match(main, /<AdminPage \/>/);
  assert.match(admin, /\/api\/v1\/admin\/dashboard/);
  assert.match(admin, /state === 'forbidden'/);
  assert.match(admin, /Panel privado/);
});

test('advertising management keeps sponsorship explicit and exposes operational controls', async () => {
  const admin = await read('./AdminPage.tsx');

  assert.match(admin, /Publicidad y patrocinios/);
  assert.match(admin, /Patrocinado/);
  assert.match(admin, /premium/);
  assert.match(admin, /featured/);
  assert.match(admin, /\/advertising\/campaigns/);
  assert.match(admin, /\/advertising\/applications/);
  assert.match(admin, /Pausar/);
  assert.match(admin, /Activar/);
});
