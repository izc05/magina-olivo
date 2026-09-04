create table if not exists advertiser_portal_memberships (
  advertiser_id uuid not null references advertiser_profiles(id) on delete cascade,
  user_id text not null,
  role text not null default 'owner' check (role in ('owner', 'editor', 'viewer')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_by_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (advertiser_id, user_id)
);

create index if not exists advertiser_portal_memberships_user_idx
  on advertiser_portal_memberships(user_id, status, advertiser_id);

create table if not exists advertiser_profile_change_requests (
  id uuid primary key,
  advertiser_id uuid not null references advertiser_profiles(id) on delete cascade,
  submitted_by_user_id text not null,
  description text,
  phone text,
  whatsapp_phone text,
  logo_url text,
  hero_image_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  reviewed_by_user_id text,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists advertiser_profile_change_requests_status_idx
  on advertiser_profile_change_requests(advertiser_id, status, created_at desc);

create unique index if not exists advertiser_profile_change_requests_one_pending_uq
  on advertiser_profile_change_requests(advertiser_id, submitted_by_user_id)
  where status = 'pending';

comment on table advertiser_portal_memberships is
  'Explicit advertiser-to-auth-account access. Contact email alone never grants portal access.';

comment on table advertiser_profile_change_requests is
  'Advertiser-submitted commercial profile edits require admin review before affecting public sponsored content.';
