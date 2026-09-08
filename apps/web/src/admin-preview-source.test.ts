import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('admin preview remains local-only while the real route uses a protected server-backed dashboard', async () => {
  const page = await read('./AdminDashboardPreview.tsx');
  const main = await read('./main.tsx');
  const dashboard = await read('./AdminDashboardPage.tsx');

  assert.match(main, /path === '\/admin'/);
  assert.match(main, /import\.meta\.env\.DEV/);
  assert.match(main, /get\('preview'\) === '1'/);
  assert.match(main, /<PrivateRoute returnTo=\{returnTo\}><AdminDashboardPage \/><\/PrivateRoute>/);
  assert.match(dashboard, /\/api\/v1\/admin\/news/);
  assert.match(dashboard, /Noticias verificadas/);
  assert.match(dashboard, /setNewsVisibility/);
  assert.match(dashboard, /No se edita el titular ni el enlace/);
  assert.match(dashboard, /className="admin-workspace-nav"/);
  assert.match(dashboard, /href="#admin-sources"/);
  assert.match(dashboard, /href="#admin-news"/);
  assert.match(dashboard, /Acciones rápidas/);
  assert.match(dashboard, /Fuentes correctas/);
  assert.match(page, /Vista local de diseño/);
  assert.match(page, /sin acceso administrativo ni escrituras reales/);
  assert.match(page, /rol de plataforma independiente/);
  assert.match(page, /useState\('Resumen'\)/);
  assert.match(page, /setNotice\('Acción de demostración/);
  assert.doesNotMatch(page, /fetch\(|api\./);
  assert.match(dashboard, /\/api\/v1\/admin\/overview/);
  assert.match(dashboard, /documentos ni datos productivos/);
});
