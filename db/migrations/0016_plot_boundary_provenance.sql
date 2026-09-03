alter table plots
  add column boundary_external_id text,
  add column boundary_source_checked_at timestamptz;

comment on column plots.boundary_external_id is
  'Provider feature identifier for a verified official boundary source, e.g. FEGA SIGPAC featureId.';

comment on column plots.boundary_source_checked_at is
  'Timestamp when the official external boundary source was independently checked by the backend.';

alter table plots
  add constraint plots_boundary_provenance_chk check (
    (boundary_source in ('sigpac', 'catastro') and boundary_external_id is not null and boundary_source_checked_at is not null)
    or
    (boundary_source is null and boundary_external_id is null and boundary_source_checked_at is null)
    or
    (boundary_source in ('manual_map', 'manual_gps', 'imported') and boundary_external_id is null and boundary_source_checked_at is null)
  );
