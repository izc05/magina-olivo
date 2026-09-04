import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('advertiser portal uses explicit memberships rather than contact-email auto claims', async () => {
  const migration = await read('../../../db/migrations/0027_advertiser_portal.sql');
  const routes = await read('./advertiser-portal-routes.ts');

  assert.match(migration, /advertiser_portal_memberships/);
  assert.match(migration, /primary key \(advertiser_id, user_id\)/);
  assert.match(migration, /Contact email alone never grants portal access/);
  assert.match(routes, /where advertiser_id = \$1[\s\S]*user_id = \$2[\s\S]*status = 'active'/);
  assert.match(routes, /PORTAL_USER_NOT_FOUND/);
  assert.doesNotMatch(routes, /contact_email\s*=\s*session\.user\.email/i);
});

test('advertiser dashboard is authenticated isolated and excludes agricultural private tables', async () => {
  const routes = await read('./advertiser-portal-routes.ts');
  const app = await read('./app.ts');

  assert.match(routes, /\/api\/v1\/advertiser\/access/);
  assert.match(routes, /\/api\/v1\/advertiser\/dashboard/);
  assert.match(routes, /requireAdvertiserMembership/);
  assert.match(routes, /private, no-store/);
  assert.match(routes, /Métricas agregadas sin IP, usuario, sesión, explotación, parcela ni coordenadas precisas/);
  assert.doesNotMatch(routes, /from holdings|join holdings|from farms|join farms|from plots|join plots|from deliveries|join deliveries|from documents|join documents/i);
  assert.match(app, /registerAdvertiserPortalRoutes\(app\)/);
});

test('profile edits require owner or editor and admin review before publication', async () => {
  const migration = await read('../../../db/migrations/0027_advertiser_portal.sql');
  const routes = await read('./advertiser-portal-routes.ts');

  assert.match(migration, /status text not null default 'pending'/);
  assert.match(migration, /one_pending_uq/);
  assert.match(routes, /access\.role === 'viewer'/);
  assert.match(routes, /ADVERTISER_EDIT_REQUIRED/);
  assert.match(routes, /advertiser-profile-changes\/:changeId\/review/);
  assert.match(routes, /request\.body\.status === 'approved'/);
  assert.match(routes, /update advertiser_profiles/);
  assert.match(routes, /advertiser\.profile_change\.\$\{request\.body\.status\}/);
});

test('commercial role grants and revokes portal access without creating admin roles', async () => {
  const routes = await read('./advertiser-portal-routes.ts');

  assert.match(routes, /requireAdminSessionRole\(request, reply, 'commercial'\)/);
  assert.match(routes, /advertiser\.portal_access\.grant/);
  assert.match(routes, /advertiser\.portal_access\.revoke/);
  assert.match(routes, /status = 'revoked'/);
  assert.doesNotMatch(routes, /insert into platform_admin_memberships/i);
});
