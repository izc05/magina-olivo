import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { downloadRaifOlivarArchive } from '../src/raif-source.ts';

const configuredPath = process.env.RAIF_SNAPSHOT_PATH?.trim();
if (!configuredPath) {
  throw new Error('RAIF_SNAPSHOT_PATH is required');
}

const outputPath = resolve(configuredPath);
await mkdir(dirname(outputPath), { recursive: true });

const snapshot = await downloadRaifOlivarArchive(outputPath);

console.log(JSON.stringify({
  event: 'raif_snapshot_downloaded',
  url: snapshot.url,
  downloadedAt: snapshot.downloadedAt,
  byteLength: snapshot.byteLength,
  sha256: snapshot.sha256,
  etag: snapshot.etag,
  lastModified: snapshot.lastModified,
  contentType: snapshot.contentType,
  outputPath: snapshot.outputPath,
}));
