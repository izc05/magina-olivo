import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('./advertiser-analytics-routes.ts', import.meta.url), 'utf8');

test('advertiser analytics require explicit portal membership', () => {
  assert.match(source, /advertiser_portal_memberships/);
  assert.match(source, /advertiser_id = \$1 and user_id = \$2 and status = 'active'/);
  assert.match(source, /ADVERTISER_ACCESS_REQUIRED/);
});

test('advertiser CSV export remains aggregate and identifier-free', () => {
  assert.match(source, /analytics\/export\.csv/);
  assert.match(source, /occurred_at::date::text as day, event_type, count\(\*\)::int as total/);
  assert.doesNotMatch(source, /select[^;]*(ip_address|session_id|visitor_id|holding_id|plot_id)/is);
  assert.match(source, /private, no-store/);
});

test('plan benchmark suppresses small cohorts', () => {
  assert.match(source, /minimumCohortSize: 3/);
  assert.match(source, /advertisers < 3/);
  assert.match(source, /suppressed: true/);
  assert.match(source, /nunca muestra resultados individuales/);
});

test('analytics only accept bounded reporting windows', () => {
  assert.match(source, /30 \| 90 \| 365/);
  assert.match(source, /enum: \['30', '90', '365'\]/);
});
