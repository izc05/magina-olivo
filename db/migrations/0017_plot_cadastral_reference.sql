alter table plots
  add column cadastral_reference text;

alter table plots
  add constraint plots_cadastral_reference_chk check (
    cadastral_reference is null or cadastral_reference ~ '^[A-Z0-9]{14}$'
  );

create index plots_cadastral_reference_idx
  on plots (cadastral_reference)
  where cadastral_reference is not null;

comment on column plots.cadastral_reference is
  '14-character national cadastral parcel reference returned by DGC INSPIRE CP when explicitly linked or verified.';
