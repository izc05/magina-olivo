-- Platform administration is deliberately separate from holding membership.
-- It never grants access to farms, deliveries, results, or documents.
create table platform_admin_members (
  user_id text primary key,
  role text not null check (role in ('super_admin', 'admin', 'editor', 'support')),
  status text not null default 'active' check (status in ('active', 'suspended', 'revoked')),
  granted_by_user_id text,
  granted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index platform_admin_members_active_idx
  on platform_admin_members (status, role)
  where status = 'active';

create table platform_admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id text not null,
  action text not null check (length(trim(action)) > 0),
  target_type text,
  target_id text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index platform_admin_audit_log_actor_idx
  on platform_admin_audit_log (actor_user_id, created_at desc);

create index platform_admin_audit_log_created_idx
  on platform_admin_audit_log (created_at desc);

comment on table platform_admin_members is
  'Global platform roles. These roles do not bypass holding-level authorization.';

comment on table platform_admin_audit_log is
  'Audit trail for platform administration. Do not store credentials, document contents, or private farm data.';
