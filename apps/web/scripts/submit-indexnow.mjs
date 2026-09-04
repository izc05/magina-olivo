const defaultSiteUrl = 'https://izc05.github.io/magina-olivo';
const siteUrl = (process.env.PUBLIC_SITE_URL || defaultSiteUrl).replace(/\/$/, '');
const key = process.env.INDEXNOW_KEY?.trim() ?? '';
const endpoint = process.env.INDEXNOW_ENDPOINT?.trim() || 'https://api.indexnow.org/indexnow';

if (!key) {
  throw new Error('INDEXNOW_KEY is required. Generate/configure the public IndexNow key before submitting URLs.');
}

if (!/^[A-Za-z0-9_-]{8,128}$/.test(key)) {
  throw new Error('INDEXNOW_KEY must contain 8–128 URL-safe alphanumeric, underscore or hyphen characters.');
}

const site = new URL(`${siteUrl}/`);
const canonicalPaths = [
  '/',
  '/magina',
  '/magina/mercado',
  '/magina/tiempo',
  '/magina/campo',
  '/magina/noticias',
  '/magina/directorio',
];

const requestedPaths = process.argv.slice(2);
const paths = requestedPaths.length > 0 ? requestedPaths : canonicalPaths;
const urlList = [...new Set(paths.map((path) => {
  if (/^https:\/\//i.test(path)) {
    const url = new URL(path);
    if (url.host !== site.host) throw new Error(`IndexNow URL must belong to ${site.host}: ${path}`);
    return url.toString();
  }

  if (!path.startsWith('/')) throw new Error(`IndexNow path must start with /: ${path}`);
  return `${siteUrl}${path === '/' ? '' : path}`;
}))];

const keyLocation = process.env.INDEXNOW_KEY_LOCATION?.trim() || `${siteUrl}/${key}.txt`;
const keyUrl = new URL(keyLocation);
if (keyUrl.host !== site.host) {
  throw new Error(`INDEXNOW_KEY_LOCATION must belong to ${site.host}.`);
}

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'user-agent': 'Magina-Olivo-IndexNow/1.0',
  },
  body: JSON.stringify({
    host: site.host,
    key,
    keyLocation,
    urlList,
  }),
});

if (!response.ok) {
  const body = await response.text().catch(() => '');
  throw new Error(`IndexNow submission failed with HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : ''}`);
}

console.info(`IndexNow accepted ${urlList.length} URL(s) for ${site.host}.`);
