import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const reportSource = readFileSync(
  new URL('../scripts/growth-weekly-report.ts', import.meta.url),
  'utf8',
);
const packageSource = readFileSync(new URL('../package.json', import.meta.url), 'utf8');

test('weekly growth report is internal and aggregates public discovery data', () => {
  assert.match(reportSource, /public_growth_daily/);
  assert.match(reportSource, /sum\(event_count\)/);
  assert.match(reportSource, /event = 'public_page_view'/);
  assert.match(reportSource, /utm_medium = 'share'/);
  assert.match(reportSource, /Europe\/Madrid/);
  assert.doesNotMatch(reportSource, /app\.(get|post|put|patch|delete)\(/);
});

test('weekly growth report never outputs public visitor identifiers', () => {
  assert.match(reportSource, /joinsAnonymousGrowthToUsers: false/);
  assert.match(reportSource, /visitorLevelHistory: false/);
  assert.match(reportSource, /outputContainsUserIds: false/);
  assert.doesNotMatch(reportSource, /select\s+email|select\s+name|ip_address|user_agent|device_id|visitor_id|session_id/i);
});

test('product activation is computed from the authenticated product system only', () => {
  assert.match(reportSource, /from "user"/);
  assert.match(reportSource, /from holding_members/);
  assert.match(reportSource, /join holdings/);
  assert.match(reportSource, /from farms/);
  assert.match(reportSource, /from plots/);
  assert.match(reportSource, /from campaigns/);
  assert.match(reportSource, /registrationToActivationRate/);
  assert.match(reportSource, /activationWithin7Days/);
});

test('D7 and D30 stay unavailable until a reliable activity heartbeat exists', () => {
  assert.match(reportSource, /d7: null/);
  assert.match(reportSource, /d30: null/);
  assert.match(reportSource, /pending_activity_heartbeat/);
  assert.doesNotMatch(reportSource, /from "session"|join "session"/i);
});

test('weekly report validates Better Auth and Growth schema before running', () => {
  assert.match(reportSource, /information_schema\.columns/);
  assert.match(reportSource, /user\.createdAt/);
  assert.match(reportSource, /public_growth_daily\.event_count/);
  assert.match(reportSource, /Growth weekly report schema mismatch/);
});

test('package exposes the explicit growth weekly command', () => {
  assert.match(packageSource, /"growth:weekly"/);
  assert.match(packageSource, /scripts\/growth-weekly-report\.ts/);
});
