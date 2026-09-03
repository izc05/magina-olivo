import { createHash } from 'node:crypto';
import { open, unlink } from 'node:fs/promises';

export const DEFAULT_RAIF_OLIVAR_ZIP_URL =
  'https://www.juntadeandalucia.es/datosabiertos/portal/dataset/cdc8b852-6e4a-4336-9785-606fbbdc2243/resource/74062bbf-8391-460b-97c3-3aec55be5d77/download/raif_olivar_andalucia_2006_2026.zip';

export const MAX_RAIF_ARCHIVE_BYTES = 128 * 1024 * 1024;

export type RaifSourceInspection = {
  url: string;
  checkedAt: string;
  etag: string | null;
  lastModified: string | null;
  contentLength: number | null;
  contentType: string | null;
};

export type RaifArchiveSnapshot = {
  url: string;
  downloadedAt: string;
  etag: string | null;
  lastModified: string | null;
  contentType: string | null;
  byteLength: number;
  sha256: string;
  outputPath: string;
};

export function assertTrustedRaifUrl(rawUrl: string): URL {
  const url = new URL(rawUrl);
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || !(hostname === 'juntadeandalucia.es' || hostname.endsWith('.juntadeandalucia.es'))) {
    throw new Error('RAIF_SOURCE_URL_NOT_TRUSTED');
  }
  return url;
}

function parseContentLength(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function hasZipSignature(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 4) return false;
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return false;
  return (
    (bytes[2] === 0x03 && bytes[3] === 0x04)
    || (bytes[2] === 0x05 && bytes[3] === 0x06)
    || (bytes[2] === 0x07 && bytes[3] === 0x08)
  );
}

export async function inspectRaifOlivarSource(
  rawUrl = process.env.RAIF_OLIVAR_ZIP_URL?.trim() || DEFAULT_RAIF_OLIVAR_ZIP_URL,
): Promise<RaifSourceInspection> {
  const requestedUrl = assertTrustedRaifUrl(rawUrl);
  const response = await fetch(requestedUrl, {
    method: 'HEAD',
    redirect: 'follow',
    headers: {
      accept: 'application/zip,application/octet-stream,*/*;q=0.1',
      'user-agent': 'Magina-Olivo/1.0 (+raif-public-source-inspector)',
    },
  });

  if (!response.ok) {
    throw new Error(`RAIF_SOURCE_HTTP_${response.status}`);
  }

  const finalUrl = assertTrustedRaifUrl(response.url || requestedUrl.toString());

  return {
    url: finalUrl.toString(),
    checkedAt: new Date().toISOString(),
    etag: response.headers.get('etag'),
    lastModified: response.headers.get('last-modified'),
    contentLength: parseContentLength(response.headers.get('content-length')),
    contentType: response.headers.get('content-type'),
  };
}

export async function downloadRaifOlivarArchive(
  outputPath: string,
  options: {
    rawUrl?: string;
    maxBytes?: number;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<RaifArchiveSnapshot> {
  if (!outputPath.trim()) throw new Error('RAIF_SNAPSHOT_PATH_REQUIRED');

  const maxBytes = options.maxBytes ?? MAX_RAIF_ARCHIVE_BYTES;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 4) {
    throw new Error('RAIF_ARCHIVE_MAX_BYTES_INVALID');
  }

  const rawUrl = options.rawUrl?.trim()
    || process.env.RAIF_OLIVAR_ZIP_URL?.trim()
    || DEFAULT_RAIF_OLIVAR_ZIP_URL;
  const requestedUrl = assertTrustedRaifUrl(rawUrl);
  const fetchImpl = options.fetchImpl ?? fetch;

  const response = await fetchImpl(requestedUrl, {
    method: 'GET',
    redirect: 'follow',
    headers: {
      accept: 'application/zip,application/octet-stream,*/*;q=0.1',
      'user-agent': 'Magina-Olivo/1.0 (+raif-public-source-snapshot)',
    },
  });

  if (!response.ok) throw new Error(`RAIF_SOURCE_HTTP_${response.status}`);
  const finalUrl = assertTrustedRaifUrl(response.url || requestedUrl.toString());

  const declaredLength = parseContentLength(response.headers.get('content-length'));
  if (declaredLength !== null && declaredLength > maxBytes) {
    throw new Error('RAIF_ARCHIVE_TOO_LARGE');
  }
  if (!response.body) throw new Error('RAIF_ARCHIVE_BODY_MISSING');

  const file = await open(outputPath, 'wx', 0o600);
  const hash = createHash('sha256');
  const prefix = new Uint8Array(4);
  let prefixLength = 0;
  let byteLength = 0;
  let keepFile = false;

  try {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;

      byteLength += value.byteLength;
      if (byteLength > maxBytes) {
        await reader.cancel('RAIF_ARCHIVE_TOO_LARGE').catch(() => undefined);
        throw new Error('RAIF_ARCHIVE_TOO_LARGE');
      }

      if (prefixLength < prefix.byteLength) {
        const toCopy = Math.min(prefix.byteLength - prefixLength, value.byteLength);
        prefix.set(value.subarray(0, toCopy), prefixLength);
        prefixLength += toCopy;
      }

      hash.update(value);
      await file.write(value);
    }

    if (!hasZipSignature(prefix.subarray(0, prefixLength))) {
      throw new Error('RAIF_ARCHIVE_NOT_ZIP');
    }

    await file.sync();
    keepFile = true;

    return {
      url: finalUrl.toString(),
      downloadedAt: new Date().toISOString(),
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified'),
      contentType: response.headers.get('content-type'),
      byteLength,
      sha256: hash.digest('hex'),
      outputPath,
    };
  } finally {
    await file.close();
    if (!keepFile) {
      await unlink(outputPath).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
  }
}
