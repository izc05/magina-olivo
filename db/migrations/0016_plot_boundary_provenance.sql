alter table plots
  add column boundary_external_id text,
  add column boundary_source_checked_at timestamptz;

comment on column plots.boundary_external_id is
  'Provider feature identifier for a verified official boundary source, e.g. FEGA SIGPAC featureId.';

comment on column plots.boundary_source_checked_at is
  'Timestamp when the official external boundary source was independently checked by the backend.';

-- Versions before verified provenance allowed the client to label a boundary as
-- SIGPAC/Catastro without an independently checked provider feature id. Preserve
-- the geometry but downgrade that unverifiable label before enforcing the new rule.
update plots
set boundary_source = 'imported'
where boundary_source in ('sigpac', 'catastro')
  and boundary_external_id is null;

alter table plots
  add constraint plots_boundary_provenance_chk check (
    (boundary_source in ('sigpac', 'catastro') and boundary_external_id is not null and boundary_source_checked_at is not null)
    or
    (boundary_source is null and boundary_external_id is null and boundary_source_checked_at is null)
    or
    (boundary_source in ('manual_map', 'manual_gps', 'imported') and boundary_external_id is null and boundary_source_checked_at is null)
  );
