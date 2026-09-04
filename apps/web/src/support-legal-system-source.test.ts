import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const contact = await readFile(new URL('./ContactPage.tsx', import.meta.url), 'utf8');
const legal = await readFile(new URL('./LegalPage.tsx', import.meta.url), 'utf8');
const admin = await readFile(new URL('./AdminSupportSystemPage.tsx', import.meta.url), 'utf8');
const main = await readFile(new URL('./main.tsx', import.meta.url), 'utf8');

test('public contact and legal pages are routable and transparent about unpublished legal text', () => {
  assert.match(main, /path === '\/contacto'/);
  assert.match(main, /path === '\/legal\/privacidad'/);
  assert.match(main, /path === '\/legal\/cookies'/);
  assert.match(main, /path === '\/legal\/terminos'/);
  assert.match(contact, /No envíes contraseñas, códigos de acceso ni tokens/);
  assert.match(contact, /tampoco admite adjuntos/);
  assert.match(legal, /Documento todavía no publicado/);
  assert.match(legal, /texto revisado y activado/);
});

test('admin support surface keeps restore outside the browser', () => {
  assert.match(main, /path === '\/admin\/soporte'/);
  assert.match(admin, /Soporte, legal y sistema/);
  assert.match(admin, /Restauración.*fuera del navegador/i);
  assert.match(admin, /browserRestoreExecution/);
  assert.doesNotMatch(admin, /Ejecutar restore|Restaurar ahora|Restaurar backup/i);
  assert.doesNotMatch(admin, /\/api\/v1\/admin\/(?:restore|system\/restore|backup\/restore)/i);
});
