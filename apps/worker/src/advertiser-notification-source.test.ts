import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(path: string): Promise<string> {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('commercial notification scan is idempotent and covers due states', async () => {
  const source = await read('./advertiser-notification-scan.ts');
  assert.match(source, /on conflict \(event_key\) do nothing/);
  assert.match(source, /campaign-ending:/);
  assert.match(source, /renewal-due:/);
  assert.match(source, /billing-due:/);
  assert.match(source, /billing-overdue:/);
  assert.match(source, /interval '30 days'/);
  assert.match(source, /interval '7 days'/);
});

test('commercial email transport is disabled by default and requires explicit sender', async () => {
  const source = await read('./advertiser-notification-scan.ts');
  assert.match(source, /COMMERCIAL_MAIL_TRANSPORT \?\? 'disabled'/);
  assert.match(source, /COMMERCIAL_MAIL_FROM/);
  assert.match(source, /RESEND_API_KEY/);
  assert.match(source, /email_enabled = true/);
  assert.doesNotMatch(source, /AUTH_MAIL_TRANSPORT/);
});

test('durable worker invokes commercial notification scan independently of AEMET fetch', async () => {
  const rain = await read('./rain-alert-scan.ts');
  const notificationIndex = rain.indexOf('scanAdvertiserNotifications(pool)');
  const aemetIndex = rain.indexOf("process.env.AEMET_API_KEY");
  assert.ok(notificationIndex >= 0);
  assert.ok(aemetIndex >= 0);
  assert.ok(notificationIndex < aemetIndex);
});
