import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import {
  overdueTaskEventKey,
  pendingYieldEventKey,
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

test('overdue task event key is stable and changes with due date', () => {
  const key = overdueTaskEventKey('11111111-1111-4111-8111-111111111111', '2026-09-10');
  assert.equal(key, 'task-overdue:11111111-1111-4111-8111-111111111111:2026-09-10');
  assert.notEqual(
    overdueTaskEventKey('11111111-1111-4111-8111-111111111111', '2026-09-11'),
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

test('pending yield event key is stable and changes when delivery timestamp changes', () => {
  const key = pendingYieldEventKey('33333333-3333-4333-8333-333333333333', '1789000000');
  assert.equal(key, 'pending-yield:33333333-3333-4333-8333-333333333333:1789000000');
  assert.notEqual(
    pendingYieldEventKey('33333333-3333-4333-8333-333333333333', '1789000001'),
    key,
  );
});

test('push categories reuse the persisted notification preferences', () => {
  assert.equal(categoryPreferenceColumn('weather'), 'notify_weather');
  assert.equal(categoryPreferenceColumn('tasks'), 'notify_tasks');
  assert.equal(categoryPreferenceColumn('rewards'), 'notify_rewards');
  assert.equal(categoryPreferenceColumn('pending_yield'), 'notify_pending_yield');
});

test('agricultural reminder scan stays bounded, preference-aware and detail-free', async () => {
  const source = await fs.readFile(new URL('./push-reminder-scan.ts', import.meta.url), 'utf8');
  const baseMigration = await fs.readFile(
    new URL('../../../db/migrations/0047_web_push_notification_events.sql', import.meta.url),
    'utf8',
  );
  const categoryMigration = await fs.readFile(
    new URL('../../../db/migrations/0048_web_push_pending_yield_category.sql', import.meta.url),
    'utf8',
  );

  assert.match(source, /coalesce\(up\.notify_tasks, true\) = true/);
  assert.match(source, /coalesce\(up\.notify_rewards, true\) = true/);
  assert.match(source, /coalesce\(up\.notify_pending_yield, true\) = true/);
  assert.match(source, /time zone 'Europe\/Madrid'/);
  assert.match(source, /t\.status = 'pending'/);
  assert.match(source, /t\.priority = 'high'/);
  assert.match(source, /t\.due_date \+ 7/);
  assert.match(source, /rd\.status in \('reserved', 'issued'\)/);
  assert.match(source, /interval '48 hours'/);
  assert.match(source, /d\.verification_status = 'confirmed'/);
  assert.match(source, /c\.status in \('active', 'closed'\)/);
  assert.match(source, /interval '7 days'/);
  assert.match(source, /interval '21 days'/);
  assert.match(source, /dr\.result_type = 'fat_yield'/);
  assert.match(source, /dr\.status = 'current'/);
  assert.match(source, /not exists/);
  assert.match(source, /const key = `\$\{event\.user_id\}:\$\{event\.category\}`/);
  assert.match(source, /sendEmptyPushToUser\(pool, first\.user_id, first\.category\)/);
  assert.doesNotMatch(source, /reward_title|task\.title|plot_name|yield_percent|total_kg|kilograms/);
  assert.match(baseMigration, /unique \(user_id, event_key\)/);
  assert.match(baseMigration, /where sent_at is null/);
  assert.match(categoryMigration, /category in \('tasks', 'rewards', 'pending_yield'\)/);
  assert.doesNotMatch(baseMigration, /^\s*(title|body|payload|plot_name|yield_percent|total_kg)\s+/m);
  assert.doesNotMatch(categoryMigration, /^\s*(title|body|payload|plot_name|yield_percent|total_kg)\s+/m);
});
