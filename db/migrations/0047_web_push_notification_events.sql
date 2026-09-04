create table push_notification_events (
  id uuid primary key,
  user_id text not null,
  category text not null check (category in ('tasks', 'rewards')),
  event_key text not null,
  source_type text not null,
  source_id uuid not null,
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_key)
);

create index push_notification_events_pending_idx
  on push_notification_events (user_id, category, claimed_at)
  where sent_at is null;

comment on table push_notification_events is
  'Server-side deduplication ledger for empty-payload Web Push reminders. Contains no notification body, plot, harvest, yield or other agricultural detail.';

comment on column push_notification_events.event_key is
  'Stable per-user reminder identity. A changed task due date creates a new key; reward expiry keys include the redemption expiration timestamp.';

comment on column push_notification_events.claimed_at is
  'Short delivery lease. Unsent claims may be reclaimed after the worker lease interval to recover from crashes.';
