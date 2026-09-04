import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('advertising admin dashboard keeps platform access and pilot status visible', async () => {
  const page = await read('./AdminAdvertisingPage.tsx');
  const main = await read('./main.tsx');

  assert.match(main, /\/admin\/publicidad/);
  assert.match(page, /Publicidad y empresas/);
  assert.match(page, /Modo seguro de piloto/);
  assert.match(page, /Ingresos/);
  assert.match(page, /Se activará con el módulo de pagos/);
  assert.match(page, /Aprobar/);
  assert.match(page, /Rechazar/);
});

test('advertising admin UI states privacy boundaries explicitly', async () => {
  const page = await read('./AdminAdvertisingPage.tsx');

  assert.match(page, /sin mezclar publicidad con los datos objetivos del agricultor/i);
  assert.match(page, /no se guardan IP/i);
  assert.match(page, /coordenadas precisas de parcelas/i);
});
