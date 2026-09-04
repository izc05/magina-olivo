create table plot_sigpac_recintos (
  id uuid primary key,
  holding_id uuid not null,
  plot_id uuid not null,
  sigpac_recinto_id text not null check (sigpac_recinto_id ~ '^[0-9]{1,20}$'),
  provincia integer,
  municipio integer,
  agregado integer,
  zona integer,
  poligono integer,
  parcela integer,
  recinto integer,
  uso_sigpac text,
  surface_m2 numeric(16,3) check (surface_m2 is null or surface_m2 >= 0),
  geometry_geojson jsonb not null,
  source_checked_at timestamptz not null,
  active boolean not null default true,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (plot_id, holding_id) references plots(id, holding_id) on delete cascade,
  check (jsonb_typeof(geometry_geojson) = 'object')
);

create index plot_sigpac_recintos_plot_idx
  on plot_sigpac_recintos(holding_id, plot_id, active, created_at desc);

create unique index plot_sigpac_recintos_active_uq
  on plot_sigpac_recintos(holding_id, plot_id, sigpac_recinto_id)
  where active = true;

comment on table plot_sigpac_recintos is
  'Verified SIGPAC recinto associations explicitly selected for a private working plot. They coexist with, and never replace, the plot Catastro boundary.';

comment on column plot_sigpac_recintos.geometry_geojson is
  'Server-refetched SIGPAC geometry snapshot used for display and offline context; it is not the plots.boundary_geojson authority.';
