import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('Catastro UI laboratory route is explicit and disabled unless the lab flag is enabled', async () => {
  const main = await read('./main.tsx');
  const lab = await read('./CatastroUiLabPage.tsx');

  assert.match(main, /VITE_CATASTRO_UI_LAB === 'true'/);
  assert.match(main, /path === '\/lab\/catastro' && catastroUiLabEnabled/);
  assert.match(main, /<CatastroUiLabPage \/>/);

  assert.match(lab, /LAB · no producción/);
  assert.match(lab, /Encuentra tu parcela en Catastro/);
  assert.match(lab, /Señalar en el mapa/);
  assert.match(lab, /Referencia catastral/);
  assert.match(lab, /Buscar alrededor/);
  assert.match(lab, /Confirmar perímetro/);
  assert.doesNotMatch(lab, /fetch\s*\(/);
});

test('Catastro UI laboratory preserves the safety and source language that must survive a future real integration', async () => {
  const lab = await read('./CatastroUiLabPage.tsx');

  assert.match(lab, /No guardaremos nada hasta que revises y confirmes el perímetro/);
  assert.match(lab, /Dirección General del Catastro/);
  assert.match(lab, /Catastro y SIGPAC pueden mostrar límites y superficies diferentes/);
  assert.match(lab, /volverá a comprobar esta referencia directamente en Catastro/);
  assert.match(lab, /No usaremos una geometría enviada por el navegador/);
});
