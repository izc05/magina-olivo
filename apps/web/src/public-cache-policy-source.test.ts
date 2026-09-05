import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('PWA runtime cache is scoped to explicitly public Mágina API paths', async () => {
  const config = await read('../vite.config.ts');

  assert.match(config, /urlPattern:\s*\/\\\/api\\\/v1\\\/public\\\//);
  assert.match(config, /cacheName:\s*'magina-public-api-v1'/);
  assert.match(config, /handler:\s*'NetworkFirst'/);
  assert.doesNotMatch(config, /urlPattern:.*holdings/);
  assert.doesNotMatch(config, /urlPattern:.*campaigns/);
  assert.doesNotMatch(config, /urlPattern:.*deliveries/);
  assert.doesNotMatch(config, /urlPattern:.*documents/);
});

test('server keeps private API no-store while permitting cache for public reads', async () => {
  const security = await read('../../api/src/request-security.ts');

  assert.match(security, /isPublicReadApiPath/);
  assert.match(security, /public, max-age=300, stale-while-revalidate=86400/);
  assert.match(security, /cache-control', 'no-store'/);
  assert.match(security, /request\.method === 'GET' && isPublicReadApiPath/);
});

test('staging cache-controlled web entries retain required security headers', async () => {
  const nginx = await read('../../../infra/docker/nginx.staging.conf');
  const requiredHeaders = [
    'add_header Cache-Control "no-cache, no-store, must-revalidate" always;',
    'add_header X-Content-Type-Options "nosniff" always;',
    'add_header X-Frame-Options "DENY" always;',
    'add_header Referrer-Policy "no-referrer" always;',
    'add_header Strict-Transport-Security "max-age=31536000" always;',
  ];

  for (const path of ['index.html', 'sw.js']) {
    const escapedPath = path.replace('.', '\\.');
    const block = nginx.match(new RegExp(`location = /${escapedPath} \\{([\\s\\S]*?)\\n  \\}`))?.[1];
    assert.ok(block, `missing staging location for /${path}`);
    for (const header of requiredHeaders) assert.ok(block.includes(header), `/${path} is missing ${header}`);
  }
});
