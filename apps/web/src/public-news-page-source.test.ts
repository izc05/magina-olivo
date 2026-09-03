import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('public news page uses verified metadata and links to original sources', async () => {
  const page = await read('./MaginaNewsPage.tsx');

  assert.match(page, /\/api\/v1\/public\/news/);
  assert.match(page, /Leer en la fuente oficial/);
  assert.match(page, /target="_blank"/);
  assert.match(page, /rel="noreferrer"/);
  assert.match(page, /No copiamos el texto de los artículos/);
  assert.match(page, /Reciente/);
  assert.match(page, /En seguimiento/);
});

test('public news route is exposed outside the private App shell', async () => {
  const main = await read('./main.tsx');
  assert.match(main, /path === '\/magina\/noticias'/);
  assert.match(main, /<MaginaNewsPage \/>/);
});
