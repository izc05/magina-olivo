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
