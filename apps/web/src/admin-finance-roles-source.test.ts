import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const main = await readFile(new URL('./main.tsx', import.meta.url), 'utf8');
const finance = await readFile(new URL('./AdminFinancePage.tsx', import.meta.url), 'utf8');
const roles = await readFile(new URL('./AdminRolesPage.tsx', import.meta.url), 'utf8');
const shortcuts = await readFile(new URL('./AdminCommandShortcuts.tsx', import.meta.url), 'utf8');

test('finance and role administration have dedicated routes from the command center', () => {
  assert.match(main, /path === '\/admin\/finanzas'/);
  assert.match(main, /<AdminFinancePage \/>/);
  assert.match(main, /path === '\/admin\/roles'/);
  assert.match(main, /<AdminRolesPage \/>/);
  assert.match(main, /<AdminCommandShortcuts \/>/);
  assert.match(shortcuts, /\/admin\/finanzas/);
  assert.match(shortcuts, /\/admin\/roles/);
});

test('finance page is explicit that it does not execute payments or fiscal invoicing', () => {
  assert.match(finance, /No ejecuta pagos ni genera facturas fiscales/);
  assert.match(finance, /no mueve dinero/);
  assert.match(finance, /Por definir/);
  assert.match(finance, /Pendiente de cobro/);
  assert.match(finance, /Renovaciones · 30 días/);
});

test('role page only delegates commercial access in V1', () => {
  assert.match(roles, /Delegación V1/);
  assert.match(roles, /solo delegamos economía de publicidad/);
  assert.match(roles, /MAGINA_ADMIN_EMAILS/);
  assert.match(roles, /Conceder comercial/);
  assert.match(roles, /Gestionado por entorno/);
});
