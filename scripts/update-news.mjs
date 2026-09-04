import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { municipalNewsSources } from './municipal-news-sources.mjs';

const OUTPUT = new URL('../public/data/news.json', import.meta.url);

const baseSources = [
  { name: 'D.O.P. Sierra Mágina', url: 'https://sierramagina.org/feed/', weight: 24, scope: 'magina', official: true },
  { name: 'La Quinta Esencia · Oficial', url: 'https://laquintaesencia.com/feed/', weight: 28, scope: 'magina', official: true, cooperativeId: 'cristo-misericordia-jodar' },
  {
    name: 'Oro de Cánava · Oficial',
    url: 'https://news.google.com/rss/search?q=site%3Aorodecanava.com+%22Oro+de+C%C3%A1nava%22&hl=es&gl=ES&ceid=ES%3Aes',
    weight: 24,
    scope: 'magina',
    official: true,
    cooperativeId: 'remedios-jimena',
  },
  { name: 'Cooperativa San Francisco · Oficial', url: 'https://www.aovesierramagina.com/feed/', weight: 28, scope: 'magina', official: true, cooperativeId: 'san-francisco-albanchez' },
  { name: 'La Perla de Mágina · Oficial', url: 'https://laperlademagina.es/feed/', weight: 26, scope: 'magina', official: true, cooperativeId: 'paz-belmez' },
  { name: 'Santa Isabel de Torres · Oficial', url: 'https://santaisabeldetorres.com/feed/', weight: 26, scope: 'magina', official: true, cooperativeId: 'santa-isabel-torres' },
  { name: 'Salud Sierra · Oficial', url: 'https://saludsierra.es/feed/', weight: 26, scope: 'magina', official: true, cooperativeId: 'union-santo-cristo-cabra' },
  { name: 'Cooperativa Campillo de Arenas · Oficial', url: 'https://cooperativacampillodearenas.com/feed/', weight: 26, scope: 'magina', official: true, cooperativeId: 'cabeza-campillo' },
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

const sources = [...municipalNewsSources, ...baseSources];

const maginaTerms = [
  'sierra mágina', 'huelma', 'bedmar', 'bedmar y garcíez', 'jódar', 'cambil', 'mancha real',
  'torres', 'jimena', 'pegalajar', 'bélmez de la moraleda', 'belmez de la moraleda',
  'cabra del santo cristo', 'campillo de arenas', 'la guardia de jaén', 'carchelejo',
  'cárcheles', 'carcheles', 'arbuniel', 'solera', 'albanchez de mágina', 'albanchez de magina',
  'larva', 'noalejo', 'expohuelma', 'oro de cánava', 'oro magnasur', 'santuario de mágina',
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
  'camino', 'caminos', 'agua', 'abastecimiento', 'bando', 'incendio', 'empleo',
];

const monthNames = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre';
const municipalArchiveTitlePatterns = [
  new RegExp(`^\\d{1,2}\\s+de\\s+(?:${monthNames})\\s+de\\s+20\\d{2}$`, 'i'),
  new RegExp(`^(?:${monthNames})\\s+\\d{1,2},\\s+20\\d{2}$`, 'i'),
  /\bpor\s+comunicaci[oó]n\b.*\bnoticias\b/i,
  /^(?:noticias|actualidad)$/i,
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
      source: configuredSource.municipalityId ? configuredSource.name : (sourceFromFeed || configuredSource.name),
      publishedAt: Number.isNaN(publishedAt.getTime()) ? new Date().toISOString() : publishedAt.toISOString(),
      weight: configuredSource.weight,
      scope: configuredSource.scope,
      official: Boolean(configuredSource.official),
      cooperativeId: configuredSource.cooperativeId,
      municipalityId: configuredSource.municipalityId,
      municipalityName: configuredSource.municipalityName,
    };
  }).filter((item) => item.title && item.url);
}

function textFor(item) {
  return `${item.title} ${item.excerpt} ${item.municipalityName ?? ''}`.toLocaleLowerCase('es');
}

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function countTerms(text, terms) {
  return terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
}

function municipalTitleIsUseful(item) {
  if (!item.municipalityId) return true;
  const title = item.title.trim();
  return !municipalArchiveTitlePatterns.some((pattern) => pattern.test(title));
}

function freshnessBonus(publishedAt) {
  const ageMs = Math.max(0, Date.now() - new Date(publishedAt).getTime());
  const hours = ageMs / 3_600_000;
  if (hours <= 12) return 24;
  if (hours <= 24) return 20;
  if (hours <= 72) return 14;
  if (hours <= 168) return 8;
  if (hours <= 336) return 4;
  return 0;
}

function scopeFor(item, text) {
  if (item.municipalityId || item.scope === 'magina' || includesAny(text, maginaTerms)) return 'Sierra Mágina';
  if (item.scope === 'jaen') return 'Jaén';
  if (item.scope === 'andalucia') return 'Andalucía';
  return 'Sector';
}

function categoryFor(item, text, scope) {
  if (item.municipalityId) return 'Ayuntamientos';
  if (scope === 'Sierra Mágina' && includesAny(text, maginaTerms)) return 'Sierra Mágina';
  if (includesAny(text, ['precio', 'mercado', 'exportación', 'exportacion', 'importación', 'importacion'])) return 'Mercado';
  if (includesAny(text, ['tecnología', 'tecnologia', 'dron', 'sensor', 'digitalización', 'digitalizacion', 'inteligencia artificial'])) return 'Tecnología';
  if (includesAny(text, ['pac', 'ayuda', 'subvención', 'subvencion'])) return 'Ayudas';
  if (includesAny(text, ['cooperativa', 'almazara'])) return 'Cooperativas';
  if (includesAny(text, oliveTerms)) return 'Olivar';
  return 'Agricultura';
}

function relevanceFor(item) {
  const text = textFor(item);
  const maginaCount = countTerms(text, maginaTerms);
  const oliveCount = countTerms(text, oliveTerms);
  const agricultureCount = countTerms(text, agricultureTerms);
  const municipalBonus = item.municipalityId ? 14 : 0;
  const relevance = item.weight + municipalBonus + maginaCount * 9 + oliveCount * 5 + agricultureCount * 2 + (item.official ? 4 : 0);
  return { text, relevance, maginaCount, sectorCount: oliveCount + agricultureCount };
}

function storyId(item) {
  return createHash('sha1').update(`${item.url}|${item.title}`).digest('hex').slice(0, 14);
}

function normalizeTitle(title) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'MaginaOlivoNewsBot/1.2 (+https://github.com/izc05/magina-olivo)' },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function main() {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const all = [];
  const errors = [];
  let healthySourceCount = 0;
  let healthyMunicipalSourceCount = 0;

  for (const source of sources) {
    try {
      const xml = await fetchText(source.url);
      const items = parseXml(xml, source);
      all.push(...items);
      healthySourceCount += 1;
      if (source.municipalityId) healthyMunicipalSourceCount += 1;
    } catch (error) {
      errors.push(`${source.name}: ${error?.message ?? String(error)}`);
    }
  }

  const ranked = all
    .filter((item) => new Date(item.publishedAt).getTime() >= cutoff)
    .filter(municipalTitleIsUseful)
    .map((item) => {
      const { text, relevance, maginaCount, sectorCount } = relevanceFor(item);
      return {
        item,
        text,
        relevance,
        rankScore: relevance + freshnessBonus(item.publishedAt),
        maginaCount,
        sectorCount,
      };
    })
    .filter(({ item, relevance, maginaCount, sectorCount }) => (
      relevance >= 15 && (Boolean(item.municipalityId) || maginaCount > 0 || sectorCount > 0)
    ))
    .sort((a, b) => b.rankScore - a.rankScore || new Date(b.item.publishedAt) - new Date(a.item.publishedAt));

  const seenTitles = new Set();
  const seenUrls = new Set();
  const stories = [];

  for (const { item, text } of ranked) {
    const titleKey = normalizeTitle(item.title);
    if (!titleKey || seenTitles.has(titleKey) || seenUrls.has(item.url)) continue;
    seenTitles.add(titleKey);
    seenUrls.add(item.url);
    const scope = scopeFor(item, text);
    stories.push({
      id: storyId(item),
      category: categoryFor(item, text, scope),
      scope,
      title: item.title,
      excerpt: item.excerpt,
      source: item.source,
      url: item.url,
      publishedAt: item.publishedAt,
      official: item.official,
      ...(item.cooperativeId ? { cooperativeId: item.cooperativeId } : {}),
      ...(item.municipalityId ? {
        municipalityId: item.municipalityId,
        municipalityName: item.municipalityName,
      } : {}),
    });
    if (stories.length >= 42) break;
  }

  if (!stories.length) {
    const current = JSON.parse(await readFile(OUTPUT, 'utf8'));
    console.warn('No se han recuperado noticias válidas. Se conserva el feed anterior.');
    console.log(`Feed conservado: ${current.stories?.length ?? 0} noticias.`);
    return;
  }

  const municipalStoryCount = stories.filter((story) => story.municipalityId).length;
  const payload = {
    generatedAt: new Date().toISOString(),
    sourceCount: sources.length,
    healthySourceCount,
    municipalSourceCount: municipalNewsSources.length,
    healthyMunicipalSourceCount,
    municipalStoryCount,
    collectorErrors: errors,
    stories,
  };

  await writeFile(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Feed actualizado: ${stories.length} noticias; ${healthySourceCount}/${sources.length} fuentes operativas.`);
  console.log(`Ayuntamientos: ${municipalStoryCount} noticias · ${healthyMunicipalSourceCount}/${municipalNewsSources.length} fuentes municipales operativas.`);
  if (errors.length) console.warn(`Fuentes con error: ${errors.join(' | ')}`);
}

await main();
