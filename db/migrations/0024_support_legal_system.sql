create table if not exists support_tickets (
  id uuid primary key,
  requester_user_id text,
  requester_name text not null check (length(trim(requester_name)) > 0),
  requester_email text not null check (length(trim(requester_email)) > 0),
  category text not null default 'support'
    check (category in ('support', 'commercial', 'privacy', 'data_rights', 'other')),
  subject text not null check (length(trim(subject)) > 0),
  message text not null check (length(trim(message)) > 0),
  status text not null default 'new'
    check (status in ('new', 'in_progress', 'waiting_user', 'resolved', 'closed')),
  priority text not null default 'normal'
    check (priority in ('normal', 'high', 'urgent')),
  assigned_admin_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists support_tickets_queue_idx
  on support_tickets(status, priority, created_at desc);

create table if not exists support_ticket_notes (
  id uuid primary key,
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  author_admin_user_id text not null,
  note text not null check (length(trim(note)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_notes_ticket_idx
  on support_ticket_notes(ticket_id, created_at asc);

create table if not exists legal_documents (
  id uuid primary key,
  document_key text not null check (document_key in ('privacy', 'cookies', 'terms')),
  version text not null check (length(trim(version)) > 0),
  title text not null check (length(trim(title)) > 0),
  content_text text not null check (length(trim(content_text)) > 0),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  effective_at timestamptz,
  created_by_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_key, version)
);

create unique index if not exists legal_documents_one_active_per_key_uq
  on legal_documents(document_key)
  where status = 'active';

create table if not exists legal_acceptances (
  id uuid primary key,
  user_id text not null,
  legal_document_id uuid not null references legal_documents(id) on delete restrict,
  accepted_at timestamptz not null default now(),
  source text not null default 'web' check (source in ('web', 'pwa')),
  unique (user_id, legal_document_id)
);

create index if not exists legal_acceptances_user_idx
  on legal_acceptances(user_id, accepted_at desc);

create table if not exists system_operational_evidence (
  evidence_key text primary key
    check (evidence_key in ('database_backup', 'private_objects_backup', 'restore_drill', 'release_rollback')),
  status text not null default 'unknown'
    check (status in ('unknown', 'ok', 'warning', 'failed')),
  last_checked_at timestamptz,
  summary text,
  source text not null default 'manual' check (source in ('manual', 'script')),
  updated_by_user_id text,
  updated_at timestamptz not null default now()
);

insert into system_operational_evidence (evidence_key, status, summary)
values
  ('database_backup', 'unknown', 'Sin evidencia registrada todavía.'),
  ('private_objects_backup', 'unknown', 'Sin evidencia registrada todavía.'),
  ('restore_drill', 'unknown', 'Sin simulacro registrado todavía.'),
  ('release_rollback', 'unknown', 'Sin evidencia operativa registrada todavía.')
on conflict (evidence_key) do nothing;

comment on table support_tickets is
  'Contact and support inbox. Requesters must never be asked to submit passwords, authentication tokens or secrets.';

comment on table system_operational_evidence is
  'Read-only operational evidence for the admin UI. Backup/restore commands are intentionally not executed from the browser.';
