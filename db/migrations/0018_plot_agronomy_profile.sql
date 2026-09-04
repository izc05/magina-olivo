alter table plots
  add column olive_variety text;

alter table plots
  add constraint plots_olive_variety_chk check (
    olive_variety is null
    or (length(trim(olive_variety)) between 1 and 80)
  );

comment on column plots.olive_variety is
  'User-declared olive variety or mixture for this private plot. It is not sourced from Catastro or SIGPAC.';
