import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('market page does not publish structured prices before freshness is verified', async () => {
  const page = await read('./MaginaMarketPage.tsx');

  assert.match(page, /currentness === 'verified-current-content'/);
  assert.match(page, /No publicamos todavía ningún €\/kg/);
  assert.match(page, /Mercado ≠ liquidación de tu cooperativa/);
  assert.match(page, /Tus rendimientos, anticipos, liquidaciones y pagos pertenecen a tu histórico privado/);
  assert.doesNotMatch(page, /\b\d+[,.]\d+\s*€\/kg\b/);
});
