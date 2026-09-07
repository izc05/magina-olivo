import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('admin visual preview remains local-only and never claims platform authorization', async () => {
  const page = await read('./AdminDashboardPreview.tsx');
  const main = await read('./main.tsx');

  assert.match(main, /path === '\/admin'/);
  assert.match(main, /import\.meta\.env\.DEV/);
  assert.match(main, /get\('preview'\) === '1'/);
  assert.match(page, /Vista local de diseño/);
  assert.match(page, /sin acceso administrativo ni escrituras reales/);
  assert.match(page, /rol de plataforma independiente/);
  assert.match(page, /useState\('Resumen'\)/);
  assert.match(page, /setNotice\('Acción de demostración/);
  assert.doesNotMatch(page, /fetch\(|api\./);
});
