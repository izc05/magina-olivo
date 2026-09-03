import { readFile, writeFile } from 'node:fs/promises';

const OUTPUT = new URL('../public/data/market.json', import.meta.url);
const SOURCE_URL = 'https://www.juntadeandalucia.es/agriculturaypesca/observatorio/servlet/FrontController?action=UltimosPrecios&posicion=2291332&producto=33000&subsector=33';

function decodeEntities(value = '') {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&aacute;', 'á')
    .replaceAll('&eacute;', 'é')
    .replaceAll('&iacute;', 'í')
    .replaceAll('&oacute;', 'ó')
    .replaceAll('&uacute;', 'ú')
    .replaceAll('&Aacute;', 'Á')
    .replaceAll('&Eacute;', 'É')
    .replaceAll('&Iacute;', 'Í')
    .replaceAll('&Oacute;', 'Ó')
    .replaceAll('&Uacute;', 'Ú');
}

function stripHtml(value = '') {
  return decodeEntities(value)
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseNumber(value) {
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRows(html) {
  return (html.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [])
    .map((row) => (row.match(/<t[dh]\b[^>]*>[\s\S]*?<\/t[dh]>/gi) ?? []).map(stripHtml))
    .filter((cells) => cells.length);
}

function extractSeries(rows, matcher) {
  const row = rows.find((cells) => cells.some((cell) => matcher.test(cell.toLocaleUpperCase('es'))));
  if (!row) return [];
  return row
    .flatMap((cell) => cell.match(/\d+[,.]\d+/g) ?? [])
    .map(parseNumber)
    .filter((value) => value != null)
    .slice(-8);
}

function extractPeriods(html) {
  const text = stripHtml(html);
  const matches = [...text.matchAll(/Semana\s+(\d+)\s*:\s*\(([^)]+)\)/gi)];
  return matches.slice(-8).map((match) => `Sem. ${match[1]} · ${match[2].replace(/\s+/g, ' ').trim()}`);
}

async function main() {
  const current = JSON.parse(await readFile(OUTPUT, 'utf8'));

  try {
    const response = await fetch(SOURCE_URL, {
      headers: {
        'user-agent': 'MaginaOlivoMarketBot/1.0 (+https://github.com/izc05/magina-olivo)',
        accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const rows = parseRows(html);
    const periods = extractPeriods(html);
    const aove = extractSeries(rows, /VIRGEN[- ]?EXTRA/);
    const lampante = extractSeries(rows, /LAMPANTE/);
    const virgen = extractSeries(rows, /^VIRGEN$/);

    if (periods.length < 2 || aove.length < 2 || virgen.length < 2 || lampante.length < 2) {
      throw new Error(`No se pudo interpretar la tabla: periodos=${periods.length}, AOVE=${aove.length}, virgen=${virgen.length}, lampante=${lampante.length}`);
    }

    const size = Math.min(8, periods.length, aove.length, virgen.length, lampante.length);
    const payload = {
      generatedAt: new Date().toISOString(),
      sourceLabel: 'Observatorio de Precios y Mercados · Junta de Andalucía',
      sourceUrl: SOURCE_URL,
      market: 'Almazara o Bodega · Andalucía',
      unit: '€/kg',
      provisional: false,
      collectorError: null,
      periods: periods.slice(-size),
      series: [
        { id: 'aove', label: 'Virgen Extra', shortLabel: 'AOVE', values: aove.slice(-size) },
        { id: 'virgen', label: 'Virgen', shortLabel: 'Virgen', values: virgen.slice(-size) },
        { id: 'lampante', label: 'Lampante (1 g)', shortLabel: 'Lampante', values: lampante.slice(-size) },
      ],
    };

    await writeFile(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`Mercado actualizado: ${payload.periods.at(-1)} · AOVE ${payload.series[0].values.at(-1)} €/kg · Virgen ${payload.series[1].values.at(-1)} €/kg · Lampante ${payload.series[2].values.at(-1)} €/kg.`);
  } catch (error) {
    const collectorError = error instanceof Error ? error.message : String(error);
    await writeFile(OUTPUT, `${JSON.stringify({ ...current, collectorError }, null, 2)}\n`);
    console.warn(`No se pudo actualizar Mercado. Se conserva el último feed válido: ${collectorError}`);
  }
}

await main();
