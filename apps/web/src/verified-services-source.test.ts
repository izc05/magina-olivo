import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> { return readFile(new URL(relativePath, import.meta.url), 'utf8'); }

test('Discover services uses the audited public directory rather than visual-only business examples', async () => {
  const main = await read('./main.tsx');
  const page = await read('./VerifiedServicesPage.tsx');

  assert.match(main, /<VerifiedServicesPage \/>/);
  assert.match(page, /\/api\/v1\/public\/destinations/);
  assert.match(page, /no implica colaboración con Mágina Olivo/i);
  assert.match(page, /Fuente verificada/);
  assert.doesNotMatch(page, /1,2 km|Contacto pendiente|negocios de ejemplo/);
});
