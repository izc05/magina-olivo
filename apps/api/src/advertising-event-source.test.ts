import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('advertising events are disabled with advertising and accept no user or precise-location fields', async () => {
  const routes = await read('./advertising-event-routes.ts');
  const app = await read('./app.ts');
  const eventBody = routes.match(/type AdvertisingEventBody = \{([\s\S]*?)\n\};/)?.[1] ?? '';

  assert.match(app, /registerAdvertisingEventRoutes/);
  assert.match(routes, /MAGINA_ADVERTISING_ENABLED/);
  assert.match(routes, /\/api\/v1\/public\/advertising\/events/);
  assert.ok(eventBody.length > 0, 'AdvertisingEventBody contract must be discoverable');
  assert.match(eventBody, /destinationId/);
  assert.match(eventBody, /contextMunicipality/);
  assert.doesNotMatch(eventBody, /user|holding|plot|latitude|longitude|coordinates|ip/i);
  assert.match(routes, /additionalProperties: false/);
});

test('advertising events require an active eligible sponsorship and persist aggregate campaign fields only', async () => {
  const routes = await read('./advertising-event-routes.ts');

  assert.match(routes, /s\.status = 'active'/);
  assert.match(routes, /s\.plan_code in \('featured', 'premium'\)/);
  assert.match(routes, /sponsorship_municipalities/);
  assert.match(routes, /lower\(sm_scope\.municipality\) = lower/);
  assert.match(routes, /insert into advertising_events/);
  assert.match(routes, /advertiser_id, sponsorship_id, event_type, municipality, placement/);
  assert.match(routes, /impression/);
  assert.match(routes, /phone_click/);
  assert.match(routes, /whatsapp_click/);
  assert.match(routes, /website_click/);
});
