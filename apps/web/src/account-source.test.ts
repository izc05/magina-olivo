import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Source gate for authenticated account preferences, portability and privacy-safe deletion UX.
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
  assert.match(account, /<AccountDeletionPanel email=\{user\.email\} \/>/);
});

test('account preferences and portability remain available', async () => {
  const account = await read('./AccountPage.tsx');

  assert.match(account, /preferredCooperativeId/);
  assert.match(account, /notifyWeather/);
  assert.match(account, /notifyTasks/);
  assert.match(account, /notifyPendingYield/);
  assert.match(account, /weatherRainProbabilityPercentThreshold/);
  assert.match(account, /Alarma de lluvia desde \(%\)/);
  assert.doesNotMatch(account, /Lluvia desde \(mm\)/);
  assert.match(account, /weatherFrostCThreshold/);
  assert.match(account, /weatherWindKmhThreshold/);
  assert.match(account, /predicción municipal disponible/);
  assert.match(account, /no comparte tus entregas, parcelas ni documentos/);
  assert.match(account, /Preparar copia de mis datos/);
  assert.match(account, /Descargar JSON/);
  assert.match(account, /no empaqueta todavía sus archivos binarios originales dentro de un ZIP/i);
});

test('account deletion requires strong confirmation and never claims immediate physical deletion', async () => {
  const account = await read('./AccountPage.tsx');
  const deletion = await read('./AccountDeletionPanel.tsx');

  assert.match(account, /Privacidad y control de tus datos|AccountDeletionPanel/);
  assert.match(deletion, /\/api\/v1\/account\/deletion-request/);
  assert.match(deletion, /wordConfirmation.*ELIMINAR/s);
  assert.match(deletion, /emailConfirmation/);
  assert.match(deletion, /Solicitud registrada/);
  assert.match(deletion, /supresión física todavía no se considera completada/);
  assert.match(deletion, /href="\/privacidad"/);
  assert.match(deletion, /href="\/contacto"/);
  assert.doesNotMatch(deletion, /Tu cuenta ha sido eliminada/);
});

// Keep this source gate in the CI-triggering slice so privacy changes always re-run repository gates.
