create index farms_owner_id_idx
  on public.farms(owner_id);

create index plots_farm_owner_fk_idx
  on public.plots(farm_id, owner_id);
