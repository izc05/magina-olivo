import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('business application route and directory CTA stay wired', async () => {
  const main = await read('./main.tsx');
  const directory = await read('./MaginaDirectoryPage.tsx');
  const page = await read('./AdvertiserApplicationPage.tsx');

  assert.match(main, /AdvertiserApplicationPage/);
  assert.match(main, /\/empresas\/solicitud/);
  assert.match(directory, /Solicitar mi ficha/);
  assert.match(directory, /\/empresas\/solicitud/);
  assert.match(page, /Solicita tu ficha de empresa/);
  assert.match(page, /Tus solicitudes/);
});

test('business application UI keeps pilot and trust boundaries visible', async () => {
  const page = await read('./AdvertiserApplicationPage.tsx');

  assert.match(page, /permanece desactivada durante el piloto/i);
  assert.match(page, /email verificado de la cuenta/i);
  assert.match(page, /no activa ningún cobro ni patrocinio automáticamente/i);
  assert.match(page, /pagar por visibilidad nunca altera la información objetiva/i);
});
