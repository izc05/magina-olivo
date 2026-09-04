import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webDir = dirname(scriptDir);
const distDir = join(webDir, 'dist');
const indexPath = join(distDir, 'index.html');

const defaultSiteUrl = 'https://izc05.github.io/magina-olivo';
const siteUrl = (process.env.PUBLIC_SITE_URL || defaultSiteUrl).replace(/\/$/, '');
const site = new URL(`${siteUrl}/`);
const basePath = site.pathname.replace(/\/$/, '');

const privatePaths = [
  '/api/',
  '/cuenta',
  '/calendario',
  '/onboarding',
  '/register',
  '/reset-password',
];

const routes = [
  {
    path: '/',
    canonicalPath: '/',
    title: 'Mágina Olivo — tu olivar y la información clave de Sierra Mágina',
    description: 'Gestiona tu olivar y consulta información pública útil de Sierra Mágina: mercado del aceite, tiempo, alertas, noticias y cooperativas.',
    schemaType: 'SoftwareApplication',
    priority: '1.0',
    changefreq: 'weekly',
  },
  {
    path: '/magina',
    canonicalPath: '/magina',
    title: 'Sierra Mágina — información del olivar | Mágina Olivo',
    description: 'Consulta en un único lugar tiempo, alertas del campo, noticias, mercado del aceite y cooperativas de Sierra Mágina.',
    priority: '0.9',
    changefreq: 'daily',
  },
  {
    path: '/magina/mercado',
    canonicalPath: '/magina/mercado',
    title: 'Mercado y precio del aceite de oliva | Mágina Olivo',
    description: 'Consulta la evolución y contexto del mercado del aceite de oliva con fuente y frescura visibles.',
    priority: '0.9',
    changefreq: 'daily',
  },
  {
    path: '/precio-aceite-oliva-hoy',
    canonicalPath: '/magina/mercado',
    title: 'Precio del aceite de oliva hoy en Jaén | Mágina Olivo',
    description: 'Consulta el mercado del aceite de oliva y su evolución desde Mágina Olivo, con información pública, fuente y fecha de actualización.',
    priority: '0.8',
    changefreq: 'daily',
  },
  {
    path: '/precio-aove-jaen',
    canonicalPath: '/magina/mercado',
    title: 'Precio AOVE en Jaén | Mágina Olivo',
    description: 'Información pública del mercado del aceite de oliva virgen extra en Jaén, con contexto y control de frescura.',
    priority: '0.8',
    changefreq: 'daily',
  },
  {
    path: '/magina/tiempo',
    canonicalPath: '/magina/tiempo',
    title: 'Tiempo para el olivar en Sierra Mágina | Mágina Olivo',
    description: 'Previsión meteorológica útil para el olivar de Sierra Mágina, con datos públicos y procedencia visible.',
    priority: '0.9',
    changefreq: 'daily',
  },
  {
    path: '/tiempo-sierra-magina',
    canonicalPath: '/magina/tiempo',
    title: 'Tiempo en Sierra Mágina para el olivar | Mágina Olivo',
    description: 'Consulta lluvia, temperaturas y previsión meteorológica de Sierra Mágina orientada al uso diario del olivarero.',
    priority: '0.8',
    changefreq: 'daily',
  },
  {
    path: '/magina/campo',
    canonicalPath: '/magina/campo',
    title: 'Alertas e información de campo del olivar | Mágina Olivo',
    description: 'Información pública y alertas oficiales de interés para el olivar, mostrando siempre fuente, ámbito y fecha.',
    priority: '0.8',
    changefreq: 'daily',
  },
  {
    path: '/alertas-olivar-jaen',
    canonicalPath: '/magina/campo',
    title: 'Alertas del olivar en Jaén | Mágina Olivo',
    description: 'Consulta alertas e información oficial del olivar en Jaén con fuente y contexto visibles.',
    priority: '0.7',
    changefreq: 'daily',
  },
  {
    path: '/magina/noticias',
    canonicalPath: '/magina/noticias',
    title: 'Noticias del olivar y Sierra Mágina | Mágina Olivo',
    description: 'Selección de noticias y fuentes oficiales relacionadas con el olivar, el aceite y Sierra Mágina.',
    priority: '0.8',
    changefreq: 'daily',
  },
  {
    path: '/noticias-olivar-jaen',
    canonicalPath: '/magina/noticias',
    title: 'Noticias del olivar en Jaén | Mágina Olivo',
    description: 'Actualidad del olivar y el aceite en Jaén, resumida con enlaces a las fuentes originales.',
    priority: '0.7',
    changefreq: 'daily',
  },
  {
    path: '/magina/directorio',
    canonicalPath: '/magina/directorio',
    title: 'Cooperativas y almazaras de Sierra Mágina | Mágina Olivo',
    description: 'Directorio público y curado de cooperativas y almazaras de Sierra Mágina con procedencia y fecha de revisión.',
    priority: '0.8',
    changefreq: 'weekly',
  },
  {
    path: '/cooperativas-sierra-magina',
    canonicalPath: '/magina/directorio',
    title: 'Cooperativas de Sierra Mágina | Mágina Olivo',
    description: 'Encuentra cooperativas y almazaras de Sierra Mágina en el directorio público de Mágina Olivo.',
    priority: '0.7',
    changefreq: 'weekly',
  },
];

function absoluteUrl(path) {
  if (path === '/') return siteUrl;
  return `${siteUrl}${path}`;
}

function localHref(path) {
  if (path === '/') return `${basePath || ''}/`;
  return `${basePath}${path}`;
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function replaceMeta(html, name, content) {
  const escaped = escapeHtml(content);
  const expression = new RegExp(`<meta\\s+name=["']${name}["'][^>]*>`, 'i');
  if (expression.test(html)) {
    return html.replace(expression, `<meta name="${name}" content="${escaped}" />`);
  }
  return html.replace('</head>', `    <meta name="${name}" content="${escaped}" />\n  </head>`);
}

function replaceTitle(html, title) {
  const escaped = escapeHtml(title);
  return /<title>.*?<\/title>/is.test(html)
    ? html.replace(/<title>.*?<\/title>/is, `<title>${escaped}</title>`)
    : html.replace('</head>', `    <title>${escaped}</title>\n  </head>`);
}

function discoveryHead(route) {
  const canonical = absoluteUrl(route.canonicalPath);
  const pageUrl = absoluteUrl(route.path);
  const website = {
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: siteUrl,
    name: 'Mágina Olivo',
    inLanguage: 'es-ES',
  };
  const primary = route.schemaType === 'SoftwareApplication'
    ? {
        '@type': 'SoftwareApplication',
        '@id': `${siteUrl}/#app`,
        name: 'Mágina Olivo',
        url: siteUrl,
        description: route.description,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Any',
        inLanguage: 'es-ES',
        areaServed: 'Sierra Mágina, Jaén, España',
      }
    : {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: route.title,
        description: route.description,
        inLanguage: 'es-ES',
        isPartOf: { '@id': `${siteUrl}/#website` },
      };

  const jsonLd = JSON.stringify({ '@context': 'https://schema.org', '@graph': [website, primary] });
  const aliasBootstrap = route.path === route.canonicalPath
    ? null
    : `<script>window.history.replaceState(null, '', ${JSON.stringify(localHref(route.canonicalPath))});</script>`;

  return [
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />',
    '<meta property="og:locale" content="es_ES" />',
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Mágina Olivo" />',
    `<meta property="og:title" content="${escapeHtml(route.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(route.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    '<meta name="twitter:card" content="summary" />',
    `<meta name="twitter:title" content="${escapeHtml(route.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(route.description)}" />`,
    `<script type="application/ld+json">${jsonLd.replaceAll('</script>', '<\\/script>')}</script>`,
    aliasBootstrap,
  ].filter(Boolean).join('\n    ');
}

function crawlableFallback(route) {
  const canonicalHref = localHref(route.canonicalPath);
  const publicLinks = [
    ['/magina/mercado', 'Mercado del aceite'],
    ['/magina/tiempo', 'Tiempo'],
    ['/magina/campo', 'Campo y alertas'],
    ['/magina/noticias', 'Noticias'],
    ['/magina/directorio', 'Cooperativas y almazaras'],
  ];

  const links = publicLinks
    .map(([path, label]) => `<li><a href="${escapeHtml(localHref(path))}">${escapeHtml(label)}</a></li>`)
    .join('');

  const canonicalNote = route.path === route.canonicalPath
    ? ''
    : `<p><a href="${escapeHtml(canonicalHref)}">Abrir la sección principal en Mágina Olivo</a>.</p>`;

  return `<main data-discovery-fallback="true"><h1>${escapeHtml(route.title)}</h1><p>${escapeHtml(route.description)}</p>${canonicalNote}<nav aria-label="Información pública de Mágina Olivo"><ul>${links}</ul></nav></main>`;
}

async function renderRoute(baseHtml, route) {
  let html = replaceTitle(baseHtml, route.title);
  html = replaceMeta(html, 'description', route.description);
  html = html.replace('</head>', `    ${discoveryHead(route)}\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root">${crawlableFallback(route)}</div>`);

  const target = route.path === '/'
    ? indexPath
    : join(distDir, route.path.replace(/^\//, ''), 'index.html');

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html, 'utf8');
}

function sitemapXml() {
  const now = new Date().toISOString();
  const canonicalRoutes = routes.filter((route) => route.path === route.canonicalPath);
  const entries = canonicalRoutes.map((route) => `  <url>\n    <loc>${escapeHtml(absoluteUrl(route.path))}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

function robotsTxt() {
  const disallow = privatePaths.map((path) => `Disallow: ${basePath}${path}`).join('\n');
  return `User-agent: *\nAllow: ${basePath || '/'}\n${disallow}\n\nUser-agent: OAI-SearchBot\nAllow: ${basePath || '/'}\n${disallow}\n\nUser-agent: ChatGPT-User\nAllow: ${basePath || '/'}\n${disallow}\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
}

function llmsTxt() {
  return `# Mágina Olivo\n\nMágina Olivo es una web/PWA para el olivar, inicialmente centrada en Sierra Mágina y Jaén.\n\n## Información pública\n\n- Mercado del aceite: ${siteUrl}/magina/mercado\n- Tiempo: ${siteUrl}/magina/tiempo\n- Campo y alertas: ${siteUrl}/magina/campo\n- Noticias: ${siteUrl}/magina/noticias\n- Cooperativas y almazaras: ${siteUrl}/magina/directorio\n\n## Límites\n\nLos datos privados de usuarios, fincas, campañas y documentos no son contenido público ni deben ser indexados. Las páginas públicas muestran procedencia y frescura cuando corresponda.\n`;
}

const baseHtml = await readFile(indexPath, 'utf8');
for (const route of routes) {
  await renderRoute(baseHtml, route);
}

await writeFile(join(distDir, 'sitemap.xml'), sitemapXml(), 'utf8');
await writeFile(join(distDir, 'robots.txt'), robotsTxt(), 'utf8');
await writeFile(join(distDir, 'llms.txt'), llmsTxt(), 'utf8');

console.info(`Discovery assets generated for ${routes.length} public routes at ${siteUrl}.`);
