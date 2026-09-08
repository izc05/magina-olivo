alter table public_municipalities
  add column if not exists hero_image_url text,
  add column if not exists hero_image_source_url text,
  add column if not exists hero_image_credit text,
  add column if not exists hero_image_alt text,
  add column if not exists hero_image_license text not null default 'unknown'
    check (hero_image_license in ('owned', 'licensed', 'official_reusable', 'external_reference_only', 'unknown', 'blocked')),
  add column if not exists hero_image_status text not null default 'missing'
    check (hero_image_status in ('missing', 'candidate', 'approved', 'blocked')),
  add column if not exists hero_image_updated_at timestamptz;

comment on column public_municipalities.hero_image_url is
  'Publicly usable municipality hero image. External references that cannot be republished must not be copied here.';
comment on column public_municipalities.hero_image_source_url is
  'Traceable source page for the municipality hero image.';
comment on column public_municipalities.hero_image_license is
  'Editorial rights status for the municipality hero image.';

alter table cooperatives
  add column if not exists description text,
  add column if not exists image_url text,
  add column if not exists image_source_url text,
  add column if not exists image_credit text,
  add column if not exists image_alt text,
  add column if not exists image_license text not null default 'unknown'
    check (image_license in ('owned', 'licensed', 'official_reusable', 'external_reference_only', 'unknown', 'blocked')),
  add column if not exists image_status text not null default 'missing'
    check (image_status in ('missing', 'candidate', 'approved', 'blocked')),
  add column if not exists public_visible boolean not null default true,
  add column if not exists featured boolean not null default false;

comment on column cooperatives.image_license is
  'Editorial rights status for the public almazara/cooperative image.';

create table if not exists local_businesses (
  id uuid primary key,
  name text not null check (length(trim(name)) > 0),
  category text not null check (category in (
    'agricultural_machinery',
    'olive_services',
    'harvest_services',
    'irrigation',
    'nursery',
    'workshop',
    'transport',
    'hospitality',
    'retail',
    'professional_service',
    'other'
  )),
  municipality text,
  province text not null default 'Jaén',
  description text,
  address text,
  phone text,
  whatsapp text,
  website_url text,
  image_url text,
  image_source_url text,
  image_credit text,
  image_alt text,
  image_license text not null default 'unknown'
    check (image_license in ('owned', 'licensed', 'official_reusable', 'external_reference_only', 'unknown', 'blocked')),
  image_status text not null default 'missing'
    check (image_status in ('missing', 'candidate', 'approved', 'blocked')),
  source_url text,
  source_checked_at timestamptz,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified', 'stale')),
  public_visible boolean not null default false,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists local_businesses_location_idx
  on local_businesses(province, municipality, public_visible);
create index if not exists local_businesses_category_idx
  on local_businesses(category, verification_status);

comment on table local_businesses is
  'Curated local-business directory managed from Mágina Olivo Admin. Advertising/sponsorship is intentionally separate from editorial inclusion.';
