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

const privateUiPaths = [
  '/cuenta',
  '/calendario',
  '/onboarding',
  '/register',
  '/reset-password',
];

const crawlerBlockedPaths = [
  '/api/',
  '/health/',
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
    socialLabel: 'Tu olivar, en un único lugar',
  },
  {
    path: '/magina',
    canonicalPath: '/magina',
    title: 'Sierra Mágina — información del olivar | Mágina Olivo',
    description: 'Consulta en un único lugar tiempo, alertas del campo, noticias, mercado del aceite y cooperativas de Sierra Mágina.',
    priority: '0.9',
    changefreq: 'daily',
    socialLabel: 'Información pública para el olivar',
  },
  {
    path: '/magina/mercado',
    canonicalPath: '/magina/mercado',
    title: 'Mercado y precio del aceite de oliva | Mágina Olivo',
    description: 'Consulta la evolución y contexto del mercado del aceite de oliva con fuente y frescura visibles.',
    priority: '0.9',
    changefreq: 'daily',
    socialLabel: 'Mercado del aceite',
  },
  {
    path: '/precio-aceite-oliva-hoy',
    canonicalPath: '/magina/mercado',
    title: 'Precio del aceite de oliva hoy en Jaén | Mágina Olivo',
    description: 'Consulta el mercado del aceite de oliva y su evolución desde Mágina Olivo, con información pública, fuente y fecha de actualización.',
    priority: '0.8',
    changefreq: 'daily',
    socialLabel: 'Mercado del aceite',
  },
  {
    path: '/precio-aove-jaen',
    canonicalPath: '/magina/mercado',
    title: 'Precio AOVE en Jaén | Mágina Olivo',
    description: 'Información pública del mercado del aceite de oliva virgen extra en Jaén, con contexto y control de frescura.',
    priority: '0.8',
    changefreq: 'daily',
    socialLabel: 'Mercado del aceite',
  },
  {
    path: '/magina/tiempo',
    canonicalPath: '/magina/tiempo',
    title: 'Tiempo para el olivar en Sierra Mágina | Mágina Olivo',
    description: 'Previsión meteorológica útil para el olivar de Sierra Mágina, con datos públicos y procedencia visible.',
    priority: '0.9',
    changefreq: 'daily',
    socialLabel: 'Tiempo para el olivar',
  },
  {
    path: '/tiempo-sierra-magina',
    canonicalPath: '/magina/tiempo',
    title: 'Tiempo en Sierra Mágina para el olivar | Mágina Olivo',
    description: 'Consulta lluvia, temperaturas y previsión meteorológica de Sierra Mágina orientada al uso diario del olivarero.',
    priority: '0.8',
    changefreq: 'daily',
    socialLabel: 'Tiempo para el olivar',
  },
  {
    path: '/magina/campo',
    canonicalPath: '/magina/campo',
    title: 'Alertas e información de campo del olivar | Mágina Olivo',
    description: 'Información pública y alertas oficiales de interés para el olivar, mostrando siempre fuente, ámbito y fecha.',
    priority: '0.8',
    changefreq: 'daily',
    socialLabel: 'Campo y alertas',
  },
  {
    path: '/alertas-olivar-jaen',
    canonicalPath: '/magina/campo',
    title: 'Alertas del olivar en Jaén | Mágina Olivo',
    description: 'Consulta alertas e información oficial del olivar en Jaén con fuente y contexto visibles.',
    priority: '0.7',
    changefreq: 'daily',
    socialLabel: 'Campo y alertas',
  },
  {
    path: '/magina/noticias',
    canonicalPath: '/magina/noticias',
    title: 'Noticias del olivar y Sierra Mágina | Mágina Olivo',
    description: 'Selección de noticias y fuentes oficiales relacionadas con el olivar, el aceite y Sierra Mágina.',
    priority: '0.8',
    changefreq: 'daily',
    socialLabel: 'Noticias del olivar',
  },
  {
    path: '/noticias-olivar-jaen',
    canonicalPath: '/magina/noticias',
    title: 'Noticias del olivar en Jaén | Mágina Olivo',
    description: 'Actualidad del olivar y el aceite en Jaén, resumida con enlaces a las fuentes originales.',
    priority: '0.7',
    changefreq: 'daily',
    socialLabel: 'Noticias del olivar',
  },
  {
    path: '/magina/directorio',
    canonicalPath: '/magina/directorio',
    title: 'Cooperativas y almazaras de Sierra Mágina | Mágina Olivo',
    description: 'Directorio público y curado de cooperativas y almazaras de Sierra Mágina con procedencia y fecha de revisión.',
    priority: '0.8',
    changefreq: 'weekly',
    socialLabel: 'Cooperativas y almazaras',
  },
  {
    path: '/cooperativas-sierra-magina',
    canonicalPath: '/magina/directorio',
    title: 'Cooperativas de Sierra Mágina | Mágina Olivo',
    description: 'Encuentra cooperativas y almazaras de Sierra Mágina en el directorio público de Mágina Olivo.',
    priority: '0.7',
    changefreq: 'weekly',
    socialLabel: 'Cooperativas y almazaras',
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

function escapeXml(value) {
  return escapeHtml(value).replaceAll("'", '&apos;');
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

function socialSlug(canonicalPath) {
  if (canonicalPath === '/') return 'magina-olivo';
  return canonicalPath.replace(/^\//, '').replaceAll('/', '-');
}

function socialImageUrl(canonicalPath) {
  return `${siteUrl}/social/${socialSlug(canonicalPath)}.svg`;
}

function wrapText(value, maxChars = 34, maxLines = 3) {
  const words = value.replace(/\s+\|\s+Mágina Olivo$/i, '').split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    } else {
      current = candidate;
    }
  }

  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function socialCardSvg(route) {
  const titleLines = wrapText(route.title);
  const lineMarkup = titleLines
    .map((line, index) => `<text x="96" y="${270 + index * 70}" font-size="58" font-weight="700" fill="#f8f5e9">${escapeXml(line)}</text>`)
    .join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(route.title)}</title>
  <desc id="desc">${escapeXml(route.description)}</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#26331f"/>
      <stop offset="100%" stop-color="#53633d"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1050" cy="118" r="180" fill="#7c8f59" opacity="0.22"/>
  <circle cx="1110" cy="520" r="230" fill="#c6b66d" opacity="0.10"/>
  <rect x="78" y="68" width="300" height="54" rx="27" fill="#f4f1e6" opacity="0.96"/>
  <text x="104" y="104" font-size="26" font-weight="700" fill="#2e3a22" letter-spacing="2">MÁGINA OLIVO</text>
  <text x="96" y="190" font-size="30" font-weight="600" fill="#d9cf9a">${escapeXml(route.socialLabel ?? 'Sierra Mágina · Jaén')}</text>
  ${lineMarkup}
  <text x="96" y="554" font-size="26" fill="#e8e2c5">Sierra Mágina · Jaén · Información pública con fuente y frescura</text>
</svg>\n`;
}

function discoveryHead(route) {
  const canonical = absoluteUrl(route.canonicalPath);
  const pageUrl = absoluteUrl(route.path);
  const socialImage = socialImageUrl(route.canonicalPath);
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
    `<link rel="alternate" hreflang="es-ES" href="${escapeHtml(canonical)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${escapeHtml(canonical)}" />`,
    '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />',
    '<meta name="application-name" content="Mágina Olivo" />',
    '<meta name="apple-mobile-web-app-title" content="Mágina Olivo" />',
    '<meta property="og:locale" content="es_ES" />',
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Mágina Olivo" />',
    `<meta property="og:title" content="${escapeHtml(route.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(route.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta property="og:image" content="${escapeHtml(socialImage)}" />`,
    '<meta property="og:image:type" content="image/svg+xml" />',
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${escapeHtml(`${route.socialLabel ?? route.title} — Mágina Olivo`)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(route.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(route.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(socialImage)}" />`,
    `<meta name="twitter:image:alt" content="${escapeHtml(`${route.socialLabel ?? route.title} — Mágina Olivo`)}" />`,
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

async function renderPrivateRoute(baseHtml, path) {
  let html = replaceTitle(baseHtml, 'Mágina Olivo — acceso privado');
  html = replaceMeta(html, 'description', 'Área privada de Mágina Olivo. Esta ruta no forma parte de la información pública indexable.');
  html = replaceMeta(html, 'robots', 'noindex,nofollow,noarchive,nosnippet');
  html = html.replace(
    '</head>',
    '    <meta name="googlebot" content="noindex,nofollow,noarchive,nosnippet" />\n'
      + '    <meta name="bingbot" content="noindex,nofollow,noarchive,nosnippet" />\n'
      + '  </head>',
  );
  html = html.replace(
    '<div id="root"></div>',
    '<div id="root"><main data-private-noindex="true"><h1>Mágina Olivo</h1><p>Área privada de la aplicación.</p></main></div>',
  );

  const target = join(distDir, path.replace(/^\//, ''), 'index.html');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html, 'utf8');
}

async function writeSocialCards() {
  const socialDir = join(distDir, 'social');
  await mkdir(socialDir, { recursive: true });

  const canonicalRoutes = routes.filter((route) => route.path === route.canonicalPath);
  for (const route of canonicalRoutes) {
    await writeFile(join(socialDir, `${socialSlug(route.path)}.svg`), socialCardSvg(route), 'utf8');
  }
}

function sitemapXml() {
  const canonicalRoutes = routes.filter((route) => route.path === route.canonicalPath);
  const entries = canonicalRoutes
    .map((route) => `  <url>\n    <loc>${escapeHtml(absoluteUrl(route.path))}</loc>\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

function robotsTxt() {
  const disallow = crawlerBlockedPaths.map((path) => `Disallow: ${basePath}${path}`).join('\n');
  return `User-agent: *\nAllow: ${basePath || '/'}\n${disallow}\n\nUser-agent: OAI-SearchBot\nAllow: ${basePath || '/'}\n${disallow}\n\nUser-agent: ChatGPT-User\nAllow: ${basePath || '/'}\n${disallow}\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
}

function llmsTxt() {
  return `# Mágina Olivo\n\nMágina Olivo es una web/PWA para el olivar, inicialmente centrada en Sierra Mágina y Jaén.\n\n## Información pública\n\n- Mercado del aceite: ${siteUrl}/magina/mercado\n- Tiempo: ${siteUrl}/magina/tiempo\n- Campo y alertas: ${siteUrl}/magina/campo\n- Noticias: ${siteUrl}/magina/noticias\n- Cooperativas y almazaras: ${siteUrl}/magina/directorio\n\n## Límites\n\nLos datos privados de usuarios, fincas, campañas y documentos no son contenido público ni deben ser indexados. Las rutas privadas de interfaz publican noindex y las API permanecen fuera del rastreo.\n`;
}

const baseHtml = await readFile(indexPath, 'utf8');
for (const route of routes) {
  await renderRoute(baseHtml, route);
}

for (const path of privateUiPaths) {
  await renderPrivateRoute(baseHtml, path);
}

await writeSocialCards();
await writeFile(join(distDir, 'sitemap.xml'), sitemapXml(), 'utf8');
await writeFile(join(distDir, 'robots.txt'), robotsTxt(), 'utf8');
await writeFile(join(distDir, 'llms.txt'), llmsTxt(), 'utf8');

console.info(`Discovery assets generated for ${routes.length} public routes, ${privateUiPaths.length} private noindex routes and social cards at ${siteUrl}.`);
