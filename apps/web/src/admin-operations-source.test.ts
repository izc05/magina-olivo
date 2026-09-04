import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('operations console is routed separately and exposes support, directory, sources and audit', async () => {
  const main = await read('./main.tsx');
  const page = await read('./AdminOperationsPage.tsx');

  assert.match(main, /path === '\/admin\/operaciones'/);
  assert.match(main, /<AdminOperationsPage \/>/);
  assert.match(page, /\/api\/v1\/admin\/users/);
  assert.match(page, /\/api\/v1\/admin\/directory/);
  assert.match(page, /\/api\/v1\/admin\/sources/);
  assert.match(page, /\/api\/v1\/admin\/audit/);
  assert.match(page, /Cerrar sesiones/);
  assert.match(page, /Guardar ficha/);
});

test('operations UI explains privacy and traceability boundaries', async () => {
  const page = await read('./AdminOperationsPage.tsx');
  assert.match(page, /No abre parcelas, entregas ni documentos privados/);
  assert.match(page, /Los cambios quedan auditados/);
  assert.match(page, /URLs públicas deben ser HTTPS/);
});
