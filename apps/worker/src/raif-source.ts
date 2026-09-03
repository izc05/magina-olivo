export const DEFAULT_RAIF_OLIVAR_ZIP_URL =
  'https://www.juntadeandalucia.es/datosabiertos/portal/dataset/cdc8b852-6e4a-4336-9785-606fbbdc2243/resource/74062bbf-8391-460b-97c3-3aec55be5d77/download/raif_olivar_andalucia_2006_2026.zip';

export type RaifSourceInspection = {
  url: string;
  checkedAt: string;
  etag: string | null;
  lastModified: string | null;
  contentLength: number | null;
  contentType: string | null;
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
