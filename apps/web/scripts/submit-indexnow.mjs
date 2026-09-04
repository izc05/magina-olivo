const defaultSiteUrl = 'https://izc05.github.io/magina-olivo';
const siteUrl = (process.env.PUBLIC_SITE_URL || defaultSiteUrl).replace(/\/$/, '');
const key = process.env.INDEXNOW_KEY?.trim() ?? '';
const endpoint = process.env.INDEXNOW_ENDPOINT?.trim() || 'https://api.indexnow.org/indexnow';
const dryRun = process.env.INDEXNOW_DRY_RUN === '1';

if (!key) {
  throw new Error('INDEXNOW_KEY is required. Generate/configure the public IndexNow key before submitting URLs.');
}

if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) {
  throw new Error('INDEXNOW_KEY must contain 8–128 letters, numbers or hyphen characters.');
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

function canonicalUrl(path) {
  return new URL(`${siteUrl}${path === '/' ? '/' : path}`).toString();
}

const canonicalUrlByPath = new Map(canonicalPaths.map((path) => [path, canonicalUrl(path)]));
const allowedUrls = new Set(canonicalUrlByPath.values());
const requestedPaths = process.argv.slice(2);
const paths = requestedPaths.length > 0 ? requestedPaths : canonicalPaths;

const urlList = [...new Set(paths.map((value) => {
  if (/^https:\/\//i.test(value)) {
    const normalized = new URL(value).toString();
    if (!allowedUrls.has(normalized)) {
      throw new Error(`IndexNow URL is not an approved canonical public URL: ${value}`);
    }
    return normalized;
  }

  if (!canonicalUrlByPath.has(value)) {
    throw new Error(`IndexNow path is not an approved canonical public route: ${value}`);
  }
  return canonicalUrlByPath.get(value);
}))];

const keyLocation = process.env.INDEXNOW_KEY_LOCATION?.trim() || `${siteUrl}/${key}.txt`;
const keyUrl = new URL(keyLocation);
if (keyUrl.host !== site.host) {
  throw new Error(`INDEXNOW_KEY_LOCATION must belong to ${site.host}.`);
}

const requiredScopePrefix = keyUrl.pathname.slice(0, keyUrl.pathname.lastIndexOf('/') + 1);
for (const value of urlList) {
  const url = new URL(value);
  if (url.host !== site.host || !url.pathname.startsWith(requiredScopePrefix)) {
    throw new Error(`IndexNow key location ${keyUrl.pathname} does not cover ${url.pathname}.`);
  }
}

const payload = {
  host: site.host,
  key,
  keyLocation,
  urlList,
};

if (dryRun) {
  console.info(JSON.stringify(payload));
  process.exit(0);
}

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'user-agent': 'Magina-Olivo-IndexNow/1.0',
  },
  body: JSON.stringify(payload),
});

if (!response.ok) {
  const body = await response.text().catch(() => '');
  throw new Error(`IndexNow submission failed with HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : ''}`);
}

console.info(`IndexNow accepted ${urlList.length} URL(s) for ${site.host}.`);
