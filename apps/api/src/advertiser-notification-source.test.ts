import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(path: string): Promise<string> {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('advertiser notifications are membership-scoped and private', async () => {
  const routes = await read('./advertiser-notification-routes.ts');
  const app = await read('./app.ts');
  assert.match(app, /registerAdvertiserNotificationRoutes\(app\)/);
  assert.match(routes, /advertiser_portal_memberships/);
  assert.match(routes, /m\.user_id = \$2/);
  assert.match(routes, /n\.target_user_id is null or n\.target_user_id = \$2/);
  assert.match(routes, /private, no-store/);
  assert.doesNotMatch(routes, /holding_id|plot_id|delivery_id|storage_key/);
});

test('commercial email remains opt-in and disabled by default', async () => {
  const migration = await read('../../../db/migrations/0028_advertiser_notifications.sql');
  const routes = await read('./advertiser-notification-routes.ts');
  assert.match(migration, /email_enabled boolean not null default false/);
  assert.match(routes, /COMMERCIAL_MAIL_TRANSPORT \?\? 'disabled'/);
  assert.match(routes, /El correo comercial es opt-in/);
});

test('immediate review notifications are transactional and never official alerts', async () => {
  const migration = await read('../../../db/migrations/0028_advertiser_notifications.sql');
  assert.match(migration, /advertiser_application_approved_notification_trg/);
  assert.match(migration, /advertiser_profile_change_review_notification_trg/);
  assert.match(migration, /application_approved/);
  assert.match(migration, /profile_change_approved/);
  assert.match(migration, /profile_change_rejected/);
  assert.match(migration, /separate from agricultural, weather and official emergency alerts/i);
});
