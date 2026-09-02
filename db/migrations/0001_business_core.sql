create table holdings (
  id uuid primary key,
  name text not null check (length(trim(name)) > 0),
  municipality text,
  province text,
  active boolean not null default true,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table holding_members (
  holding_id uuid not null references holdings(id) on delete cascade,
  user_id text not null,
  role text not null check (role in ('owner', 'admin', 'collaborator', 'viewer')),
  status text not null default 'active' check (status in ('active', 'suspended', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (holding_id, user_id)
);

comment on column holding_members.user_id is
  'Authentication-provider user id. FK is intentionally deferred until the auth spike validates the final Better Auth schema.';

create table farms (
  id uuid primary key,
  holding_id uuid not null references holdings(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  description text,
  area_ha numeric(12,4) check (area_ha is null or area_ha >= 0),
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  active boolean not null default true,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, holding_id)
);

create index farms_holding_idx on farms(holding_id, active);

create table plots (
  id uuid primary key,
  holding_id uuid not null references holdings(id) on delete cascade,
  farm_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  area_ha numeric(12,4) check (area_ha is null or area_ha >= 0),
  sigpac_reference text,
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  irrigation_type text check (irrigation_type is null or irrigation_type in ('dryland', 'irrigated', 'mixed', 'unknown')),
  olive_tree_count integer check (olive_tree_count is null or olive_tree_count >= 0),
  notes text,
  active boolean not null default true,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, holding_id),
  foreign key (farm_id, holding_id) references farms(id, holding_id) on delete cascade
);

create index plots_holding_farm_idx on plots(holding_id, farm_id, active);

create table campaigns (
  id uuid primary key,
  holding_id uuid not null references holdings(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  season_start_year integer not null check (season_start_year between 2000 and 2200),
  season_end_year integer not null check (season_end_year = season_start_year + 1),
  start_date date,
  end_date date,
  status text not null default 'active' check (status in ('planned', 'active', 'closed', 'archived')),
  notes text,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, holding_id),
  unique (holding_id, season_start_year, season_end_year),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create index campaigns_holding_status_idx on campaigns(holding_id, status);

create table cooperatives (
  id uuid primary key,
  official_name text not null check (length(trim(official_name)) > 0),
  municipality text,
  province text,
  address text,
  phone text,
  website_url text,
  source_url text,
  source_checked_at timestamptz,
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'verified', 'stale')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cooperatives_location_idx on cooperatives(province, municipality);

create table deliveries (
  id uuid primary key,
  holding_id uuid not null references holdings(id) on delete cascade,
  campaign_id uuid not null,
  farm_id uuid,
  plot_id uuid,
  cooperative_id uuid references cooperatives(id) on delete set null,
  custom_destination text,
  delivered_at timestamptz not null,
  kilograms numeric(14,3) not null check (kilograms > 0),
  variety text,
  ticket_number text,
  source_kind text not null default 'manual' check (source_kind in ('manual', 'document', 'file', 'provider_sync')),
  external_source text,
  external_id text,
  verification_status text not null default 'confirmed' check (verification_status in ('draft', 'confirmed', 'conflict', 'archived')),
  notes text,
  created_by text not null,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, holding_id),
  foreign key (campaign_id, holding_id) references campaigns(id, holding_id) on delete restrict,
  foreign key (farm_id, holding_id) references farms(id, holding_id) on delete restrict,
  foreign key (plot_id, holding_id) references plots(id, holding_id) on delete restrict,
  check (cooperative_id is not null or nullif(trim(custom_destination), '') is not null)
);

create index deliveries_campaign_date_idx on deliveries(holding_id, campaign_id, delivered_at desc);
create index deliveries_plot_idx on deliveries(holding_id, plot_id) where plot_id is not null;
create unique index deliveries_external_identity_uq
  on deliveries(holding_id, external_source, external_id)
  where external_source is not null and external_id is not null;

create table delivery_results (
  id uuid primary key,
  holding_id uuid not null references holdings(id) on delete cascade,
  delivery_id uuid not null,
  result_type text not null default 'fat_yield' check (result_type in ('fat_yield')),
  value numeric(8,4) not null check (value >= 0 and value <= 100),
  unit text not null default 'percent' check (unit in ('percent')),
  measured_at timestamptz,
  source_kind text not null default 'manual' check (source_kind in ('manual', 'document', 'file', 'provider_sync')),
  external_source text,
  external_id text,
  status text not null default 'current' check (status in ('current', 'superseded', 'conflict')),
  notes text,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, holding_id),
  foreign key (delivery_id, holding_id) references deliveries(id, holding_id) on delete cascade
);

create unique index delivery_results_one_current_uq
  on delivery_results(holding_id, delivery_id, result_type)
  where status = 'current';

create index delivery_results_delivery_idx on delivery_results(holding_id, delivery_id);

create table documents (
  id uuid primary key,
  holding_id uuid not null references holdings(id) on delete cascade,
  object_key text not null unique,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  sha256 char(64),
  document_type text not null default 'other' check (document_type in ('ticket', 'delivery_note', 'yield_report', 'invoice', 'settlement', 'photo', 'other')),
  uploaded_by text not null,
  created_at timestamptz not null default now(),
  unique (id, holding_id)
);

create index documents_holding_type_idx on documents(holding_id, document_type, created_at desc);

create table document_links (
  document_id uuid not null,
  holding_id uuid not null,
  entity_type text not null check (entity_type in ('holding', 'farm', 'plot', 'campaign', 'delivery', 'delivery_result', 'activity')),
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (document_id, entity_type, entity_id),
  foreign key (document_id, holding_id) references documents(id, holding_id) on delete cascade
);

create index document_links_entity_idx on document_links(holding_id, entity_type, entity_id);

create table idempotency_keys (
  actor_user_id text not null,
  idempotency_key text not null,
  route text not null,
  request_hash char(64) not null,
  status_code integer,
  response_body jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (actor_user_id, idempotency_key)
);

create index idempotency_keys_expiry_idx on idempotency_keys(expires_at);
