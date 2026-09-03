import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const OUTPUT = new URL('../public/data/news.json', import.meta.url);

const sources = [
  { name: 'Diario JAÉN', url: 'https://www.diariojaen.es/rss/provincia.xml', kind: 'rss', weight: 10 },
  { name: 'Diario JAÉN', url: 'https://www.diariojaen.es/rss/jaen.xml', kind: 'rss', weight: 8 },
  { name: 'Revista Almaceite', url: 'https://revistaalmaceite.com/feed/', kind: 'rss', weight: 9 },
  {
    name: 'Google News · Sierra Mágina',
    url: 'https://news.google.com/rss/search?q=%22Sierra+M%C3%A1gina%22&hl=es&gl=ES&ceid=ES%3Aes',
    kind: 'rss',
    weight: 10,
  },
  {
    name: 'Google News · Olivar Jaén',
    url: 'https://news.google.com/rss/search?q=olivar+Ja%C3%A9n+OR+%22aceite+de+oliva%22+Ja%C3%A9n&hl=es&gl=ES&ceid=ES%3Aes',
    kind: 'rss',
    weight: 9,
  },
];

const strongTerms = [
  'olivar', 'oliva', 'aceite', 'aove', 'almazara', 'cooperativa', 'agricultura', 'agrario',
  'sierra mágina', 'huelma', 'bedmar', 'jódar', 'cambil', 'mancha real', 'torres', 'jimena',
  'pegalajar', 'belmez de la moraleda', 'cabritas', 'solera', 'campillo de arenas', 'la guardia de jaén',
  'pac', 'riego', 'regadío', 'poda', 'cosecha', 'campaña', 'aceituna', 'fitosanitario', 'plaga',
];

const weakTerms = ['jaén', 'campo', 'rural', 'agro', 'ayuda', 'mercado', 'precio'];

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

function parseXml(xml, configuredSource, weight) {
  const blocks = [
    ...(xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? []),
    ...(xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? []),
  ];

  return blocks.map((block) => {
    const title = getTag(block, ['title']);
    const description = getTag(block, ['description', 'summary', 'content:encoded', 'content']);
    const url = getLink(block);
    const dateText = getTag(block, ['pubDate', 'published', 'updated', 'dc:date']);
    const sourceFromFeed = getTag(block, ['source']);
    const publishedAt = new Date(dateText || Date.now());

    return {
      title,
      excerpt: description.slice(0, 260),
      url,
      source: sourceFromFeed || configuredSource,
      publishedAt: Number.isNaN(publishedAt.getTime()) ? new Date().toISOString() : publishedAt.toISOString(),
      weight,
    };
  }).filter((item) => item.title && item.url);
}

function relevance(item) {
  const text = `${item.title} ${item.excerpt}`.toLocaleLowerCase('es');
  const strong = strongTerms.reduce((score, term) => score + (text.includes(term) ? 3 : 0), 0);
  const weak = weakTerms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
  return strong + weak + item.weight;
}

function categoryFor(item) {
  const text = `${item.title} ${item.excerpt}`.toLocaleLowerCase('es');
  if (text.includes('sierra mágina') || ['huelma', 'bedmar', 'cambil', 'jimena', 'pegalajar'].some((term) => text.includes(term))) return 'Sierra Mágina';
  if (['precio', 'mercado', 'export', 'import', 'venta'].some((term) => text.includes(term))) return 'Mercado';
  if (['riego', 'digital', 'tecnolog', 'inteligencia artificial', 'sensor'].some((term) => text.includes(term))) return 'Tecnología';
  if (['ayuda', 'pac', 'subvención'].some((term) => text.includes(term))) return 'Ayudas';
  if (['cooperativa', 'almazara'].some((term) => text.includes(term))) return 'Cooperativas';
  return 'Agricultura';
}

function normalizeTitle(title) {
  return title
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function idFor(item) {
  return createHash('sha1').update(`${normalizeTitle(item.title)}|${item.url}`).digest('hex').slice(0, 14);
}

async function fetchSource(source) {
  const response = await fetch(source.url, {
    headers: {
      'user-agent': 'MaginaOlivoNewsBot/1.0 (+https://github.com/izc05/magina-olivo)',
      accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error(`${source.name}: HTTP ${response.status}`);
  return parseXml(await response.text(), source.name, source.weight);
}

async function main() {
  const results = await Promise.allSettled(sources.map(fetchSource));
  const items = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  const errors = results.filter((result) => result.status === 'rejected').map((result) => result.reason?.message ?? String(result.reason));

  const cutoff = Date.now() - 21 * 24 * 60 * 60 * 1000;
  const deduped = new Map();

  for (const item of items) {
    if (new Date(item.publishedAt).getTime() < cutoff) continue;
    const score = relevance(item);
    if (score < 11) continue;

    const key = normalizeTitle(item.title).slice(0, 90);
    const previous = deduped.get(key);
    if (!previous || score > previous.score) deduped.set(key, { ...item, score });
  }

  const stories = [...deduped.values()]
    .sort((a, b) => {
      const freshness = new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      if (Math.abs(freshness) > 12 * 60 * 60 * 1000) return freshness;
      return b.score - a.score;
    })
    .slice(0, 30)
    .map((item) => ({
      id: idFor(item),
      category: categoryFor(item),
      title: item.title,
      excerpt: item.excerpt || 'Abre la fuente original para consultar la información completa.',
      source: item.source,
      url: item.url,
      publishedAt: item.publishedAt,
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
    collectorErrors: errors,
    stories,
  };

  await writeFile(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Feed actualizado: ${stories.length} noticias; ${errors.length} fuentes con error.`);
}

await main();
