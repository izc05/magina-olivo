create table public.farms (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  cover_image_uri text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.plots (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  farm_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  cadastral_reference text,
  area_ha double precision check (area_ha is null or area_ha >= 0),
  boundary_geojson jsonb,
  boundary_source text check (
    boundary_source is null or boundary_source in (
      'catastro','sigpac','manual_map','manual_gps','imported'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plots_farm_owner_fk
    foreign key (farm_id, owner_id)
    references public.farms(id, owner_id)
    on delete cascade,
  constraint plots_cadastral_reference_format
    check (
      cadastral_reference is null or
      cadastral_reference ~ '^[A-Z0-9]{14}$'
    )
);

create unique index plots_owner_cadastral_reference_uq
  on public.plots(owner_id, cadastral_reference)
  where cadastral_reference is not null;

create index plots_owner_farm_idx
  on public.plots(owner_id, farm_id);

alter table public.farms enable row level security;
alter table public.plots enable row level security;

revoke all on table public.farms from anon;
revoke all on table public.plots from anon;
grant select, insert, update, delete on table public.farms to authenticated;
grant select, insert, update, delete on table public.plots to authenticated;

create policy farms_select_own
  on public.farms for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy farms_insert_own
  on public.farms for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy farms_update_own
  on public.farms for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy farms_delete_own
  on public.farms for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy plots_select_own
  on public.plots for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy plots_insert_own
  on public.plots for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy plots_update_own
  on public.plots for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy plots_delete_own
  on public.plots for delete
  to authenticated
  using ((select auth.uid()) = owner_id);
