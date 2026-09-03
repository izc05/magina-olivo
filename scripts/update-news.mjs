import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const OUTPUT = new URL('../public/data/news.json', import.meta.url);

const sources = [
  { name: 'D.O.P. Sierra Mágina', url: 'https://sierramagina.org/feed/', weight: 24, scope: 'magina', official: true },
  { name: 'CIT Jaén · Diputación', url: 'https://cit.dipujaen.es/feed/', weight: 18, scope: 'jaen', official: true },
  { name: 'Diario JAÉN', url: 'https://www.diariojaen.es/rss/provincia.xml', weight: 12, scope: 'jaen' },
  { name: 'Diario JAÉN', url: 'https://www.diariojaen.es/rss/jaen.xml', weight: 10, scope: 'jaen' },
  { name: 'Revista Almaceite', url: 'https://revistaalmaceite.com/feed/', weight: 9, scope: 'sector' },
  {
    name: 'Google News · Sierra Mágina',
    url: 'https://news.google.com/rss/search?q=%22Sierra+M%C3%A1gina%22&hl=es&gl=ES&ceid=ES%3Aes',
    weight: 20,
    scope: 'magina',
  },
  {
    name: 'Google News · Diputación de Jaén',
    url: 'https://news.google.com/rss/search?q=site%3Adipujaen.es+olivar+OR+aceite+OR+%22Sierra+M%C3%A1gina%22&hl=es&gl=ES&ceid=ES%3Aes',
    weight: 16,
    scope: 'jaen',
    official: true,
  },
  {
    name: 'Google News · Junta de Andalucía',
    url: 'https://news.google.com/rss/search?q=site%3Ajuntadeandalucia.es+olivar+OR+%22aceite+de+oliva%22+OR+agricultura+Ja%C3%A9n&hl=es&gl=ES&ceid=ES%3Aes',
    weight: 15,
    scope: 'andalucia',
    official: true,
  },
  {
    name: 'Google News · Olivar Jaén',
    url: 'https://news.google.com/rss/search?q=olivar+Ja%C3%A9n+OR+%22aceite+de+oliva%22+Ja%C3%A9n&hl=es&gl=ES&ceid=ES%3Aes',
    weight: 12,
    scope: 'jaen',
  },
  {
    name: 'Google News · Mercacei',
    url: 'https://news.google.com/rss/search?q=site%3Amercacei.com+olivar+OR+%22aceite+de+oliva%22&hl=es&gl=ES&ceid=ES%3Aes',
    weight: 8,
    scope: 'sector',
  },
];

const maginaTerms = [
  'sierra mágina', 'huelma', 'bedmar', 'bedmar y garcíez', 'jódar', 'cambil', 'mancha real',
  'torres', 'jimena', 'pegalajar', 'bélmez de la moraleda', 'belmez de la moraleda',
  'cabrá del santo cristo', 'cabra del santo cristo', 'campillo de arenas', 'la guardia de jaén',
  'carchelejo', 'cárcheles', 'carcheles', 'arbuniel', 'solera', 'albanchez de mágina',
  'gérgal', 'expohuelma', 'oro de cánava', 'oro magnasur', 'santuario de mágina',
];

const oliveTerms = [
  'olivar', 'oliva', 'aceite de oliva', 'aceite', 'aove', 'aceituna', 'almazara', 'cooperativa',
  'molturación', 'molturacion', 'cosecha', 'campaña', 'poda', 'riego', 'regadío', 'regadio',
  'fitosanitario', 'mosca del olivo', 'plaga', 'rendimiento', 'aforo', 'oleícola', 'oleicola',
];

const agricultureTerms = [
  'agricultura', 'agrario', 'campo', 'rural', 'pac', 'ayuda', 'subvención', 'subvencion',
  'mercado', 'precio', 'exportación', 'exportacion', 'importación', 'importacion', 'maquinaria',
  'digitalización', 'digitalizacion', 'tecnología', 'tecnologia', 'dron', 'sensor', 'suelo',
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

  const href = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1];
  return decodeEntities(href ?? '');
}

function cleanGoogleTitle(title, source) {
  if (!source || !title.endsWith(` - ${source}`)) return title;
  return title.slice(0, -(` - ${source}`.length)).trim();
}

function parseXml(xml, configuredSource) {
  const blocks = [
    ...(xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? []),
    ...(xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? []),
  ];

  return blocks.map((block) => {
    const sourceFromFeed = getTag(block, ['source']);
    const rawTitle = getTag(block, ['title']);
    const title = cleanGoogleTitle(rawTitle, sourceFromFeed);
    const description = getTag(block, ['description', 'summary', 'content:encoded', 'content']);
    const url = getLink(block);
    const dateText = getTag(block, ['pubDate', 'published', 'updated', 'dc:date']);
    const publishedAt = new Date(dateText || Date.now());

    return {
      title,
      excerpt: description.slice(0, 280),
      url,
      source: sourceFromFeed || configuredSource.name,
      publishedAt: Number.isNaN(publishedAt.getTime()) ? new Date().toISOString() : publishedAt.toISOString(),
      weight: configuredSource.weight,
      scope: configuredSource.scope,
      official: Boolean(configuredSource.official),
    };
  }).filter((item) => item.title && item.url);
}

function textFor(item) {
  return `${item.title} ${item.excerpt}`.toLocaleLowerCase('es');
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function scopeFor(item) {
  const text = textFor(item);
  if (includesAny(text, maginaTerms) || item.scope === 'magina') return 'Sierra Mágina';
  if (text.includes('jaén') || item.scope === 'jaen') return 'Jaén';
  if (item.scope === 'andalucia') return 'Andalucía';
  return 'Sector';
}

function relevance(item) {
  const text = textFor(item);
  const maginaMatches = maginaTerms.reduce((score, term) => score + (text.includes(term) ? 9 : 0), 0);
  const oliveMatches = oliveTerms.reduce((score, term) => score + (text.includes(term) ? 5 : 0), 0);
  const agricultureMatches = agricultureTerms.reduce((score, term) => score + (text.includes(term) ? 2 : 0), 0);
  const officialBonus = item.official ? 4 : 0;
  return maginaMatches + oliveMatches + agricultureMatches + officialBonus + item.weight;
}

function freshnessBonus(publishedAt) {
  const ageHours = Math.max(0, (Date.now() - new Date(publishedAt).getTime()) / 3_600_000);
  if (ageHours <= 12) return 24;
  if (ageHours <= 24) return 20;
  if (ageHours <= 72) return 14;
  if (ageHours <= 168) return 8;
  if (ageHours <= 336) return 4;
  return 0;
}

function categoryFor(item) {
  const text = textFor(item);
  if (includesAny(text, maginaTerms)) return 'Sierra Mágina';
  if (['precio', 'mercado', 'export', 'import', 'comercialización', 'comercializacion'].some((term) => text.includes(term))) return 'Mercado';
  if (['riego', 'digital', 'tecnolog', 'inteligencia artificial', 'sensor', 'dron'].some((term) => text.includes(term))) return 'Tecnología';
  if (['ayuda', 'pac', 'subvención', 'subvencion'].some((term) => text.includes(term))) return 'Ayudas';
  if (['cooperativa', 'almazara'].some((term) => text.includes(term))) return 'Cooperativas';
  if (includesAny(text, oliveTerms)) return 'Olivar';
  return 'Agricultura';
}

function normalizeTitle(title) {
  return title
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+-\s+[^-]{2,40}$/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function idFor(item) {
  return createHash('sha1').update(`${normalizeTitle(item.title)}|${item.url}`).digest('hex').slice(0, 14);
}

async function fetchSource(source) {
  const response = await fetch(source.url, {
    headers: {
      'user-agent': 'MaginaOlivoNewsBot/1.1 (+https://github.com/izc05/magina-olivo)',
      accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return parseXml(await response.text(), source);
}

async function main() {
  const results = await Promise.allSettled(sources.map(fetchSource));
  const items = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  const errors = results
    .map((result, index) => result.status === 'rejected' ? `${sources[index].name}: ${result.reason?.message ?? String(result.reason)}` : null)
    .filter(Boolean);

  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const deduped = new Map();

  for (const item of items) {
    if (new Date(item.publishedAt).getTime() < cutoff) continue;

    const text = textFor(item);
    const hasMagina = includesAny(text, maginaTerms) || item.scope === 'magina';
    const hasSector = includesAny(text, oliveTerms) || includesAny(text, agricultureTerms);
    if (!hasMagina && !hasSector) continue;

    const score = relevance(item);
    if (score < 15) continue;

    const ranked = { ...item, score, rankScore: score + freshnessBonus(item.publishedAt) };
    const key = normalizeTitle(item.title).slice(0, 96);
    const previous = deduped.get(key);
    if (!previous || ranked.rankScore > previous.rankScore) deduped.set(key, ranked);
  }

  const stories = [...deduped.values()]
    .sort((a, b) => b.rankScore - a.rankScore || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 36)
    .map((item) => ({
      id: idFor(item),
      category: categoryFor(item),
      scope: scopeFor(item),
      title: item.title,
      excerpt: item.excerpt || 'Abre la fuente original para consultar la información completa.',
      source: item.source,
      url: item.url,
      publishedAt: item.publishedAt,
      official: item.official,
    }));

  if (!stories.length) {
    const current = JSON.parse(await readFile(OUTPUT, 'utf8'));
    console.warn('No se obtuvieron noticias nuevas. Se conserva el feed anterior.', errors);
    await writeFile(OUTPUT, `${JSON.stringify({ ...current, collectorErrors: errors }, null, 2)}\n`);
    return;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceCount: sources.length,
    healthySourceCount: sources.length - errors.length,
    collectorErrors: errors,
    stories,
  };

  await writeFile(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Feed actualizado: ${stories.length} noticias; ${payload.healthySourceCount}/${sources.length} fuentes operativas.`);
  if (errors.length) console.warn(`Fuentes con error: ${errors.join(' | ')}`);
}

await main();
