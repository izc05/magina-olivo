create table push_subscriptions (
  id uuid primary key,
  user_id text not null,
  endpoint text not null,
  endpoint_origin text not null,
  expiration_time bigint,
  enabled boolean not null default true,
  failure_count integer not null default 0 check (failure_count >= 0),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (endpoint)
);

create index push_subscriptions_user_enabled_idx
  on push_subscriptions (user_id, enabled);

comment on table push_subscriptions is
  'Web Push capability endpoints explicitly registered by authenticated users. V1 deliberately stores no p256dh/auth keys because pushes carry no payload.';

comment on column push_subscriptions.endpoint is
  'Sensitive capability URL supplied by PushManager. Never expose it in account exports, analytics or logs.';

comment on column push_subscriptions.endpoint_origin is
  'Normalized push-service origin used for auditing and SSRF policy enforcement.';

comment on column push_subscriptions.enabled is
  'Server-side revocation switch. Browser unsubscribe remains authoritative on the device.';
