import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { assertTrustedRaifUrl, DEFAULT_RAIF_OLIVAR_ZIP_URL } from './raif-source.ts';

test('accepts the official Junta de Andalucía RAIF olivar resource', () => {
  const url = assertTrustedRaifUrl(DEFAULT_RAIF_OLIVAR_ZIP_URL);
  assert.equal(url.protocol, 'https:');
  assert.equal(url.hostname, 'www.juntadeandalucia.es');
  assert.match(url.pathname, /raif_olivar_andalucia_2006_2026\.zip$/);
});

test('rejects non-HTTPS and non-Junta RAIF source URLs', () => {
  assert.throws(() => assertTrustedRaifUrl('http://www.juntadeandalucia.es/file.zip'), /RAIF_SOURCE_URL_NOT_TRUSTED/);
  assert.throws(() => assertTrustedRaifUrl('https://evil.example/raif.zip'), /RAIF_SOURCE_URL_NOT_TRUSTED/);
  assert.throws(() => assertTrustedRaifUrl('https://juntadeandalucia.es.evil.example/raif.zip'), /RAIF_SOURCE_URL_NOT_TRUSTED/);
});

test('RAIF header inspection cannot promote HTTP Last-Modified to authoritative source freshness', async () => {
  const worker = await readFile(new URL('./worker.ts', import.meta.url), 'utf8');
  const inspectionBlock = worker.match(/async function inspectRaifPublicSource\(\): Promise<void> \{[\s\S]*?\n\}\n\nasync function inspectMarketPublicSource/)?.[0];
  assert.ok(inspectionBlock, 'RAIF inspection worker block must exist');
  assert.doesNotMatch(inspectionBlock, /source_updated_at/);
  assert.match(inspectionBlock, /remoteLastModified/);
  assert.match(inspectionBlock, /catalog-or-validated-snapshot-only/);
});
