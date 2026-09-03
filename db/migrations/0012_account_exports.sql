create table account_exports (
  id uuid primary key,
  user_id text not null,
  requester_snapshot jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1 check (schema_version = 1),
  status text not null default 'requested'
    check (status in ('requested', 'generating', 'ready', 'expired', 'failed')),
  filename text not null,
  artifact_text text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  sha256 char(64),
  error_message text,
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  check (
    status <> 'ready'
    or (
      artifact_text is not null
      and size_bytes is not null
      and sha256 is not null
      and completed_at is not null
      and expires_at is not null
    )
  )
);

create index account_exports_user_created_idx
  on account_exports (user_id, requested_at desc, id desc);

create index account_exports_expiry_idx
  on account_exports (expires_at)
  where status = 'ready' and expires_at is not null;

comment on table account_exports is
  'Temporary user-requested portability artifacts. V1 stores structured JSON text in PostgreSQL; document binaries/ZIP remain a separate export phase.';

comment on column account_exports.requester_snapshot is
  'Minimal account snapshot captured at request time (name/email) so the worker does not depend on Better Auth internal table names.';

comment on column account_exports.artifact_text is
  'Exact JSON text used for download and SHA-256 verification. Cleared when the export expires.';
