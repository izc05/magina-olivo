create table if not exists job_queue (
  id uuid primary key,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'retry', 'succeeded', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 25),
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  dedupe_key text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'running' and locked_at is not null and locked_by is not null)
    or status <> 'running'
  )
);

create index if not exists job_queue_ready_idx
  on job_queue (run_after, created_at, id)
  where status in ('queued', 'retry');

create unique index if not exists job_queue_dedupe_idx
  on job_queue (dedupe_key)
  where dedupe_key is not null;
