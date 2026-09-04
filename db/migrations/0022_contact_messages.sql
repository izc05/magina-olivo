create table contact_messages (
  id uuid primary key,
  user_id text,
  category text not null,
  reply_email text not null,
  message text not null,
  status text not null default 'new'
    check (status in ('new', 'in_review', 'replied', 'closed', 'spam')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contact_messages_status_time_idx
  on contact_messages(status, created_at desc);

create index contact_messages_user_time_idx
  on contact_messages(user_id, created_at desc)
  where user_id is not null;

comment on table contact_messages is
  'Public contact/support requests. Raw IP addresses are intentionally not persisted in this table.';
