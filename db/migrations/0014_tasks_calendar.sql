create table tasks (
  id uuid primary key,
  holding_id uuid not null references holdings(id) on delete cascade,
  campaign_id uuid,
  farm_id uuid,
  plot_id uuid,
  title text not null check (length(trim(title)) between 1 and 160),
  notes text,
  due_date date not null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  reminder_days_before integer check (reminder_days_before is null or reminder_days_before between 0 and 30),
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  created_by text not null,
  completed_by text,
  completed_at timestamptz,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, holding_id),
  foreign key (campaign_id, holding_id) references campaigns(id, holding_id) on delete restrict,
  foreign key (farm_id, holding_id) references farms(id, holding_id) on delete restrict,
  foreign key (plot_id, holding_id) references plots(id, holding_id) on delete restrict,
  check (
    (status = 'completed' and completed_at is not null and completed_by is not null)
    or (status <> 'completed' and completed_at is null and completed_by is null)
  )
);

create index tasks_holding_due_idx
  on tasks (holding_id, due_date asc, id asc);

create index tasks_pending_due_idx
  on tasks (holding_id, due_date asc, priority desc)
  where status = 'pending';

create index tasks_reminder_scan_idx
  on tasks (due_date asc, reminder_days_before)
  where status = 'pending' and reminder_days_before is not null;

comment on table tasks is
  'Private agricultural tasks/calendar entries scoped to one holding. Overdue is derived from due_date and never persisted as a status.';

comment on column tasks.reminder_days_before is
  'Deterministic reminder offset for the future notification-center worker; null means no reminder.';
