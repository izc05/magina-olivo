import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { municipalAlertEligible, municipalCategory, municipalSeverity } from './municipal-alert-rules.mjs';

const OUTPUT = new URL('../public/data/alerts.json', import.meta.url);
const NEWS = new URL('../public/data/news.json', import.meta.url);

const sources = [
  {
    name: 'RAIF · Olivar',
    url: 'https://www.juntadeandalucia.es/agriculturapescaaguaydesarrollorural/raif/category/olivar/feed/',
    scope: 'Andalucía',
    weight: 24,
    official: true,
  },
  {
    name: 'RAIF · Junta de Andalucía',
    url: 'https://www.juntadeandalucia.es/agriculturapescaaguaydesarrollorural/raif/feed/',
    scope: 'Andalucía',
    weight: 20,
    official: true,
  },
  {
    name: 'D.O.P. Sierra Mágina',
    url: 'https://sierramagina.org/feed/',
    scope: 'Sierra Mágina',
    weight: 22,
    official: true,
  },
];

const oliveTerms = [
  'olivar', 'olivo', 'aceituna', 'aceite', 'aove', 'mosca del olivo', 'repilo', 'antracnosis',
  'aceituna jabonosa', 'prays', 'verticilosis', 'barrenillo', 'algodoncillo', 'abichado', 'euzophera',
];

const strictAlertTerms = [
  'recomend', 'prevención', 'prevencion', 'seguimiento', 'riesgo', 'plaga', 'aviso', 'alerta',
  'tratamiento', 'control', 'vigilancia', 'fitosanitario', 'envero', 'recolección', 'recoleccion',
  'mosca del olivo', 'repilo', 'antracnosis', 'aceituna jabonosa', 'verticilosis', 'prays', 'barrenillo',
  'xylella', 'recepción', 'recepcion', 'cierre', 'horario', 'turno',
];

function decodeEntities(value = '') {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripHtml(value = '') {
  return decodeEntities(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTag(block, names) {
  for (const name of names) {
    const escaped = name.replace(':', '\\:');
    const match = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'i'));
    if (match) return stripHtml(match[1]);
  }
  return '';
}

function getLink(block) {
  const textLink = getTag(block, ['link']);
  if (textLink.startsWith('http')) return textLink;
  return decodeEntities(block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1] ?? '');
}

function parseXml(xml, source) {
  const blocks = [
    ...(xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? []),
    ...(xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? []),
  ];

  return blocks.map((block) => {
    const title = getTag(block, ['title']);
    const excerpt = getTag(block, ['description', 'summary', 'content:encoded', 'content']).slice(0, 320);
    const url = getLink(block);
    const dateText = getTag(block, ['pubDate', 'published', 'updated', 'dc:date']);
    const date = new Date(dateText || Date.now());

    return {
      title,
      excerpt,
      url,
      publishedAt: Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(),
      source: source.name,
      scope: source.scope,
      weight: source.weight,
      official: source.official,
    };
  }).filter((item) => item.title && item.url);
}

function textFor(item) {
  return `${item.title} ${item.excerpt ?? item.summary ?? ''}`.toLocaleLowerCase('es');
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function severityFor(item) {
  const text = textFor(item);
  if (['medidas obligatorias', 'alerta', 'xylella', 'emergencia fitosanitaria'].some((term) => text.includes(term))) return 'critical';
  if (['riesgo', 'plaga', 'mosca del olivo', 'repilo', 'antracnosis', 'verticilosis', 'tratamiento'].some((term) => text.includes(term))) return 'warning';
  return 'info';
}

function categoryFor(item) {
  const text = textFor(item);
  if (['plaga', 'mosca del olivo', 'repilo', 'antracnosis', 'verticilosis', 'fitosanitario', 'tratamiento'].some((term) => text.includes(term))) return 'Sanidad vegetal';
  if (['recepción', 'recepcion', 'cierre', 'horario', 'turno'].some((term) => text.includes(term))) return 'Cooperativas';
  return 'Seguimiento de campo';
}

function freshnessScore(publishedAt) {
  const ageHours = Math.max(0, (Date.now() - new Date(publishedAt).getTime()) / 3_600_000);
  if (ageHours <= 24) return 30;
  if (ageHours <= 72) return 24;
  if (ageHours <= 168) return 18;
  if (ageHours <= 720) return 10;
  return 2;
}

function idFor(item) {
  return createHash('sha1').update(`${item.title}|${item.url}`).digest('hex').slice(0, 14);
}

function normalizeTitle(title) {
  return title
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function fetchSource(source) {
  const response = await fetch(source.url, {
    headers: {
      'user-agent': 'MaginaOlivoAlertsBot/1.3 (+https://github.com/izc05/magina-olivo)',
      accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return parseXml(await response.text(), source);
}

async function loadMunicipalAlerts() {
  try {
    const payload = JSON.parse(await readFile(NEWS, 'utf8'));
    const stories = Array.isArray(payload.stories) ? payload.stories : [];
    return stories
      .filter(municipalAlertEligible)
      .map((story) => ({
        title: story.title,
        excerpt: story.excerpt,
        url: story.url,
        publishedAt: story.publishedAt,
        source: story.source,
        scope: story.municipalityName ?? 'Sierra Mágina',
        weight: 34,
        official: true,
        municipalityId: story.municipalityId,
        municipalityName: story.municipalityName,
        municipal: true,
      }));
  } catch (error) {
    console.warn(`No se pudo reutilizar el feed municipal: ${error?.message ?? String(error)}`);
    return [];
  }
}

async function main() {
  const [results, municipalItems] = await Promise.all([
    Promise.allSettled(sources.map(fetchSource)),
    loadMunicipalAlerts(),
  ]);
  const errors = results
    .map((result, index) => result.status === 'rejected' ? `${sources[index].name}: ${result.reason?.message ?? String(result.reason)}` : null)
    .filter(Boolean);
  const items = [
    ...results.flatMap((result) => result.status === 'fulfilled' ? result.value : []),
    ...municipalItems,
  ];
  const cutoff = Date.now() - 120 * 24 * 60 * 60 * 1000;
  const deduped = new Map();

  for (const item of items) {
    if (new Date(item.publishedAt).getTime() < cutoff) continue;
    const text = textFor(item);
    if (!item.municipal) {
      if (!includesAny(text, oliveTerms)) continue;
      if (!includesAny(text, strictAlertTerms)) continue;
    }

    const score = item.weight + freshnessScore(item.publishedAt) + (item.scope === 'Sierra Mágina' || item.municipal ? 12 : 0);
    const ranked = { ...item, score };
    const key = normalizeTitle(item.title).slice(0, 96);
    const previous = deduped.get(key);
    if (!previous || ranked.score > previous.score) deduped.set(key, ranked);
  }

  const alerts = [...deduped.values()]
    .sort((a, b) => b.score - a.score || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 18)
    .map((item) => ({
      id: idFor(item),
      severity: item.municipal ? municipalSeverity(item) : severityFor(item),
      category: item.municipal ? municipalCategory(item) : categoryFor(item),
      scope: item.scope,
      title: item.title,
      summary: item.excerpt || 'Consulta la fuente oficial para ampliar la información.',
      source: item.source,
      url: item.url,
      publishedAt: item.publishedAt,
      official: item.official,
      ...(item.municipalityId ? {
        municipalityId: item.municipalityId,
        municipalityName: item.municipalityName,
      } : {}),
    }));

  if (!alerts.length) {
    const current = JSON.parse(await readFile(OUTPUT, 'utf8'));
    await writeFile(OUTPUT, `${JSON.stringify({ ...current, collectorErrors: errors }, null, 2)}\n`);
    console.warn('No se obtuvieron alertas nuevas. Se conserva el feed anterior.');
    if (errors.length) console.warn(`Fuentes con error: ${errors.join(' | ')}`);
    return;
  }

  const municipalAlertCount = alerts.filter((alert) => alert.municipalityId).length;
  const payload = {
    generatedAt: new Date().toISOString(),
    sourceCount: sources.length,
    healthySourceCount: sources.length - errors.length,
    municipalAlertCount,
    municipalNewsUpstream: true,
    collectorErrors: errors,
    alerts,
  };

  await writeFile(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Alertas actualizadas: ${alerts.length}; ${payload.healthySourceCount}/${sources.length} fuentes operativas.`);
  console.log(`Alertas municipales seleccionadas: ${municipalAlertCount}.`);
  if (errors.length) console.warn(`Fuentes con error: ${errors.join(' | ')}`);
}

await main();
