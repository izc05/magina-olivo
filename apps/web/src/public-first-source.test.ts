import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(path: string): Promise<string> {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('public routes are reachable without a session and private destinations use an explicit gate', async () => {
  const main = await source('./main.tsx');
  const home = await source('./PublicHomePage.tsx');
  const gate = await source('./PrivateAccessGate.tsx');
  const navigation = await source('./PublicNavigation.tsx');
  const styles = await source('./styles.css');

  for (const route of ['/descubre', '/magina', '/magina/directorio', '/magina/tiempo', '/magina/campo', '/magina/noticias', '/magina/mercado']) {
    assert.match(main, new RegExp(`path === '${route}'`));
  }
  assert.match(main, /<PublicScreen><PublicHomePage \/><\/PublicScreen>/);
  assert.match(main, /<PrivateRoute returnTo=\{returnTo\}><AccountPage \/><\/PrivateRoute>/);
  assert.match(main, /<App initialTab="field" \/>/);
  assert.match(gate, /Inicia sesión o crea una cuenta para gestionar tu olivar\./);
  assert.match(gate, /\/login\?next=/);
  assert.doesNotMatch(gate, /window\.location/);
  assert.match(navigation, /href: '\/mi-campo', label: 'Mi Campo'/);
  assert.match(navigation, /href: '\/mi-magina', label: 'Mi Mágina'/);
  assert.match(navigation, /public-nav-action.*href="\/campana"/);
  assert.match(home, /fetch\('\/api\/v1\/public\/sources'/);
  assert.match(styles, /home-sierra-magina\.webp/);
  assert.match(home, /api\/v1\/public\/weather/);
  assert.match(home, /QuickIcon/);
  assert.match(home, /href=\{holding \? '\/calendario' : '\/login\?next=%2Fcalendario'\}/);
  assert.match(home, /Referencia AOVE/);
  assert.doesNotMatch(home, /22°|26°|14°|Riego pendiente/);
  assert.doesNotMatch(home, /https?:\/\//);
  assert.doesNotMatch(home, /\/api\/v1\/(?!public\/)/);
});

test('login returns only to a safe requested private destination', async () => {
  const login = await source('./LoginPage.tsx');
  const access = await source('./private-access.ts');

  assert.match(login, /window\.location\.assign\(destination\)/);
  assert.match(access, /value\.startsWith\('\/'\)/);
  assert.match(access, /value\.startsWith\('\/\/'\)/);
});

test('private API responses remain excluded from the public service-worker cache policy', async () => {
  const vite = await source('../vite.config.ts');
  assert.ok(vite.includes('urlPattern: /\\/api\\/v1\\/public\\//'));
  assert.equal(vite.includes('urlPattern: /\\/api\\/v1\\//,'), false);
});
