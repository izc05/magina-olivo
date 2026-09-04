import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const adminRoutes = await readFile(new URL('./admin-content-routes.ts', import.meta.url), 'utf8');
const announcementRoutes = await readFile(new URL('./announcement-routes.ts', import.meta.url), 'utf8');
const newsRoutes = await readFile(new URL('./public-news-routes.ts', import.meta.url), 'utf8');
const migration = await readFile(new URL('../../../db/migrations/0023_admin_content_alerts.sql', import.meta.url), 'utf8');

test('admin content routes are content-role protected and audited', () => {
  assert.match(adminRoutes, /requireAdminSessionRole/);
  assert.match(adminRoutes, /requireAdminSessionRole\(request, reply, 'content'\)/);
  assert.doesNotMatch(adminRoutes, /requirePlatformAdmin/);
  assert.match(adminRoutes, /recordAdminAudit/);
  assert.match(adminRoutes, /cache-control', 'private, no-store'/);
  assert.match(adminRoutes, /\/api\/v1\/admin\/content\/news/);
  assert.match(adminRoutes, /\/api\/v1\/admin\/alerts\/overview/);
  assert.match(adminRoutes, /\/api\/v1\/admin\/content\/announcements/);
  assert.match(adminRoutes, /contextual-rain-probability-not-official-warning/);
});

test('platform announcements cannot masquerade as official warnings', () => {
  assert.match(migration, /never official AEMET, RAIF or civil-protection alerts/);
  assert.match(announcementRoutes, /officialWarning: false/);
  assert.match(announcementRoutes, /first-party-platform-notices-not-official-emergency-alerts/);
  assert.match(announcementRoutes, /audience = 'all'/);
  assert.match(announcementRoutes, /cache-control', 'private, no-store'/);
});

test('news curation changes ordering only while preserving source metadata policy', () => {
  assert.match(newsRoutes, /order by featured desc, published_at desc/);
  assert.match(newsRoutes, /verified-metadata-only-no-article-copy/);
  assert.doesNotMatch(newsRoutes, /editorial_note/);
});
