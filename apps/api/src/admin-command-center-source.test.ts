import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routeSource = await readFile(new URL('./admin-command-center-routes.ts', import.meta.url), 'utf8');
const appSource = await readFile(new URL('./app.ts', import.meta.url), 'utf8');

test('command center route is global-admin protected private and registered', () => {
  assert.match(routeSource, /requirePlatformAdmin/);
  assert.match(routeSource, /cache-control', 'private, no-store'/);
  assert.match(routeSource, /\/api\/v1\/admin\/command-center/);
  assert.match(appSource, /registerAdminCommandCenterRoutes/);
});

test('command center aggregates operational counts without exposing private farm records', () => {
  assert.match(routeSource, /support_tickets/);
  assert.match(routeSource, /advertiser_applications/);
  assert.match(routeSource, /platform_announcements/);
  assert.match(routeSource, /public_data_sources/);
  assert.match(routeSource, /legal_documents/);
  assert.match(routeSource, /system_operational_evidence/);
  assert.match(routeSource, /weather_alert_events/);
  assert.match(routeSource, /platform_admin_audit_log/);
  assert.doesNotMatch(routeSource, /select\s+.*(?:boundary|latitude|longitude|document_object_key|requester_email)/is);
});

test('system attention is evidence-only and does not introduce browser restore execution', () => {
  assert.match(routeSource, /system_evidence_pending/);
  assert.match(routeSource, /system_evidence_failed/);
  assert.doesNotMatch(routeSource, /restore.*(?:exec|spawn|command)|staging-restore\.sh/is);
});
