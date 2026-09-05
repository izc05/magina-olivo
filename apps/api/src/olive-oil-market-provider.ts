export const DEFAULT_OLIVE_OIL_MARKET_URL =
  'https://www.juntadeandalucia.es/agriculturaypesca/observatorio/servlet/FrontController?action=UltimosPrecios&posicion=2291332&producto=33000&subsector=33';

export type OliveOilMarketSeriesKey = 'extra' | 'virgin' | 'lampante';

export type OliveOilMarketWeek = {
  week: number;
  label: string;
  startDate: string | null;
  endDate: string | null;
};

export type OliveOilMarketSeries = {
  key: OliveOilMarketSeriesKey;
  label: string;
  values: Array<number | null>;
};

export type OliveOilMarketSnapshot = {
  provider: string;
  sourceUrl: string;
  checkedAt: string;
  position: string;
  scope: string;
  unit: '€/kg';
  weeks: OliveOilMarketWeek[];
  series: OliveOilMarketSeries[];
};

const MAX_MARKET_HTML_BYTES = 2 * 1024 * 1024;

function decodeHtml(value: string): string {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    bull: '•',
    gt: '>',
    laquo: '«',
    lt: '<',
    middot: '·',
    nbsp: ' ',
    ndash: '–',
    quot: '"',
    raquo: '»',
  };

  return value
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, entity: string) => named[entity.toLowerCase()] ?? match);
}

function cellText(value: string): string {
  return decodeHtml(
    value
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function rowsFromHtml(html: string): string[][] {
  const rows: string[][] = [];
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const rowHtml = row[1];
    if (rowHtml == null) continue;
    const cells: string[] = [];
    for (const cell of rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)) {
      const cellHtml = cell[1];
      if (cellHtml != null) cells.push(cellText(cellHtml));
    }
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

function normalizedCategory(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('es-ES')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePrice(value: string): number | null {
  const cleaned = value.trim().replace(/\s/g, '');
  if (!/^\d{1,3}(?:\.\d{3})*(?:,\d+)?$/.test(cleaned) && !/^\d+(?:[.,]\d+)?$/.test(cleaned)) return null;
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 && number < 100 ? number : null;
}

function isoSpanishDate(value: string | undefined): string | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!match) return null;
  const dayText = match[1];
  const monthText = match[2];
  const yearText = match[3];
  if (!dayText || !monthText || !yearText) return null;
  const day = Number(dayText);
  const month = Number(monthText);
  const shortYear = Number(yearText);
  const year = yearText.length === 2 ? 2000 + shortYear : shortYear;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null;
  return date.toISOString().slice(0, 10);
}

function parseWeek(value: string): OliveOilMarketWeek | null {
  const weekMatch = value.match(/Semana\s+(\d{1,2})/i);
  const weekText = weekMatch?.[1];
  if (!weekText) return null;
  const dates: string[] = [];
  for (const dateMatch of value.matchAll(/(\d{1,2}\/\d{1,2}\/\d{2,4})/g)) {
    const dateText = dateMatch[1];
    if (dateText) dates.push(dateText);
  }
  const week = Number(weekText);
  return {
    week,
    label: `Semana ${week}`,
    startDate: isoSpanishDate(dates[0]),
    endDate: isoSpanishDate(dates[1]),
  };
}

function categoryForCell(value: string): OliveOilMarketSeriesKey | null {
  const normalized = normalizedCategory(value);
  if (normalized.includes('VIRGEN-EXTRA') || normalized.includes('VIRGEN EXTRA')) return 'extra';
  if (normalized.includes('LAMPANTE')) return 'lampante';
  if (normalized === 'VIRGEN') return 'virgin';
  return null;
}

function seriesLabel(key: OliveOilMarketSeriesKey): string {
  if (key === 'extra') return 'Virgen extra';
  if (key === 'virgin') return 'Virgen';
  return 'Lampante';
}

export function parseOliveOilMarketHtml(html: string, sourceUrl = DEFAULT_OLIVE_OIL_MARKET_URL): OliveOilMarketSnapshot {
  const rows = rowsFromHtml(html);
  const header = rows
    .map((row) => row.map(parseWeek).filter((item): item is OliveOilMarketWeek => item !== null))
    .find((weeks) => weeks.length >= 2);

  if (!header || header.length < 2) throw new Error('OLIVE_OIL_MARKET_WEEKS_NOT_FOUND');

  const values = new Map<OliveOilMarketSeriesKey, Array<number | null>>();
  for (const row of rows) {
    const categoryIndex = row.findIndex((cell) => categoryForCell(cell) !== null);
    if (categoryIndex < 0) continue;
    const categoryCell = row[categoryIndex];
    if (categoryCell == null) continue;
    const key = categoryForCell(categoryCell);
    if (!key) continue;

    const parsed = row
      .slice(categoryIndex + 1)
      .map(parsePrice)
      .filter((value): value is number => value !== null);
    if (parsed.length < header.length) continue;
    values.set(key, parsed.slice(-header.length));
  }

  const required: OliveOilMarketSeriesKey[] = ['extra', 'virgin', 'lampante'];
  for (const key of required) {
    if (!values.has(key)) throw new Error(`OLIVE_OIL_MARKET_SERIES_${key.toUpperCase()}_NOT_FOUND`);
  }

  return {
    provider: 'Observatorio de Precios y Mercados · Junta de Andalucía',
    sourceUrl,
    checkedAt: new Date().toISOString(),
    position: 'Almazara o Bodega',
    scope: 'Andalucía',
    unit: '€/kg',
    weeks: header,
    series: required.map((key) => ({
      key,
      label: seriesLabel(key),
      values: values.get(key) ?? header.map(() => null),
    })),
  };
}

export function assertTrustedOliveOilMarketUrl(rawUrl: string): URL {
  const url = new URL(rawUrl);
  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== 'https:'
    || !(hostname === 'juntadeandalucia.es' || hostname.endsWith('.juntadeandalucia.es'))
  ) {
    throw new Error('OLIVE_OIL_MARKET_SOURCE_NOT_TRUSTED');
  }
  return url;
}

export async function fetchOliveOilMarketSnapshot(
  rawUrl = process.env.OLIVE_OIL_MARKET_URL?.trim() || DEFAULT_OLIVE_OIL_MARKET_URL,
): Promise<OliveOilMarketSnapshot> {
  const requestedUrl = assertTrustedOliveOilMarketUrl(rawUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(requestedUrl, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
        'user-agent': 'Magina-Olivo/1.0 (+official-olive-oil-market-reader)',
      },
    });
    if (!response.ok) throw new Error(`OLIVE_OIL_MARKET_HTTP_${response.status}`);
    const finalUrl = assertTrustedOliveOilMarketUrl(response.url || requestedUrl.toString());
    const declaredLength = Number(response.headers.get('content-length') ?? '0');
    if (Number.isFinite(declaredLength) && declaredLength > MAX_MARKET_HTML_BYTES) {
      throw new Error('OLIVE_OIL_MARKET_RESPONSE_TOO_LARGE');
    }
    const html = await response.text();
    if (Buffer.byteLength(html, 'utf8') > MAX_MARKET_HTML_BYTES) throw new Error('OLIVE_OIL_MARKET_RESPONSE_TOO_LARGE');
    return parseOliveOilMarketHtml(html, finalUrl.toString());
  } finally {
    clearTimeout(timer);
  }
}
