import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(path: string): Promise<string> {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('public advertising page is routed and explains transparent paid visibility', async () => {
  const main = await read('./main.tsx');
  const page = await read('./AdvertisePage.tsx');
  assert.match(main, /path === '\/anunciate'/);
  assert.match(main, /<AdvertisePage \/>/);
  assert.match(page, /Anuncia tu negocio en Mágina Olivo/);
  assert.match(page, /Patrocinado siempre identificado/);
  assert.match(page, /Precio a consultar/);
  assert.match(page, /consentAccepted: true/);
  assert.match(page, /ninguna solicitud se publica automáticamente|activación pública es un paso independiente/i);
});

test('commercial funnel creates drafts and keeps payments outside execution', async () => {
  const main = await read('./main.tsx');
  const page = await read('./AdminAdvertisingFunnelPage.tsx');
  assert.match(main, /path === '\/admin\/comercial'/);
  assert.match(main, /<AdminAdvertisingFunnelPage \/>/);
  assert.match(page, /Crear campaña borrador/);
  assert.match(page, /No mueve dinero, no genera factura fiscal y no activa publicidad/);
  assert.match(page, /\/admin\/finanzas/);
  assert.match(page, /\/admin\/publicidad/);
  assert.match(page, /\/admin\/operaciones#directorio/);
});

test('sponsored directory metrics never block navigation and do not identify the visitor', async () => {
  const page = await read('./MaginaDirectoryPage.tsx');
  assert.match(page, /\/api\/v1\/public\/advertising\/events/);
  assert.match(page, /crypto\.randomUUID/);
  assert.match(page, /keepalive: true/);
  assert.match(page, /Metrics must never block directory navigation/);
  assert.match(page, /No se guarda IP, usuario, explotación, parcela ni coordenadas precisas/);
  assert.doesNotMatch(page, /localStorage|sessionStorage|fingerprint/);
});
