create table platform_admin_audit_log (
  id uuid primary key,
  actor_user_id text not null,
  actor_email text not null,
  action text not null check (length(trim(action)) > 0),
  entity_type text not null check (length(trim(entity_type)) > 0),
  entity_id text,
  summary text not null check (length(trim(summary)) > 0),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index platform_admin_audit_time_idx
  on platform_admin_audit_log(occurred_at desc);

create index platform_admin_audit_entity_idx
  on platform_admin_audit_log(entity_type, entity_id, occurred_at desc);

comment on table platform_admin_audit_log is
  'Platform-admin audit trail. Keep metadata minimal: no passwords, session tokens, precise plot coordinates or private agricultural payloads.';
