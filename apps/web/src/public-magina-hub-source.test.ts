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
  assert.match(page, /href="\/magina\/campo"/);
  assert.match(page, /href="\/magina\/noticias"/);
  assert.match(page, /href="\/magina\/mercado"/);
  assert.match(page, /href="\/descubre"/);
  assert.match(page, /RAIF/);
  assert.match(page, /Campo y alertas/);
  assert.match(page, /Noticias/);
  assert.match(page, /\/api\/v1\/public\/sources/);
});

test('main router exposes public Mágina surfaces without requiring the private App shell', async () => {
  const main = await read('./main.tsx');
  assert.match(main, /path === '\/magina'/);
  assert.match(main, /<MaginaHubPage \/>/);
  assert.match(main, /path === '\/magina\/campo'/);
  assert.match(main, /<MaginaFieldAlertsPage \/>/);
  assert.match(main, /path === '\/magina\/noticias'/);
  assert.match(main, /<MaginaNewsPage \/>/);
  assert.match(main, /path === '\/magina\/mercado'/);
  assert.match(main, /<MaginaMarketPage \/>/);
});
