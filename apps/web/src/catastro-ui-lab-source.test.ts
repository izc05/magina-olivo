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

test('Lab requires a deliberate map point and supports keyboard-equivalent point selection', async () => {
  const lab = await read('./CatastroUiLabPage.tsx');

  assert.match(lab, /const \[point, setPoint\] = useState<MapPoint \| null>\(null\)/);
  assert.match(lab, /onPointerDown=\{selectFromPointer\}/);
  assert.match(lab, /onKeyDown=\{selectFromKeyboard\}/);
  assert.match(lab, /event\.key !== 'Enter' && event\.key !== ' '/);
  assert.match(lab, /mode === 'point'\s*\? !point/);
  assert.match(lab, /Toca dentro de tu parcela/);
  assert.match(lab, /Punto marcado · puedes continuar/);
});

test('Lab validates cadastral references before review and normalizes full RCs to parcel base', async () => {
  const lab = await read('./CatastroUiLabPage.tsx');

  assert.match(lab, /\{14\}.*\{18\}.*\{20\}/s);
  assert.match(lab, /function normalizeReference/);
  assert.match(lab, /slice\(0, 14\)/);
  assert.match(lab, /aria-invalid=\{referenceTouched && !referenceValid\}/);
  assert.match(lab, /Revisa la referencia: debe contener 14, 18 o 20 caracteres alfanuméricos/);
  assert.match(lab, /Has introducido una RC completa/);
});

test('Nearby laboratory path makes the user choose among multiple cadastral candidates', async () => {
  const lab = await read('./CatastroUiLabPage.tsx');

  assert.match(lab, /NEARBY_CANDIDATES/);
  assert.match(lab, /3 parcelas encontradas/);
  assert.match(lab, /Elige la que reconoces por número, superficie y posición/);
  assert.match(lab, /chooseNearby\(candidate\)/);
});

test('Final boundary replacement cannot be confirmed without an explicit unchecked-by-default acknowledgement', async () => {
  const lab = await read('./CatastroUiLabPage.tsx');
  const refinements = await read('./catastro-ui-lab-refinements.css');

  assert.match(lab, /const \[confirmed, setConfirmed\] = useState\(false\)/);
  assert.match(lab, /checked=\{confirmed\}/);
  assert.match(lab, /onChange=\{\(event\) => setConfirmed\(event\.target\.checked\)\}/);
  assert.match(lab, /disabled=\{!confirmed\}/);
  assert.doesNotMatch(lab, /defaultChecked/);
  assert.match(lab, /La confirmación es obligatoria/);
  assert.match(refinements, /catastro-lab-primary:disabled/);
});
