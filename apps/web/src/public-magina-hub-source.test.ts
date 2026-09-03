import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('Mágina public hub links only to implemented public surfaces', async () => {
  const page = await read('./MaginaHubPage.tsx');

  assert.match(page, /href="\/magina\/tiempo"/);
  assert.match(page, /href="\/magina\/directorio"/);
  assert.match(page, /href="\/magina\/mercado"/);
  assert.match(page, /RAIF/);
  assert.match(page, /En preparación/);
  assert.match(page, /No diagnostica tu parcela/);
  assert.match(page, /\/api\/v1\/public\/sources/);
});

test('main router exposes public Mágina surfaces without requiring the private App shell', async () => {
  const main = await read('./main.tsx');
  assert.match(main, /path === '\/magina'/);
  assert.match(main, /<MaginaHubPage \/>/);
  assert.match(main, /path === '\/magina\/mercado'/);
  assert.match(main, /<MaginaMarketPage \/>/);
});
