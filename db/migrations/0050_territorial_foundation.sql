-- =============================================================================
-- MÁGINA OLIVO — MÓDULO TERRITORIAL: FUNDACIÓN Y PILOTO BEDMAR Y JÓDAR
-- Migración: 0050_territorial_foundation.sql
-- =============================================================================

-- 1. Ampliación de la tabla de municipios públicos (public_municipalities)
alter table public_municipalities
  add column if not exists ine_code char(5) check (ine_code ~ '^[0-9]{5}$'),
  add column if not exists comarca text default 'Sierra Mágina',
  add column if not exists official_url text,
  add column if not exists electronic_seat_url text,
  add column if not exists center_latitude double precision,
  add column if not exists center_longitude double precision;

comment on column public_municipalities.ine_code is 'Código oficial del Instituto Nacional de Estadística (5 dígitos).';
comment on column public_municipalities.electronic_seat_url is 'Sede electrónica del ayuntamiento para trámites y edictos.';

-- Actualización de datos verificados de Bedmar y Garcíez y Jódar
update public_municipalities
set
  ine_code = '23902',
  comarca = 'Sierra Mágina',
  official_url = 'https://www.bedmargarciez.es/',
  electronic_seat_url = 'https://bedmargarciez.sedelectronica.es/',
  center_latitude = 37.8183,
  center_longitude = -3.4144,
  updated_at = now()
where slug = 'bedmar-y-garciez';

update public_municipalities
set
  ine_code = '23053',
  comarca = 'Sierra Mágina',
  official_url = 'https://www.jodar.es/',
  electronic_seat_url = 'https://jodar.sedelectronica.es/',
  center_latitude = 37.8406,
  center_longitude = -3.3537,
  updated_at = now()
where slug = 'jodar';

-- 2. Ampliación de noticias públicas con filtrado municipal
alter table public_news_items
  add column if not exists municipality_slug text references public_municipalities(slug) on delete set null;

create index if not exists public_news_items_municipality_idx
  on public_news_items(municipality_slug, published_at desc)
  where active = true;

-- 3. Directorio de Comunidades de Regantes y entidades de riego
create table if not exists irrigation_communities (
  id uuid primary key default gen_random_uuid(),
  official_name text not null check (length(trim(official_name)) > 0),
  short_name text,
  entity_type text not null default 'community_of_irrigation'
    check (entity_type in ('community_of_irrigation', 'sat_irrigation', 'acequia_association', 'other')),
  primary_municipality_slug text not null references public_municipalities(slug),
  covered_municipality_slugs jsonb not null default '[]'::jsonb,
  address text,
  phone text,
  email text,
  website_url text,
  electronic_seat_url text,
  verification_status text not null default 'candidate'
    check (verification_status in ('candidate', 'verified', 'collaborating')),
  source_bulletin_ref text,
  last_checked_at timestamptz not null default now(),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Sectores de Riego
create table if not exists irrigation_sectors (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references irrigation_communities(id) on delete cascade,
  sector_code text not null check (length(trim(sector_code)) > 0),
  name text not null check (length(trim(name)) > 0),
  description text,
  verification_status text not null default 'candidate'
    check (verification_status in ('candidate', 'verified')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (community_id, sector_code)
);

-- 5. Avisos y Turnos Comunitarios de Riego
create table if not exists community_water_notices (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references irrigation_communities(id) on delete cascade,
  sector_id uuid references irrigation_sectors(id) on delete set null,
  notice_type text not null default 'shift_schedule'
    check (notice_type in ('shift_schedule', 'water_cut', 'schedule_change', 'general_notice')),
  title text not null check (length(trim(title)) > 0),
  body text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  source_type text not null default 'public_bulletin'
    check (source_type in ('community_verified', 'public_bulletin', 'manual_unverified')),
  source_url text,
  status text not null default 'published'
    check (status in ('draft', 'published', 'revoked', 'expired')),
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);

-- 6. Enlace entre Parcela Privada y Comunidad/Sector
create table if not exists plot_irrigation_links (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references plots(id) on delete cascade,
  community_id uuid references irrigation_communities(id) on delete set null,
  sector_id uuid references irrigation_sectors(id) on delete set null,
  water_supply_type text not null default 'drip_pressurized'
    check (water_supply_type in ('gravity_acequia', 'drip_pressurized', 'well_private', 'dryland', 'other')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plot_id, community_id, sector_id)
);

-- Inserts iniciales de comunidades verificadas de Bedmar y Jódar
insert into irrigation_communities (
  id, official_name, short_name, entity_type, primary_municipality_slug,
  covered_municipality_slugs, address, website_url, electronic_seat_url,
  verification_status, source_bulletin_ref, last_checked_at
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    'Comunidad de Regantes Canal del Jandulilla',
    'Canal del Jandulilla',
    'community_of_irrigation',
    'jodar',
    '["jodar"]'::jsonb,
    'C/ Juan Martín, 32, 23500 Jódar (Jaén)',
    'https://canaljandulilla.com/',
    'https://canaljandulilla.com/',
    'verified',
    'BOE-B-2025-14108',
    '2026-10-10T00:00:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'Comunidad de Regantes Lagunillas y Cerrón',
    'Lagunillas y Cerrón',
    'community_of_irrigation',
    'bedmar-y-garciez',
    '["bedmar-y-garciez"]'::jsonb,
    'Bedmar y Garcíez (Jaén)',
    null,
    null,
    'verified',
    'BOE-B-2026-19273',
    '2026-10-10T00:00:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'Comunidad de Regantes Caz de los Molinos de Jódar',
    'Caz de los Molinos',
    'community_of_irrigation',
    'jodar',
    '["jodar"]'::jsonb,
    'C/ Compositor Gámez Laserna, 1, 23500 Jódar (Jaén)',
    null,
    null,
    'verified',
    'BOP Jaén 2025-03-14 / BOP 2019-05-09 Edicto 1899',
    '2026-10-10T00:00:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    'S.A.T. Fique (Regantes)',
    'SAT Fique',
    'sat_irrigation',
    'bedmar-y-garciez',
    '["bedmar-y-garciez"]'::jsonb,
    'Bedmar y Garcíez (Jaén)',
    null,
    null,
    'verified',
    'BOE-B-2025-43655',
    '2026-10-10T00:00:00Z'
  )
on conflict (id) do update set
  official_name = excluded.official_name,
  short_name = excluded.short_name,
  entity_type = excluded.entity_type,
  primary_municipality_slug = excluded.primary_municipality_slug,
  covered_municipality_slugs = excluded.covered_municipality_slugs,
  address = excluded.address,
  website_url = excluded.website_url,
  electronic_seat_url = excluded.electronic_seat_url,
  verification_status = excluded.verification_status,
  source_bulletin_ref = excluded.source_bulletin_ref,
  last_checked_at = excluded.last_checked_at,
  updated_at = now();
