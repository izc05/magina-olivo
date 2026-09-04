import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const page = await readFile(new URL('./AdminContentPage.tsx', import.meta.url), 'utf8');
const announcements = await readFile(new URL('./PlatformAnnouncements.tsx', import.meta.url), 'utf8');
const main = await readFile(new URL('./main.tsx', import.meta.url), 'utf8');

test('admin content console exposes news rain overview and first-party notices', () => {
  assert.match(main, /path === '\/admin\/contenido'/);
  assert.match(page, /Noticias, alertas y avisos/);
  assert.match(page, /Alertas automáticas de lluvia/);
  assert.match(page, /No equivale a avisos meteorológicos oficiales/);
  assert.match(page, /Avisos propios/);
  assert.match(page, /Destacar/);
});

test('platform notices are clearly separated from official alerts', () => {
  assert.match(announcements, /Mágina Olivo · Aviso de la plataforma/);
  assert.match(announcements, /officialWarning: false/);
  assert.match(announcements, /\/api\/v1\/account\/announcements/);
  assert.match(announcements, /\/api\/v1\/public\/announcements/);
  assert.match(main, /!path\.startsWith\('\/admin'\) \? <PlatformAnnouncements \/>/);
});
