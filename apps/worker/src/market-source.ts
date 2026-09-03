export const DEFAULT_MARKET_WEEKLY_CSV_URL =
  'https://ws142.juntadeandalucia.es/agriculturaypesca/opendata/prb/SEMANAL.csv';
export const DEFAULT_MARKET_WEEKLY_JSON_URL =
  'https://ws142.juntadeandalucia.es/agriculturaypesca/opendata/prb/SEMANAL_0.js';

export type MarketResourceInspection = {
  kind: 'csv' | 'json';
  url: string;
  checkedAt: string;
  etag: string | null;
  lastModified: string | null;
  contentLength: number | null;
  contentType: string | null;
};

export function assertTrustedMarketUrl(rawUrl: string): URL {
  const url = new URL(rawUrl);
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || !(hostname === 'juntadeandalucia.es' || hostname.endsWith('.juntadeandalucia.es'))) {
    throw new Error('MARKET_SOURCE_URL_NOT_TRUSTED');
  }
  return url;
}

function parseContentLength(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

async function inspectOne(kind: 'csv' | 'json', rawUrl: string): Promise<MarketResourceInspection> {
  const requestedUrl = assertTrustedMarketUrl(rawUrl);
  const response = await fetch(requestedUrl, {
    method: 'HEAD',
    redirect: 'follow',
    headers: {
      accept: kind === 'csv' ? 'text/csv,text/plain,*/*;q=0.1' : 'application/json,text/javascript,text/plain,*/*;q=0.1',
      'user-agent': 'Magina-Olivo/1.0 (+observatorio-public-source-inspector)',
    },
  });

  if (!response.ok) throw new Error(`MARKET_SOURCE_${kind.toUpperCase()}_HTTP_${response.status}`);

  const finalUrl = assertTrustedMarketUrl(response.url || requestedUrl.toString());
  return {
    kind,
    url: finalUrl.toString(),
    checkedAt: new Date().toISOString(),
    etag: response.headers.get('etag'),
    lastModified: response.headers.get('last-modified'),
    contentLength: parseContentLength(response.headers.get('content-length')),
    contentType: response.headers.get('content-type'),
  };
}

export async function inspectMarketSources(
  csvUrl = process.env.MARKET_WEEKLY_CSV_URL?.trim() || DEFAULT_MARKET_WEEKLY_CSV_URL,
  jsonUrl = process.env.MARKET_WEEKLY_JSON_URL?.trim() || DEFAULT_MARKET_WEEKLY_JSON_URL,
): Promise<MarketResourceInspection[]> {
  return Promise.all([
    inspectOne('csv', csvUrl),
    inspectOne('json', jsonUrl),
  ]);
}
