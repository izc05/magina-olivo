create table account_deletion_jobs (
  request_id uuid primary key references account_deletion_requests(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'retry', 'succeeded', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 25),
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'running' and locked_at is not null and locked_by is not null)
    or status <> 'running'
  )
);

create index account_deletion_jobs_ready_idx
  on account_deletion_jobs (run_after, created_at, request_id)
  where status in ('queued', 'retry');

comment on table account_deletion_jobs is
  'Dedicated durable queue for destructive account deletion. Kept separate from the general worker queue so unrelated workers cannot claim destructive jobs.';
