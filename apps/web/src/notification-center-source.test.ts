import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('notification center is an authenticated-facing standalone route with direct account access', async () => {
  const main = await read('./main.tsx');
  const entry = await read('./RegistrationEntry.tsx');
  const account = await read('./AccountPage.tsx');

  assert.match(main, /path === '\/notificaciones'/);
  assert.match(main, /<NotificationCenterPage \/>/);
  assert.match(entry, /href="\/notificaciones"/);
  assert.match(account, /href="\/notificaciones"/);
});

test('notification center aggregates only real implemented sources', async () => {
  const center = await read('./NotificationCenterPage.tsx');

  assert.match(center, /\/api\/v1\/account\/preferences/);
  assert.match(center, /\/api\/v1\/holdings/);
  assert.match(center, /\/tasks\?status=all/);
  assert.match(center, /\/api\/v1\/account\/rain-alerts/);
  assert.match(center, /\/api\/v1\/public\/field-alerts/);
  assert.match(center, /\/api\/v1\/campaigns\/\$\{campaign\.id\}\/summary/);
  assert.match(center, /rewardApi\.myRedemptions/);
  assert.match(center, /buildRewardRedemptionNotifications/);
  assert.match(center, /\/recompensas#mis-canjes/);
  assert.match(center, /\/calendario/);
  assert.match(center, /\/magina\/campo/);
  assert.match(center, /no se generan alertas de precio todavía/i);
});

test('notification preferences are persisted without becoming marketing consent', async () => {
  const account = await read('./AccountPage.tsx');
  const route = await read('../../api/src/account-preference-routes.ts');
  const migration = await read('../../../db/migrations/0045_notification_preferences.sql');

  for (const key of ['notifyFieldAlerts', 'notifyRewards', 'notifyMarket', 'notifyNews']) {
    assert.match(account, new RegExp(key));
    assert.match(route, new RegExp(key));
  }

  assert.match(migration, /notify_field_alerts boolean not null default true/);
  assert.match(migration, /notify_rewards boolean not null default true/);
  assert.match(migration, /notify_market boolean not null default false/);
  assert.match(migration, /notify_news boolean not null default true/);
  assert.match(account, /no equivalen a consentimiento publicitario/i);
  assert.match(account, /no comparten los datos de tus parcelas/i);
});

test('V1 prepares push semantics but never requests browser push permission', async () => {
  const center = await read('./NotificationCenterPage.tsx');
  const account = await read('./AccountPage.tsx');
  const combined = `${center}\n${account}`;

  assert.match(center, /push todavía no está activado/i);
  assert.doesNotMatch(combined, /Notification\.requestPermission/);
  assert.doesNotMatch(combined, /PushManager\.subscribe/);
  assert.doesNotMatch(combined, /serviceWorker\.pushManager\.subscribe/);
});
