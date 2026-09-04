import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('private administration console opens on the command center and stays separate from the farmer app', async () => {
  const main = await read('./main.tsx');
  const commandCenter = await read('./AdminCommandCenterPage.tsx');

  assert.match(main, /path === '\/admin'/);
  assert.match(main, /<AdminCommandCenterPage \/>/);
  assert.match(commandCenter, /\/api\/v1\/admin\/command-center/);
  assert.match(commandCenter, /state === 'forbidden'/);
  assert.match(commandCenter, /Centro de mando/);
  assert.match(commandCenter, /datos son agregados/i);
});

test('advertising management remains available as a dedicated admin module', async () => {
  const main = await read('./main.tsx');
  const admin = await read('./AdminPage.tsx');
  const commandCenter = await read('./AdminCommandCenterPage.tsx');

  assert.match(main, /path === '\/admin\/publicidad'/);
  assert.match(main, /<AdminPage \/>/);
  assert.match(commandCenter, /href="\/admin\/publicidad"/);
  assert.match(admin, /Publicidad y patrocinios/);
  assert.match(admin, /Patrocinado/);
  assert.match(admin, /premium/);
  assert.match(admin, /featured/);
  assert.match(admin, /\/advertising\/campaigns/);
  assert.match(admin, /\/advertising\/applications/);
  assert.match(admin, /Pausar/);
  assert.match(admin, /Activar/);
});

test('command center prioritizes actionable support commercial source legal and system work', async () => {
  const commandCenter = await read('./AdminCommandCenterPage.tsx');

  assert.match(commandCenter, /Soporte urgente/);
  assert.match(commandCenter, /Fuentes con error/);
  assert.match(commandCenter, /Solicitudes publicitarias/);
  assert.match(commandCenter, /Documentos legales sin versión activa/);
  assert.match(commandCenter, /Evidencias operativas pendientes/);
  assert.match(commandCenter, /Patrocinios próximos a vencer/);
  assert.match(commandCenter, /\/admin\/soporte/);
  assert.match(commandCenter, /\/admin\/contenido/);
  assert.match(commandCenter, /\/admin\/operaciones/);
});
