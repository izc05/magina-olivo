import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webDir = dirname(scriptDir);
const distDir = join(webDir, 'dist');

const publicCanonicalPaths = [
  '/',
  '/magina',
  '/magina/mercado',
  '/magina/tiempo',
  '/magina/campo',
  '/magina/noticias',
  '/magina/directorio',
];

const privateUiPaths = [
  '/cuenta',
  '/calendario',
  '/onboarding',
  '/register',
  '/reset-password',
];

const aliasPaths = [
  '/precio-aceite-oliva-hoy',
  '/precio-aove-jaen',
  '/tiempo-sierra-magina',
  '/alertas-olivar-jaen',
  '/noticias-olivar-jaen',
  '/cooperativas-sierra-magina',
];

function fail(message) {
  throw new Error(`Discovery verification failed: ${message}`);
}

function requireIncludes(value, expected, label) {
  if (!value.includes(expected)) fail(`${label} is missing ${expected}`);
}

function pageFile(path) {
  return path === '/'
    ? join(distDir, 'index.html')
    : join(distDir, path.replace(/^\//, ''), 'index.html');
}

function socialSlug(path) {
  if (path === '/') return 'magina-olivo';
  return path.replace(/^\//, '').replaceAll('/', '-');
}

for (const path of publicCanonicalPaths) {
  const html = await readFile(pageFile(path), 'utf8');
  requireIncludes(html, 'rel="canonical"', `public page ${path}`);
  requireIncludes(html, 'content="index,follow,max-image-preview:large', `public page ${path}`);
  requireIncludes(html, 'property="og:image"', `public page ${path}`);
  requireIncludes(html, 'name="twitter:card" content="summary_large_image"', `public page ${path}`);
  requireIncludes(html, 'hreflang="es-ES"', `public page ${path}`);
  requireIncludes(html, 'hreflang="x-default"', `public page ${path}`);
  requireIncludes(html, 'data-discovery-fallback="true"', `public page ${path}`);
  requireIncludes(html, 'application/ld+json', `public page ${path}`);

  const social = await readFile(join(distDir, 'social', `${socialSlug(path)}.svg`), 'utf8');
  requireIncludes(social, '<svg', `social card ${path}`);
  requireIncludes(social, 'width="1200"', `social card ${path}`);
  requireIncludes(social, 'height="630"', `social card ${path}`);
  requireIncludes(social, 'MÁGINA OLIVO', `social card ${path}`);
}

for (const path of privateUiPaths) {
  const html = await readFile(pageFile(path), 'utf8');
  requireIncludes(html, 'content="noindex,nofollow,noarchive,nosnippet"', `private page ${path}`);
  requireIncludes(html, 'data-private-noindex="true"', `private page ${path}`);
  if (html.includes('rel="canonical"')) fail(`private page ${path} must not publish a canonical public URL`);
  if (html.includes('property="og:image"')) fail(`private page ${path} must not publish a social preview`);
}

const robots = await readFile(join(distDir, 'robots.txt'), 'utf8');
requireIncludes(robots, 'User-agent: OAI-SearchBot', 'robots.txt');
requireIncludes(robots, 'User-agent: ChatGPT-User', 'robots.txt');
requireIncludes(robots, 'Disallow: /api/', 'robots.txt');
requireIncludes(robots, 'Disallow: /health/', 'robots.txt');
for (const path of privateUiPaths) {
  if (robots.includes(`Disallow: ${path}`)) fail(`robots.txt must allow ${path} so crawlers can read noindex`);
}

const sitemap = await readFile(join(distDir, 'sitemap.xml'), 'utf8');
for (const path of aliasPaths) {
  if (sitemap.includes(path)) fail(`sitemap.xml must not include alias ${path}`);
}
for (const path of privateUiPaths) {
  if (sitemap.includes(path)) fail(`sitemap.xml must not include private route ${path}`);
}
if (sitemap.includes('<lastmod>')) fail('sitemap.xml must not fake lastmod values on every build');

const llms = await readFile(join(distDir, 'llms.txt'), 'utf8');
requireIncludes(llms, 'Mercado del aceite', 'llms.txt');
requireIncludes(llms, 'Los datos privados', 'llms.txt');

console.info('Discovery build verification passed: public metadata, social cards, private noindex, robots and sitemap are coherent.');
