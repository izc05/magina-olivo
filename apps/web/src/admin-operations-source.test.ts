import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('operations console is routed through role-aware entry with full and delegated variants', async () => {
  const main = await read('./main.tsx');
  const entry = await read('./AdminRoleEntry.tsx');
  const fullPage = await read('./AdminOperationsPage.tsx');
  const scopedPage = await read('./AdminOperationsScopedPage.tsx');

  assert.match(main, /path === '\/admin\/operaciones'/);
  assert.match(main, /<AdminRoleEntry kind="operations" \/>/);
  assert.match(entry, /<AdminOperationsPage \/>/);
  assert.match(entry, /<AdminOperationsScopedPage \/>/);
  assert.match(entry, /access\.capabilities\.operations/);

  assert.match(fullPage, /\/api\/v1\/admin\/users/);
  assert.match(fullPage, /Cerrar sesiones/);
  assert.match(scopedPage, /\/api\/v1\/admin\/delegated\/operations\/directory/);
  assert.match(scopedPage, /\/api\/v1\/admin\/delegated\/operations\/sources/);
  assert.match(scopedPage, /\/api\/v1\/admin\/delegated\/operations\/audit/);
  assert.match(scopedPage, /\/api\/v1\/admin\/delegated\/operations\/system/);
  assert.doesNotMatch(scopedPage, /revoke-sessions/);
  assert.doesNotMatch(scopedPage, /\/api\/v1\/admin\/users/);
});

test('operations UI explains privacy and traceability boundaries', async () => {
  const fullPage = await read('./AdminOperationsPage.tsx');
  const scopedPage = await read('./AdminOperationsScopedPage.tsx');

  assert.match(fullPage, /No abre parcelas, entregas ni documentos privados/);
  assert.match(fullPage, /Los cambios quedan auditados/);
  assert.match(fullPage, /URLs públicas deben ser HTTPS/);
  assert.match(scopedPage, /Sin acceso a usuarios ni datos agrícolas privados/);
  assert.match(scopedPage, /No existe ejecución de restore desde el navegador/);
  assert.match(scopedPage, /vista delegada no muestra correos de otros administradores/);
});
