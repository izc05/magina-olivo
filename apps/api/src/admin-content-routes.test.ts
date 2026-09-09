import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('admin news visibility remains role-gated, metadata-only and audited', async () => {
  const routes = await readFile(new URL('./admin-routes.ts', import.meta.url), 'utf8');

  assert.match(routes, /\/api\/v1\/admin\/news/);
  assert.match(routes, /canManagePublicContent\(access\.role\)/);
  assert.match(routes, /INVALID_NEWS_VISIBILITY/);
  assert.match(routes, /update public_news_items set active = \$2/);
  assert.match(routes, /PUBLIC_NEWS_NOT_FOUND/);
  assert.match(routes, /admin\.news\.visibility\.updated/);
  assert.match(routes, /targetType: 'public_news_item'/);
  assert.doesNotMatch(routes, /update public_news_items set title/);
  assert.doesNotMatch(routes, /update public_news_items set source_url/);
});
