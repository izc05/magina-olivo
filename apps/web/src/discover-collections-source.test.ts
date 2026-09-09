import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('Discover category links resolve to explicit public collection screens', async () => {
  const main = await read('./main.tsx');
  const collection = await read('./DiscoverCollectionPage.tsx');
  const discover = await read('./DiscoverPage.tsx');

  for (const path of ['/descubre/miradores', '/descubre/gastronomia', '/descubre/oleoturismo', '/descubre/pueblos']) {
    assert.match(main, new RegExp(path.replaceAll('/', '\\/')));
  }
  assert.match(main, /<DiscoverCollectionPage slug=/);
  assert.match(collection, /GUÍA EN CONSTRUCCIÓN/);
  assert.match(collection, /procedencia, fecha de revisión/);
  assert.match(collection, /no implica integración/);
  assert.match(discover, /href="\/descubre\/pueblos">Ver todas/);
});
