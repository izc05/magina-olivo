create table activities (
  id uuid primary key,
  holding_id uuid not null references holdings(id) on delete cascade,
  campaign_id uuid,
  farm_id uuid,
  plot_id uuid,
  activity_type text not null check (
    activity_type in (
      'treatment',
      'fertilization',
      'pruning',
      'mowing',
      'tillage',
      'irrigation',
      'harvest',
      'maintenance',
      'planting',
      'sampling',
      'observation',
      'other'
    )
  ),
  occurred_at timestamptz not null,
  affected_area_ha numeric(12,4) check (affected_area_ha is null or affected_area_ha >= 0),
  product_name text,
  product_registration_number text,
  quantity numeric(14,4) check (quantity is null or quantity >= 0),
  quantity_unit text,
  cost_eur numeric(14,2) check (cost_eur is null or cost_eur >= 0),
  notes text,
  source_kind text not null default 'manual' check (source_kind in ('manual', 'document', 'file', 'provider_sync')),
  verification_status text not null default 'confirmed' check (verification_status in ('draft', 'confirmed', 'conflict', 'archived')),
  created_by text not null,
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, holding_id),
  foreign key (campaign_id, holding_id) references campaigns(id, holding_id) on delete restrict,
  foreign key (farm_id, holding_id) references farms(id, holding_id) on delete restrict,
  foreign key (plot_id, holding_id) references plots(id, holding_id) on delete restrict,
  check (farm_id is not null or plot_id is null),
  check (nullif(trim(product_registration_number), '') is null or activity_type = 'treatment')
);

create index activities_holding_date_idx
  on activities(holding_id, occurred_at desc)
  where verification_status <> 'archived';

create index activities_plot_date_idx
  on activities(holding_id, plot_id, occurred_at desc)
  where plot_id is not null and verification_status <> 'archived';

create index activities_campaign_date_idx
  on activities(holding_id, campaign_id, occurred_at desc)
  where campaign_id is not null and verification_status <> 'archived';

comment on table activities is
  'Personal operational field notebook. It is not an official CUE/SIEX submission record in V1.';

comment on column activities.product_registration_number is
  'Optional future-friendly phytosanitary product registration reference. No official validation is implied by storage alone.';
