alter table public_news_items
  add column if not exists featured boolean not null default false,
  add column if not exists editorial_note text;

create index if not exists public_news_items_featured_idx
  on public_news_items(featured desc, published_at desc)
  where active = true;

create table if not exists platform_announcements (
  id uuid primary key,
  title text not null check (length(trim(title)) > 0),
  body text not null check (length(trim(body)) > 0),
  severity text not null default 'info'
    check (severity in ('info', 'notice', 'warning', 'urgent')),
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'active', 'paused', 'expired')),
  audience text not null default 'all'
    check (audience in ('all', 'authenticated')),
  municipality_slug text references public_municipalities(slug) on delete set null,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists platform_announcements_visible_idx
  on platform_announcements(status, starts_at, ends_at, municipality_slug);

comment on table platform_announcements is
  'First-party Mágina Olivo notices. These are platform communications, never official AEMET, RAIF or civil-protection alerts.';

comment on column public_news_items.editorial_note is
  'Internal admin note only. It is never exposed through public news routes.';
