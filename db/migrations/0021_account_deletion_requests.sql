create table account_deletion_requests (
  id uuid primary key,
  user_id text not null,
  status text not null default 'requested'
    check (status in ('requested', 'processing', 'completed', 'cancelled', 'failed')),
  requested_at timestamptz not null default now(),
  confirmed_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  failed_at timestamptz,
  failure_code text,
  source_session_id text not null,
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);

create unique index account_deletion_requests_one_active_uq
  on account_deletion_requests(user_id)
  where status in ('requested', 'processing');

create index account_deletion_requests_user_time_idx
  on account_deletion_requests(user_id, requested_at desc);

comment on table account_deletion_requests is
  'User-initiated account deletion requests. Physical deletion is executed separately after storage and ownership checks.';
