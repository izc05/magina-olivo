import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import {
  rewardExpiryEventKey,
  taskReminderEventKey,
} from './push-reminder-scan.ts';
import { categoryPreferenceColumn } from './web-push-empty.ts';

test('task reminder event key is stable and changes with schedule', () => {
  const key = taskReminderEventKey('11111111-1111-4111-8111-111111111111', '2026-09-10', 2);
  assert.equal(key, 'task:11111111-1111-4111-8111-111111111111:2026-09-10:2');
  assert.equal(
    taskReminderEventKey('11111111-1111-4111-8111-111111111111', '2026-09-10', 2),
    key,
  );
  assert.notEqual(
    taskReminderEventKey('11111111-1111-4111-8111-111111111111', '2026-09-11', 2),
    key,
  );
  assert.notEqual(
    taskReminderEventKey('11111111-1111-4111-8111-111111111111', '2026-09-10', 1),
    key,
  );
});

test('reward expiry event key is stable and changes when expiry changes', () => {
  const key = rewardExpiryEventKey('22222222-2222-4222-8222-222222222222', '1789000000');
  assert.equal(key, 'reward-expiry:22222222-2222-4222-8222-222222222222:1789000000');
  assert.notEqual(
    rewardExpiryEventKey('22222222-2222-4222-8222-222222222222', '1789000001'),
    key,
  );
});

test('push categories reuse the persisted notification preferences', () => {
  assert.equal(categoryPreferenceColumn('weather'), 'notify_weather');
  assert.equal(categoryPreferenceColumn('tasks'), 'notify_tasks');
  assert.equal(categoryPreferenceColumn('rewards'), 'notify_rewards');
});

test('task and reward reminder scan stays bounded, preference-aware and detail-free', async () => {
  const source = await fs.readFile(new URL('./push-reminder-scan.ts', import.meta.url), 'utf8');
  const migration = await fs.readFile(
    new URL('../../../db/migrations/0047_web_push_notification_events.sql', import.meta.url),
    'utf8',
  );

  assert.match(source, /coalesce\(up\.notify_tasks, true\) = true/);
  assert.match(source, /coalesce\(up\.notify_rewards, true\) = true/);
  assert.match(source, /time zone 'Europe\/Madrid'/);
  assert.match(source, /t\.status = 'pending'/);
  assert.match(source, /rd\.status in \('reserved', 'issued'\)/);
  assert.match(source, /interval '48 hours'/);
  assert.match(source, /const key = `\$\{event\.user_id\}:\$\{event\.category\}`/);
  assert.match(source, /sendEmptyPushToUser\(pool, first\.user_id, first\.category\)/);
  assert.doesNotMatch(source, /reward_title|task\.title|plot_name|yield_percent|total_kg/);
  assert.match(migration, /unique \(user_id, event_key\)/);
  assert.match(migration, /where sent_at is null/);
  assert.doesNotMatch(migration, /title|body|plot|harvest|yield/);
});
