import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// P0 source gate for authenticated account preferences, portability and privacy-safe UI promises.
async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('Mi Cuenta is reachable only through an authenticated session signal', async () => {
  const main = await read('./main.tsx');
  const entry = await read('./RegistrationEntry.tsx');
  const account = await read('./AccountPage.tsx');

  assert.match(main, /path === '\/cuenta'/);
  assert.match(main, /<AccountPage \/>/);
  assert.match(entry, /response\.ok/);
  assert.match(entry, /state === 'signed_in'/);
  assert.match(entry, /href="\/cuenta"/);
  assert.match(account, /\/api\/v1\/me/);
  assert.match(account, /\/api\/v1\/account\/preferences/);
  assert.match(account, /\/api\/v1\/public\/destinations/);
  assert.match(account, /\/api\/v1\/account\/exports/);
});

test('account preferences persist user choices and portability does not overpromise destructive or ZIP flows', async () => {
  const account = await read('./AccountPage.tsx');

  assert.match(account, /preferredCooperativeId/);
  assert.match(account, /notifyWeather/);
  assert.match(account, /notifyTasks/);
  assert.match(account, /notifyPendingYield/);
  assert.match(account, /weatherRainProbabilityPercentThreshold/);
  assert.match(account, /Probabilidad de lluvia desde \(%\)/);
  assert.doesNotMatch(account, /Lluvia desde \(mm\)/);
  assert.match(account, /weatherFrostCThreshold/);
  assert.match(account, /weatherWindKmhThreshold/);
  assert.match(account, /predicción municipal de AEMET/);
  assert.match(account, /Seleccionarla no comparte tus entregas ni tus documentos/);
  assert.match(account, /Preparar copia de mis datos/);
  assert.match(account, /Descargar JSON/);
  assert.match(account, /no incluye todavía los archivos binarios originales dentro de un ZIP/i);
  assert.match(account, /Baja de cuenta/);
  assert.match(account, /No mostraremos una acción destructiva/);
  assert.doesNotMatch(account, /Eliminar cuenta<\/button>/);
});

// Keep this source gate in the CI-triggering slice so portability changes always re-run both repository gates.
