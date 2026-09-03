import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('SIGPAC official consultation is wired behind our backend adapter', async () => {
  const app = await read('../../api/src/app.ts');
  const routes = await read('../../api/src/sigpac-map-routes.ts');
  const client = await read('../../api/src/sigpac-client.ts');
  const panel = await read('./SigpacRecintoPanel.tsx');

  assert.match(app, /registerSigpacMapRoutes/);
  assert.match(routes, /\/api\/v1\/maps\/sigpac\/recintos/);
  assert.match(routes, /getAuthenticatedSession/);
  assert.match(routes, /INVALID_SIGPAC_BBOX/);
  assert.match(routes, /SIGPAC_UNAVAILABLE/);
  assert.match(routes, /private, max-age=300/);

  assert.match(client, /sigpac-hubcloud\.es\/ogcapi\/collections\/recintos\/items/);
  assert.match(client, /SIGPAC_LIMIT = 100/);
  assert.match(client, /SIGPAC_TIMEOUT_MS = 8_000/);
  assert.match(client, /AbortSignal\.timeout/);
  assert.match(client, /maxLon - bbox\.minLon > 0\.05|bbox\.maxLon - bbox\.minLon > 0\.05/);

  assert.match(panel, /Buscar recintos oficiales cercanos/);
  assert.match(panel, /\/api\/v1\/maps\/sigpac\/recintos/);
  assert.match(panel, /Usar como perímetro/);
  assert.match(panel, /Confirmar perímetro SIGPAC/);
  assert.match(panel, /source: 'sigpac'/);
  assert.match(panel, /FEGA/);
  assert.match(panel, /CC BY 4\.0|source\.license/);
});

test('SIGPAC geometry import requires a simple confirmed polygon', async () => {
  const panel = await read('./SigpacRecintoPanel.tsx');

  assert.match(panel, /geometry\.type !== 'Polygon'/);
  assert.match(panel, /geometry\.coordinates\.length !== 1/);
  assert.match(panel, /confirmImportId !== selected\.id/);
  assert.match(panel, /MultiPolygon o huecos/);
  assert.match(panel, /PATCH/);
  assert.match(panel, /\/api\/v1\/plots\/\$\{selectedPlot\.id\}\/boundary/);
});
