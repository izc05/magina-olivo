const LANDING_URL = 'https://www.mapa.gob.es/es/agricultura/temas/producciones-agricolas/aceite-oliva-y-aceituna-mesa/evolucion_precios_ao_vegetales';

function decodeEntities(value = '') {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&aacute;', 'á')
    .replaceAll('&eacute;', 'é')
    .replaceAll('&iacute;', 'í')
    .replaceAll('&oacute;', 'ó')
    .replaceAll('&uacute;', 'ú')
    .replaceAll('&ntilde;', 'ñ')
    .replaceAll('&Aacute;', 'Á')
    .replaceAll('&Eacute;', 'É')
    .replaceAll('&Iacute;', 'Í')
    .replaceAll('&Oacute;', 'Ó')
    .replaceAll('&Uacute;', 'Ú')
    .replaceAll('&Ntilde;', 'Ñ');
}

function stripHtml(value = '') {
  return decodeEntities(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseMapaOliveBulletins(html, baseUrl = LANDING_URL) {
  const anchors = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const bulletins = [];

  for (const match of anchors) {
    const href = decodeEntities(match[1]);
    const label = stripHtml(match[2]);
    if (!/bolet[ií]n\s+semanal\s+precios\s+aceite\s+de\s+oliva/i.test(label)) continue;

    const weekYear = label.match(/\b(\d{1,2})\s+(20\d{2})\b/);
    if (!weekYear) continue;

    const url = new URL(href, baseUrl);
    if (!url.hostname.endsWith('mapa.gob.es')) continue;
    if (!/\.pdf(?:$|[?#])/i.test(url.href)) continue;

    bulletins.push({
      week: Number(weekYear[1]),
      year: Number(weekYear[2]),
      label,
      url: url.href,
    });
  }

  return bulletins.sort((left, right) => (right.year - left.year) || (right.week - left.week));
}

export function latestMapaOliveBulletin(html, baseUrl = LANDING_URL) {
  return parseMapaOliveBulletins(html, baseUrl)[0] ?? null;
}

async function assertPdfReachable(url) {
  const common = {
    headers: {
      'user-agent': 'MaginaOlivoMarketBot/1.0 (+https://github.com/izc05/magina-olivo)',
      accept: 'application/pdf,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(15_000),
    redirect: 'follow',
  };

  let response = await fetch(url, { ...common, method: 'HEAD' });
  if (!response.ok || !/application\/pdf/i.test(response.headers.get('content-type') ?? '')) {
    response = await fetch(url, {
      ...common,
      method: 'GET',
      headers: { ...common.headers, range: 'bytes=0-1023' },
    });
  }

  if (!response.ok) throw new Error(`MAPA bulletin unavailable: HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType && !/application\/pdf|application\/octet-stream/i.test(contentType)) {
    throw new Error(`MAPA bulletin returned unexpected content-type: ${contentType}`);
  }
}

export async function discoverLatestMapaOliveBulletin() {
  const response = await fetch(LANDING_URL, {
    headers: {
      'user-agent': 'MaginaOlivoMarketBot/1.0 (+https://github.com/izc05/magina-olivo)',
      accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`MAPA landing unavailable: HTTP ${response.status}`);

  const html = await response.text();
  const bulletin = latestMapaOliveBulletin(html, response.url || LANDING_URL);
  if (!bulletin) throw new Error('No se encontró un boletín semanal de aceite de oliva de MAPA.');

  await assertPdfReachable(bulletin.url);
  return {
    ...bulletin,
    landingUrl: LANDING_URL,
    discoveredAt: new Date().toISOString(),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const bulletin = await discoverLatestMapaOliveBulletin();
    console.log(JSON.stringify(bulletin, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
