import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webDir = dirname(scriptDir);
const distDir = join(webDir, 'dist');

const rawKey = process.env.INDEXNOW_KEY?.trim() ?? '';

if (!rawKey) {
  console.info('IndexNow key not configured; skipping public verification file generation.');
  process.exit(0);
}

if (!/^[A-Za-z0-9_-]{8,128}$/.test(rawKey)) {
  throw new Error('INDEXNOW_KEY must contain 8–128 URL-safe alphanumeric, underscore or hyphen characters.');
}

await writeFile(join(distDir, `${rawKey}.txt`), `${rawKey}\n`, 'utf8');
console.info('IndexNow public verification file generated.');
