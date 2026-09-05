import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./MaginaPrivateHub.tsx', import.meta.url), 'utf8');

test('private Mágina hub exposes the real public service routes', () => {
  for (const path of ['/magina/tiempo', '/magina/campo', '/magina/noticias', '/magina/mercado', '/magina/directorio']) {
    assert.match(source, new RegExp(path.replaceAll('/', '\\/')));
  }
});

test('private Mágina hub keeps public and private data explicitly separated', () => {
  assert.match(source, /Información pública útil para el olivar/);
  assert.match(source, /Tus datos de explotación continúan dentro del área privada/);
});
