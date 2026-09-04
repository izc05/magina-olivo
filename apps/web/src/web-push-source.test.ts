import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('Web Push permission is user initiated and scoped to the notification center', async () => {
  const main = await read('./main.tsx');
  const prompt = await read('./PushNotificationPrompt.tsx');
  const client = await read('./push-notifications.ts');
  const account = await read('./AccountPage.tsx');
  const center = await read('./NotificationCenterPage.tsx');

  assert.match(main, /path === '\/notificaciones'/);
  assert.match(main, /<PushNotificationPrompt \/>/);
  assert.match(prompt, /onClick=\{\(\) => void enable\(\)\}/);
  assert.match(client, /export async function enablePushNotifications/);
  assert.equal((client.match(/Notification\.requestPermission\(\)/g) ?? []).length, 1);
  assert.match(client, /window\.isSecureContext/);
  assert.doesNotMatch(main, /Notification\.requestPermission/);
  assert.doesNotMatch(prompt, /Notification\.requestPermission/);
  assert.doesNotMatch(account, /Notification\.requestPermission/);
  assert.doesNotMatch(center, /Notification\.requestPermission/);

  const enableStart = client.indexOf('export async function enablePushNotifications');
  const permissionIndex = client.indexOf('Notification.requestPermission()', enableStart);
  const configIndex = client.indexOf('const config = await getConfig();', enableStart);
  assert.ok(enableStart >= 0 && permissionIndex > enableStart);
  assert.ok(configIndex > permissionIndex, 'permission request must happen before network awaits to preserve the click gesture');
});

test('Web Push V1 uses an empty payload and keeps agricultural data out of push infrastructure', async () => {
  const client = await read('./push-notifications.ts');
  const worker = await read('../../worker/src/web-push-empty.ts');
  const serviceWorker = await read('../public/push-sw.js');
  const migration = await read('../../../db/migrations/0046_web_push_subscriptions.sql');

  assert.match(client, /endpoint: subscription\.endpoint/);
  assert.match(client, /expirationTime: subscription\.expirationTime/);
  assert.doesNotMatch(client, /toJSON\(\)/);
  assert.doesNotMatch(migration, /\bp256dh\s+(text|bytea|varchar)/i);
  assert.doesNotMatch(migration, /\bauth_key\s+(text|bytea|varchar)/i);
  assert.doesNotMatch(serviceWorker, /event\.data/);
  assert.match(serviceWorker, /Tienes un aviso nuevo/);
  assert.match(worker, /method: 'POST'/);
  assert.doesNotMatch(worker, /body:/);
});

test('push capability URLs are guarded and VAPID private material never enters VITE variables', async () => {
  const routes = await read('../../api/src/push-subscription-routes.ts');
  const app = await read('../../api/src/app.ts');
  const env = await read('../../../.env.example');

  assert.match(app, /registerPushSubscriptionRoutes\(app\)/);
  assert.match(routes, /isAllowedPushEndpoint/);
  assert.match(routes, /url\.protocol !== 'https:'/);
  assert.match(routes, /WEB_PUSH_ALLOWED_HOST_SUFFIXES/);
  assert.match(routes, /WEB_PUSH_VAPID_PUBLIC_KEY/);
  assert.match(routes, /where push_subscriptions\.user_id = excluded\.user_id/);
  assert.match(routes, /PUSH_SUBSCRIPTION_CONFLICT/);
  assert.doesNotMatch(routes, /WEB_PUSH_VAPID_PRIVATE_KEY/);
  assert.match(env, /WEB_PUSH_VAPID_PRIVATE_KEY=/);
  assert.doesNotMatch(env, /VITE_WEB_PUSH_VAPID_PRIVATE_KEY/);
});

test('rain push is emitted only for the first detection of a forecast alert', async () => {
  const rainScan = await read('../../worker/src/rain-alert-scan.ts');

  assert.match(rainScan, /returning first_detected_at = last_detected_at as is_new_detection/);
  assert.match(rainScan, /if \(upsert\.rows\[0\]\?\.is_new_detection\)/);
  assert.match(rainScan, /sendEmptyPushToUser\(pool, candidate\.user_id, 'weather'\)/);
});

test('generated PWA service worker imports the push handler', async () => {
  const vite = await read('../vite.config.ts');
  const serviceWorker = await read('../public/push-sw.js');

  assert.match(vite, /importScripts: \['push-sw\.js'\]/);
  assert.match(serviceWorker, /showNotification\('Mágina Olivo'/);
  assert.match(serviceWorker, /notificationclick/);
  assert.match(serviceWorker, /notificaciones/);
});
