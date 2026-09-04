import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routes = await readFile(new URL('./advertising-funnel-routes.ts', import.meta.url), 'utf8');
const destinationRoutes = await readFile(new URL('./public-destination-routes.ts', import.meta.url), 'utf8');
const app = await readFile(new URL('./app.ts', import.meta.url), 'utf8');
const migration = await readFile(new URL('../../../db/migrations/0026_advertising_funnel.sql', import.meta.url), 'utf8');

test('public advertising funnel accepts bounded consented applications without auto activation', () => {
  assert.match(routes, /\/api\/v1\/public\/advertising\/applications/);
  assert.match(routes, /ADVERTISING_CONSENT_REQUIRED/);
  assert.match(routes, /privacy_consent_at/);
  assert.match(routes, /status = 'approved'/);
  assert.match(routes, /values \(\$1, \$2, \$3, 'draft'/);
  assert.match(routes, /publicActivation: false/);
  assert.match(routes, /newDirectoryEntriesStartHiddenAsStale: true/);
  assert.match(routes, /verification_status, entity_type/);
  assert.match(routes, /'stale'/);
});

test('funnel pricing never invents a price and contracts require an explicit amount', () => {
  assert.match(routes, /pricing\.amount_cents/);
  assert.match(routes, /amountCents: row\.amount_cents/);
  assert.match(routes, /INCOMPLETE_COMMERCIAL_CONTRACT/);
  assert.match(routes, /body\.agreedAmountCents === undefined/);
  assert.doesNotMatch(routes, /amount_cents\s*\?\?\s*[1-9]/);
});

test('advertising metrics stay privacy-preserving and validate active sponsorships', () => {
  assert.match(routes, /\/api\/v1\/public\/advertising\/events/);
  assert.match(routes, /s\.status = 'active'/);
  assert.match(routes, /s\.plan_code in \('featured', 'premium'\)/);
  assert.match(routes, /client_event_id/);
  assert.match(migration, /not a user, device, session, holding or plot identifier/);
  assert.doesNotMatch(migration, /ip_address|user_agent|holding_id|plot_id|latitude|longitude/i);
  assert.doesNotMatch(routes, /request\.ip|user-agent|holdingId|plotId/);
});

test('directory exposes only opaque campaign ids needed for sponsored metrics and funnel routes are registered', () => {
  assert.match(destinationRoutes, /tracking:/);
  assert.match(destinationRoutes, /advertiserId: row\.advertiser_id/);
  assert.match(destinationRoutes, /sponsorshipId: row\.sponsorship_id/);
  assert.match(app, /registerAdvertisingFunnelRoutes/);
});
