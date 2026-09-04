import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webDir = dirname(scriptDir);
const distDir = join(webDir, 'dist');
const defaultSiteUrl = 'https://izc05.github.io/magina-olivo';
const siteUrl = (process.env.PUBLIC_SITE_URL || defaultSiteUrl).replace(/\/$/, '');

const sectionContext = {
  '/magina': [
    'Información pública para olivareros de Sierra Mágina y Jaén.',
    'Acceso unificado a mercado del aceite, tiempo, alertas del campo, noticias y cooperativas.',
    'Las fuentes y la frescura de los datos se muestran cuando corresponde.',
  ],
  '/magina/mercado': [
    'Contexto público del mercado del aceite de oliva, incluido AOVE, aceite virgen y lampante cuando la fuente disponible los diferencia.',
    'La información de mercado se mantiene separada de las liquidaciones y rendimientos privados de cada usuario.',
    'La procedencia y la fecha de actualización deben ser visibles antes de usar un dato para tomar decisiones.',
  ],
  '/magina/tiempo': [
    'Previsión meteorológica municipal orientada al trabajo diario del olivar.',
    'La referencia principal es AEMET cuando el servicio está disponible, mostrando procedencia y frescura.',
    'La previsión puede ayudar a planificar tareas, pero no sustituye avisos oficiales ni criterio profesional.',
  ],
  '/magina/campo': [
    'Alertas e información fitosanitaria de interés para el olivar con fuente, fecha y ámbito visibles.',
    'La información regional de RAIF se presenta como contexto y nunca como diagnóstico automático de una parcela concreta.',
    'Los avisos públicos permanecen separados de los datos privados de fincas y tratamientos.',
  ],
  '/magina/noticias': [
    'Actualidad del olivar, aceite de oliva y Sierra Mágina mediante resúmenes propios y enlaces a la fuente original.',
    'Mágina Olivo no replica artículos completos: conserva metadatos, contexto y enlace oficial.',
    'Las noticias deben mostrar fecha y procedencia para facilitar la verificación.',
  ],
  '/magina/directorio': [
    'Directorio público de cooperativas y almazaras de Sierra Mágina y su entorno.',
    'Las fichas priorizan datos verificables, procedencia y fecha de revisión.',
    'El objetivo es facilitar que el olivarero encuentre la entidad y llegue a su canal oficial.',
  ],
};

const sectionNames = {
  '/magina': 'Sierra Mágina',
  '/magina/mercado': 'Mercado del aceite',
  '/magina/tiempo': 'Tiempo para el olivar',
  '/magina/campo': 'Campo y alertas',
  '/magina/noticias': 'Noticias del olivar',
  '/magina/directorio': 'Cooperativas y almazaras',
};

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function findIndexFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await findIndexFiles(target));
    if (entry.isFile() && entry.name === 'index.html') files.push(target);
  }
  return files;
}

function readCanonical(html) {
  const match = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["'][^>]*>/i);
  return match?.[1] ?? null;
}

function canonicalPathFromUrl(canonicalUrl) {
  if (!canonicalUrl) return null;
  if (canonicalUrl === siteUrl || canonicalUrl === `${siteUrl}/`) return '/';
  if (!canonicalUrl.startsWith(`${siteUrl}/`)) return null;
  return canonicalUrl.slice(siteUrl.length) || '/';
}

function breadcrumbFor(canonicalPath) {
  if (!canonicalPath || canonicalPath === '/') return null;

  const items = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Mágina Olivo',
      item: siteUrl,
    },
  ];

  if (canonicalPath !== '/magina') {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: 'Sierra Mágina',
      item: `${siteUrl}/magina`,
    });
  }

  items.push({
    '@type': 'ListItem',
    position: items.length + 1,
    name: sectionNames[canonicalPath] || 'Información pública',
    item: `${siteUrl}${canonicalPath}`,
  });

  return {
    '@type': 'BreadcrumbList',
    '@id': `${siteUrl}${canonicalPath}#breadcrumb`,
    itemListElement: items,
  };
}

function enrichJsonLd(html, canonicalPath) {
  const expression = /<script type="application\/ld\+json">(.*?)<\/script>/s;
  const match = html.match(expression);
  if (!match) return html;

  let parsed;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    return html;
  }

  const graph = Array.isArray(parsed?.['@graph']) ? parsed['@graph'] : [];
  const organizationId = `${siteUrl}/#organization`;
  const organization = {
    '@type': 'Organization',
    '@id': organizationId,
    name: 'Mágina Olivo',
    url: siteUrl,
    logo: `${siteUrl}/brand/magina-olivo-mark.svg`,
    description: 'Servicio digital para gestionar el olivar y consultar información pública útil de Sierra Mágina y Jaén.',
    areaServed: {
      '@type': 'Place',
      name: 'Sierra Mágina, Jaén, Andalucía, España',
    },
  };

  const website = graph.find((node) => node?.['@type'] === 'WebSite');
  if (website) website.publisher = { '@id': organizationId };

  const app = graph.find((node) => node?.['@type'] === 'SoftwareApplication');
  if (app) {
    app.publisher = { '@id': organizationId };
    app.isAccessibleForFree = true;
    app.offers = {
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'EUR',
    };
    app.audience = {
      '@type': 'PeopleAudience',
      audienceType: 'Olivareros y profesionales del olivar',
    };
    app.featureList = [
      'Gestión de fincas, parcelas y campañas',
      'Mercado público del aceite de oliva',
      'Tiempo para el olivar',
      'Alertas e información de campo',
      'Noticias, cooperativas y almazaras de Sierra Mágina',
    ];
  }

  const webpage = graph.find((node) => node?.['@type'] === 'WebPage');
  if (webpage) {
    webpage.publisher = { '@id': organizationId };
    webpage.spatialCoverage = {
      '@type': 'Place',
      name: 'Sierra Mágina, Jaén, Andalucía, España',
    };
  }

  if (!graph.some((node) => node?.['@id'] === organizationId)) graph.push(organization);
  const breadcrumb = breadcrumbFor(canonicalPath);
  if (breadcrumb && !graph.some((node) => node?.['@id'] === breadcrumb['@id'])) graph.push(breadcrumb);

  parsed['@graph'] = graph;
  const replacement = `<script type="application/ld+json">${JSON.stringify(parsed).replaceAll('</script>', '<\\/script>')}</script>`;
  return html.replace(expression, replacement);
}

function enrichFallback(html, canonicalPath) {
  const items = sectionContext[canonicalPath];
  if (!items || html.includes('data-discovery-context="true"')) return html;

  const section = `<section data-discovery-context="true"><h2>Qué encontrarás aquí</h2><ul>${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('')}</ul></section>`;

  return html.replace(
    /(<main\s+data-discovery-fallback="true"[^>]*>.*?)(<nav\s+aria-label="Información pública de Mágina Olivo">)/s,
    `$1${section}$2`,
  );
}

const files = await findIndexFiles(distDir);
let enriched = 0;

for (const file of files) {
  let html = await readFile(file, 'utf8');
  const canonicalUrl = readCanonical(html);
  const canonicalPath = canonicalPathFromUrl(canonicalUrl);
  if (!canonicalPath) continue;

  html = enrichJsonLd(html, canonicalPath);
  html = enrichFallback(html, canonicalPath);
  await writeFile(file, html, 'utf8');
  enriched += 1;
}

console.info(`Discovery semantics enriched for ${enriched} public HTML documents at ${siteUrl}.`);
