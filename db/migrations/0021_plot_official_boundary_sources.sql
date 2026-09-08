create table plot_official_boundary_sources (
  plot_id uuid not null references plots(id) on delete cascade,
  source text not null check (source in ('catastro', 'sigpac')),
  external_id text not null,
  reference text,
  geometry_geojson jsonb not null,
  calculated_area_ha numeric(12,4) not null check (calculated_area_ha > 0),
  provider_area_m2 numeric(16,2) check (provider_area_m2 is null or provider_area_m2 >= 0),
  provider text not null,
  dataset text not null,
  service text not null,
  source_version text,
  checked_at timestamptz not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (plot_id, source),
  constraint plot_official_boundary_sources_geometry_chk check (
    jsonb_typeof(geometry_geojson) = 'object'
    and geometry_geojson->>'type' in ('Polygon', 'MultiPolygon')
  )
);

create index plot_official_boundary_sources_checked_idx
  on plot_official_boundary_sources (plot_id, checked_at desc);

comment on table plot_official_boundary_sources is
  'Latest independently verified geometry snapshot for each official parcel source. Catastro and SIGPAC are stored simultaneously and never overwrite each other here.';

comment on column plot_official_boundary_sources.calculated_area_ha is
  'Area recalculated by the Magina backend from the verified WGS84 geometry.';

comment on column plot_official_boundary_sources.provider_area_m2 is
  'Area reported by the upstream provider when available; kept separate from backend-calculated area.';

comment on column plot_official_boundary_sources.source_version is
  'Provider dataset/lifespan/campaign version when exposed by the upstream service.';
