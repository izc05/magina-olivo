create table advertising_plans (
  code text primary key check (code in ('free', 'featured', 'premium')),
  name text not null check (length(trim(name)) > 0),
  public_label text not null check (length(trim(public_label)) > 0),
  priority integer not null default 0 check (priority >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into advertising_plans (code, name, public_label, priority)
values
  ('free', 'Gratis', 'Ficha gratuita', 0),
  ('featured', 'Destacado', 'Destacado', 100),
  ('premium', 'Premium', 'Premium', 200)
on conflict (code) do update set
  name = excluded.name,
  public_label = excluded.public_label,
  priority = excluded.priority,
  updated_at = now();

create table advertiser_profiles (
  id uuid primary key,
  destination_id uuid not null unique references cooperatives(id) on delete cascade,
  category text not null check (category in (
    'cooperative', 'oil_mill', 'machinery', 'workshop', 'harvest', 'nursery',
    'irrigation', 'pruning', 'phytosanitary', 'insurance', 'advisory', 'other'
  )),
  description text,
  phone text,
  whatsapp_phone text,
  logo_url text,
  hero_image_url text,
  contact_email text,
  status text not null default 'draft' check (status in ('draft', 'pending', 'active', 'paused', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index advertiser_profiles_category_status_idx
  on advertiser_profiles(category, status);

create table sponsorships (
  id uuid primary key,
  advertiser_id uuid not null references advertiser_profiles(id) on delete cascade,
  plan_code text not null references advertising_plans(code),
  status text not null default 'draft' check (status in ('draft', 'pending', 'active', 'paused', 'expired', 'cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  priority_override integer check (priority_override is null or priority_override >= 0),
  public_label text not null default 'Patrocinado',
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index sponsorships_active_window_idx
  on sponsorships(status, starts_at, ends_at);

create index sponsorships_advertiser_idx
  on sponsorships(advertiser_id, status);

create table sponsorship_municipalities (
  sponsorship_id uuid not null references sponsorships(id) on delete cascade,
  municipality text not null check (length(trim(municipality)) > 0),
  created_at timestamptz not null default now(),
  primary key (sponsorship_id, municipality)
);

create index sponsorship_municipalities_lookup_idx
  on sponsorship_municipalities(municipality, sponsorship_id);

create table advertiser_applications (
  id uuid primary key,
  destination_id uuid references cooperatives(id) on delete set null,
  business_name text not null check (length(trim(business_name)) > 0),
  category text not null,
  municipality text,
  contact_name text not null check (length(trim(contact_name)) > 0),
  contact_email text not null check (length(trim(contact_email)) > 0),
  contact_phone text,
  requested_plan_code text references advertising_plans(code),
  description text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  reviewed_by_user_id text,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index advertiser_applications_status_idx
  on advertiser_applications(status, created_at desc);

create table advertising_events (
  id uuid primary key,
  advertiser_id uuid not null references advertiser_profiles(id) on delete cascade,
  sponsorship_id uuid references sponsorships(id) on delete set null,
  event_type text not null check (event_type in ('impression', 'profile_view', 'phone_click', 'whatsapp_click', 'website_click')),
  municipality text,
  placement text,
  occurred_at timestamptz not null default now()
);

create index advertising_events_metrics_idx
  on advertising_events(advertiser_id, occurred_at desc, event_type);

comment on table advertising_events is
  'Privacy-preserving aggregate advertising analytics. Do not persist IP addresses, precise plot coordinates or holding/user identifiers here.';

comment on table sponsorships is
  'Commercial visibility only. Sponsorship must never alter objective market, weather, field-alert, news or private holding data.';
