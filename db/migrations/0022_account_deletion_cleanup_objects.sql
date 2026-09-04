create table account_deletion_cleanup_objects (
  request_id uuid not null references account_deletion_requests(id) on delete cascade,
  object_key text not null,
  deleted_at timestamptz,
  last_error text,
  attempts integer not null default 0 check (attempts >= 0),
  updated_at timestamptz not null default now(),
  primary key (request_id, object_key)
);

create index account_deletion_cleanup_objects_pending_idx
  on account_deletion_cleanup_objects (request_id, object_key)
  where deleted_at is null;

comment on table account_deletion_cleanup_objects is
  'Durable cleanup manifest for private object-storage keys captured before holding/document rows are deleted. Enables idempotent account deletion retries without retaining document metadata.';
