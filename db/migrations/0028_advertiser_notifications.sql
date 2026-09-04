create table if not exists advertiser_notifications (
  id uuid primary key,
  advertiser_id uuid not null references advertiser_profiles(id) on delete cascade,
  target_user_id text,
  notification_type text not null
    check (notification_type in (
      'application_approved',
      'profile_change_approved',
      'profile_change_rejected',
      'campaign_ending',
      'renewal_due',
      'billing_due',
      'billing_overdue'
    )),
  severity text not null default 'info'
    check (severity in ('info', 'action', 'warning')),
  event_key text not null unique,
  title text not null,
  body text not null,
  action_url text,
  email_eligible boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists advertiser_notifications_lookup_idx
  on advertiser_notifications(advertiser_id, created_at desc);

create table if not exists advertiser_notification_reads (
  notification_id uuid not null references advertiser_notifications(id) on delete cascade,
  user_id text not null,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create table if not exists advertiser_notification_preferences (
  advertiser_id uuid not null references advertiser_profiles(id) on delete cascade,
  user_id text not null,
  email_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (advertiser_id, user_id)
);

create table if not exists advertiser_notification_email_deliveries (
  id uuid primary key,
  notification_id uuid not null references advertiser_notifications(id) on delete cascade,
  user_id text not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'skipped', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_id, user_id)
);

create index if not exists advertiser_notification_email_delivery_status_idx
  on advertiser_notification_email_deliveries(status, created_at);

comment on table advertiser_notifications is
  'Commercial advertiser notices only. These notices are separate from agricultural, weather and official emergency alerts.';

comment on table advertiser_notification_preferences is
  'Per-user advertiser email preference. Email is opt-in and disabled by default; in-app notifications remain available.';

comment on table advertiser_notification_email_deliveries is
  'Commercial notification delivery state. COMMERCIAL_MAIL_TRANSPORT defaults to disabled and no provider call occurs unless explicitly configured.';
