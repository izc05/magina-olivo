import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  assertTrustedRaifUrl,
  DEFAULT_RAIF_OLIVAR_ZIP_URL,
  downloadRaifOlivarArchive,
  hasZipSignature,
} from './raif-source.ts';

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

test('recognizes supported ZIP signatures only', () => {
  assert.equal(hasZipSignature(Uint8Array.from([0x50, 0x4b, 0x03, 0x04])), true);
  assert.equal(hasZipSignature(Uint8Array.from([0x50, 0x4b, 0x05, 0x06])), true);
  assert.equal(hasZipSignature(Uint8Array.from([0x50, 0x4b, 0x07, 0x08])), true);
  assert.equal(hasZipSignature(new TextEncoder().encode('<htm')), false);
});

test('downloads a bounded RAIF ZIP snapshot and records its SHA-256', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'magina-raif-'));
  const outputPath = join(directory, 'snapshot.zip');
  const bytes = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x41, 0x42, 0x43, 0x44]);
  const expectedHash = createHash('sha256').update(bytes).digest('hex');
  const fetchImpl = (async () => new Response(bytes, {
    status: 200,
    headers: {
      'content-type': 'application/zip',
      'content-length': String(bytes.byteLength),
      etag: '"fixture"',
    },
  })) as typeof fetch;

  try {
    const snapshot = await downloadRaifOlivarArchive(outputPath, { fetchImpl, maxBytes: 1024 });
    assert.equal(snapshot.byteLength, bytes.byteLength);
    assert.equal(snapshot.sha256, expectedHash);
    assert.equal(snapshot.etag, '"fixture"');
    assert.deepEqual(Array.from(await readFile(outputPath)), Array.from(bytes));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('deletes a downloaded body that is not actually a ZIP archive', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'magina-raif-'));
  const outputPath = join(directory, 'snapshot.zip');
  const fetchImpl = (async () => new Response('<html>blocked</html>', {
    status: 200,
    headers: { 'content-type': 'text/html' },
  })) as typeof fetch;

  try {
    await assert.rejects(
      downloadRaifOlivarArchive(outputPath, { fetchImpl, maxBytes: 1024 }),
      /RAIF_ARCHIVE_NOT_ZIP/,
    );
    await assert.rejects(readFile(outputPath), (error: NodeJS.ErrnoException) => error.code === 'ENOENT');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('rejects an oversized RAIF archive before creating a snapshot file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'magina-raif-'));
  const outputPath = join(directory, 'snapshot.zip');
  const bytes = Uint8Array.from([0x50, 0x4b, 0x03, 0x04]);
  const fetchImpl = (async () => new Response(bytes, {
    status: 200,
    headers: { 'content-length': '2048' },
  })) as typeof fetch;

  try {
    await assert.rejects(
      downloadRaifOlivarArchive(outputPath, { fetchImpl, maxBytes: 1024 }),
      /RAIF_ARCHIVE_TOO_LARGE/,
    );
    await assert.rejects(readFile(outputPath), (error: NodeJS.ErrnoException) => error.code === 'ENOENT');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('RAIF header inspection cannot promote HTTP Last-Modified to authoritative source freshness', async () => {
  const workerRuntime = await readFile(new URL('./worker-core.ts', import.meta.url), 'utf8');
  const inspectionBlock = workerRuntime.match(/async function inspectRaifPublicSource\(\): Promise<void> \{[\s\S]*?\n\}\n\nasync function inspectMarketPublicSource/)?.[0];
  assert.ok(inspectionBlock, 'RAIF inspection worker block must exist in the core worker runtime');
  assert.doesNotMatch(inspectionBlock, /source_updated_at/);
  assert.match(inspectionBlock, /remoteLastModified/);
  assert.match(inspectionBlock, /catalog-or-validated-snapshot-only/);
});
