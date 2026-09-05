import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { sendEmptyPushToUser, type PushCategory } from './web-push-empty.ts';

const scanMinutes = Number(process.env.WEB_PUSH_REMINDER_SCAN_MINUTES ?? '15');
const batchSize = Number(process.env.WEB_PUSH_REMINDER_BATCH_SIZE ?? '500');
const claimLeaseMinutes = 20;

if (!Number.isFinite(scanMinutes) || scanMinutes < 1 || scanMinutes > 1440) {
  throw new Error('WEB_PUSH_REMINDER_SCAN_MINUTES must be between 1 and 1440');
}
if (!Number.isFinite(batchSize) || batchSize < 1 || batchSize > 1000) {
  throw new Error('WEB_PUSH_REMINDER_BATCH_SIZE must be between 1 and 1000');
}

type ReminderCandidate = {
  user_id: string;
  category: Extract<PushCategory, 'tasks' | 'rewards' | 'pending_yield'>;
  source_type: 'task' | 'loyalty_redemption' | 'delivery';
  source_id: string;
  event_key: string;
};

type ClaimedEvent = ReminderCandidate & { event_id: string };

let nextScanAt = 0;

export function taskReminderEventKey(taskId: string, dueDate: string, reminderDaysBefore: number): string {
  return `task:${taskId}:${dueDate}:${reminderDaysBefore}`;
}

export function overdueTaskEventKey(taskId: string, dueDate: string): string {
  return `task-overdue:${taskId}:${dueDate}`;
}

export function rewardExpiryEventKey(redemptionId: string, expiryEpoch: string): string {
  return `reward-expiry:${redemptionId}:${expiryEpoch}`;
}

export function pendingYieldEventKey(deliveryId: string, deliveredEpoch: string): string {
  return `pending-yield:${deliveryId}:${deliveredEpoch}`;
}

async function loadCandidates(pool: Pool): Promise<ReminderCandidate[]> {
  const result = await pool.query<{
    user_id: string;
    category: 'tasks' | 'rewards' | 'pending_yield';
    source_type: 'task' | 'loyalty_redemption' | 'delivery';
    source_id: string;
    due_date: string | null;
    reminder_days_before: number | null;
    expiry_epoch: string | null;
    delivered_epoch: string | null;
    task_kind: 'reminder' | 'overdue' | null;
  }>(
    `
      with task_candidates as (
        select distinct
          hm.user_id,
          'tasks'::text as category,
          'task'::text as source_type,
          t.id as source_id,
          t.due_date::text as due_date,
          t.reminder_days_before,
          null::text as expiry_epoch,
          null::text as delivered_epoch,
          'reminder'::text as task_kind
        from tasks t
        join holding_members hm
          on hm.holding_id = t.holding_id
         and hm.status = 'active'
        left join user_preferences up on up.user_id = hm.user_id
        where t.status = 'pending'
          and t.reminder_days_before is not null
          and coalesce(up.notify_tasks, true) = true
          and (now() at time zone 'Europe/Madrid')::date >= (t.due_date - t.reminder_days_before)
          and (now() at time zone 'Europe/Madrid')::date <= t.due_date
      ), overdue_task_candidates as (
        select distinct
          hm.user_id,
          'tasks'::text as category,
          'task'::text as source_type,
          t.id as source_id,
          t.due_date::text as due_date,
          null::integer as reminder_days_before,
          null::text as expiry_epoch,
          null::text as delivered_epoch,
          'overdue'::text as task_kind
        from tasks t
        join holding_members hm
          on hm.holding_id = t.holding_id
         and hm.status = 'active'
        left join user_preferences up on up.user_id = hm.user_id
        where t.status = 'pending'
          and t.priority = 'high'
          and coalesce(up.notify_tasks, true) = true
          and (now() at time zone 'Europe/Madrid')::date > t.due_date
          and (now() at time zone 'Europe/Madrid')::date <= (t.due_date + 7)
      ), reward_candidates as (
        select
          rd.user_id,
          'rewards'::text as category,
          'loyalty_redemption'::text as source_type,
          rd.id as source_id,
          null::text as due_date,
          null::integer as reminder_days_before,
          floor(extract(epoch from rd.expires_at))::bigint::text as expiry_epoch,
          null::text as delivered_epoch,
          null::text as task_kind
        from loyalty_redemptions rd
        left join user_preferences up on up.user_id = rd.user_id
        where rd.status in ('reserved', 'issued')
          and coalesce(up.notify_rewards, true) = true
          and rd.expires_at > now()
          and rd.expires_at <= now() + interval '48 hours'
      ), pending_yield_candidates as (
        select distinct
          hm.user_id,
          'pending_yield'::text as category,
          'delivery'::text as source_type,
          d.id as source_id,
          null::text as due_date,
          null::integer as reminder_days_before,
          null::text as expiry_epoch,
          floor(extract(epoch from d.delivered_at))::bigint::text as delivered_epoch,
          null::text as task_kind
        from deliveries d
        join campaigns c
          on c.id = d.campaign_id
         and c.holding_id = d.holding_id
         and c.status in ('active', 'closed')
        join holding_members hm
          on hm.holding_id = d.holding_id
         and hm.status = 'active'
        left join user_preferences up on up.user_id = hm.user_id
        where d.verification_status = 'confirmed'
          and coalesce(up.notify_pending_yield, true) = true
          and d.delivered_at <= now() - interval '7 days'
          and d.delivered_at > now() - interval '21 days'
          and not exists (
            select 1
            from delivery_results dr
            where dr.holding_id = d.holding_id
              and dr.delivery_id = d.id
              and dr.result_type = 'fat_yield'
              and dr.status = 'current'
          )
      )
      select *
      from (
        select * from task_candidates
        union all
        select * from overdue_task_candidates
        union all
        select * from reward_candidates
        union all
        select * from pending_yield_candidates
      ) candidates
      order by user_id, category, source_id
      limit $1
    `,
    [Math.trunc(batchSize)],
  );

  return result.rows.flatMap((row): ReminderCandidate[] => {
    if (row.category === 'tasks' && row.task_kind === 'reminder' && row.due_date && row.reminder_days_before != null) {
      return [{
        user_id: row.user_id,
        category: 'tasks',
        source_type: 'task',
        source_id: row.source_id,
        event_key: taskReminderEventKey(row.source_id, row.due_date, row.reminder_days_before),
      }];
    }
    if (row.category === 'tasks' && row.task_kind === 'overdue' && row.due_date) {
      return [{
        user_id: row.user_id,
        category: 'tasks',
        source_type: 'task',
        source_id: row.source_id,
        event_key: overdueTaskEventKey(row.source_id, row.due_date),
      }];
    }
    if (row.category === 'rewards' && row.expiry_epoch) {
      return [{
        user_id: row.user_id,
        category: 'rewards',
        source_type: 'loyalty_redemption',
        source_id: row.source_id,
        event_key: rewardExpiryEventKey(row.source_id, row.expiry_epoch),
      }];
    }
    if (row.category === 'pending_yield' && row.delivered_epoch) {
      return [{
        user_id: row.user_id,
        category: 'pending_yield',
        source_type: 'delivery',
        source_id: row.source_id,
        event_key: pendingYieldEventKey(row.source_id, row.delivered_epoch),
      }];
    }
    return [];
  });
}

async function claimCandidate(pool: Pool, candidate: ReminderCandidate): Promise<ClaimedEvent | null> {
  const result = await pool.query<{ id: string }>(
    `
      insert into push_notification_events (
        id, user_id, category, event_key, source_type, source_id, claimed_at, updated_at
      )
      values ($1, $2, $3, $4, $5, $6, now(), now())
      on conflict (user_id, event_key)
      do update set
        claimed_at = now(),
        updated_at = now()
      where push_notification_events.sent_at is null
        and push_notification_events.claimed_at < now() - ($7::text || ' minutes')::interval
      returning id
    `,
    [
      randomUUID(),
      candidate.user_id,
      candidate.category,
      candidate.event_key,
      candidate.source_type,
      candidate.source_id,
      String(claimLeaseMinutes),
    ],
  );
  const row = result.rows[0];
  return row ? { ...candidate, event_id: row.id } : null;
}

async function markSent(pool: Pool, eventIds: string[]): Promise<void> {
  if (!eventIds.length) return;
  await pool.query(
    `
      update push_notification_events
      set sent_at = coalesce(sent_at, now()),
          updated_at = now()
      where id = any($1::uuid[])
    `,
    [eventIds],
  );
}

export async function scanPushReminders(pool: Pool): Promise<{
  candidates: number;
  claimed: number;
  pushes: number;
  deliveredDevices: number;
}> {
  const candidates = await loadCandidates(pool);
  const claimed: ClaimedEvent[] = [];
  for (const candidate of candidates) {
    const event = await claimCandidate(pool, candidate);
    if (event) claimed.push(event);
  }

  const groups = new Map<string, ClaimedEvent[]>();
  for (const event of claimed) {
    const key = `${event.user_id}:${event.category}`;
    const items = groups.get(key) ?? [];
    items.push(event);
    groups.set(key, items);
  }

  let pushes = 0;
  let deliveredDevices = 0;
  for (const events of groups.values()) {
    const first = events[0];
    if (!first) continue;
    const result = await sendEmptyPushToUser(pool, first.user_id, first.category).catch(() => ({
      configured: true,
      attempted: 0,
      delivered: 0,
      disabled: 0,
    }));
    if (result.delivered > 0) {
      await markSent(pool, events.map((event) => event.event_id));
      pushes += 1;
      deliveredDevices += result.delivered;
    }
  }

  return {
    candidates: candidates.length,
    claimed: claimed.length,
    pushes,
    deliveredDevices,
  };
}

export async function runPushReminderMaintenance(
  pool: Pool,
  force = false,
): Promise<{ ran: boolean; candidates: number; claimed: number; pushes: number; deliveredDevices: number }> {
  const now = Date.now();
  if (!force && now < nextScanAt) {
    return { ran: false, candidates: 0, claimed: 0, pushes: 0, deliveredDevices: 0 };
  }

  try {
    const result = await scanPushReminders(pool);
    nextScanAt = Date.now() + scanMinutes * 60_000;
    if (result.pushes > 0) {
      console.log(JSON.stringify({
        event: 'web_push_reminders_completed',
        candidates: result.candidates,
        claimed: result.claimed,
        pushes: result.pushes,
        delivered_devices: result.deliveredDevices,
      }));
    }
    return { ran: true, ...result };
  } catch (error) {
    nextScanAt = Date.now() + Math.min(scanMinutes * 60_000, 60_000);
    console.warn(JSON.stringify({
      event: 'web_push_reminders_failed',
      error: error instanceof Error ? error.message : String(error),
    }));
    return { ran: true, candidates: 0, claimed: 0, pushes: 0, deliveredDevices: 0 };
  }
}
