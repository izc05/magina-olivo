alter table plots
  add column boundary_geojson jsonb,
  add column boundary_area_ha numeric(12,4) check (boundary_area_ha is null or boundary_area_ha >= 0),
  add column boundary_source text check (
    boundary_source is null or boundary_source in ('manual_map', 'manual_gps', 'imported', 'sigpac', 'catastro')
  ),
  add column boundary_updated_at timestamptz;

alter table plots
  add constraint plots_boundary_geojson_object_chk check (
    boundary_geojson is null or jsonb_typeof(boundary_geojson) = 'object'
  );

comment on column plots.boundary_geojson is
  'Private WGS84 GeoJSON Polygon for the working plot boundary. Administrative source is tracked separately.';

comment on column plots.boundary_area_ha is
  'Deterministic backend-calculated area from boundary_geojson; does not overwrite declared area_ha.';
