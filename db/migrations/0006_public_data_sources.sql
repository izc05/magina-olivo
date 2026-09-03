create table public_data_sources (
  source_key text primary key check (length(trim(source_key)) > 0),
  label text not null check (length(trim(label)) > 0),
  provider text not null check (length(trim(provider)) > 0),
  source_url text not null check (length(trim(source_url)) > 0),
  license_label text,
  update_frequency text,
  active boolean not null default true,
  source_updated_at timestamptz,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public_source_snapshots (
  id uuid primary key,
  source_key text not null references public_data_sources(source_key) on delete cascade,
  content_sha256 char(64) not null,
  source_updated_at timestamptz,
  fetched_at timestamptz not null default now(),
  parser_version text,
  record_count integer check (record_count is null or record_count >= 0),
  raw_object_key text,
  status text not null default 'downloaded'
    check (status in ('downloaded', 'parsed', 'failed', 'superseded')),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  unique (source_key, content_sha256)
);

create index public_source_snapshots_source_time_idx
  on public_source_snapshots(source_key, fetched_at desc);

insert into public_data_sources (
  source_key, label, provider, source_url, license_label, update_frequency,
  source_updated_at, last_checked_at, metadata
)
values
  (
    'dop-sierra-magina-destinations',
    'Directorio de almazaras y envasadoras DOP Sierra Mágina',
    'DOP Sierra Mágina',
    'https://sierramagina.org/almazaras-envasadoras/',
    null,
    'manual review',
    null,
    '2026-09-02T00:00:00Z',
    '{"scope":"23 public entities","usage":"directory"}'::jsonb
  ),
  (
    'aemet-municipality-forecast',
    'Predicción por municipios',
    'AEMET OpenData',
    'https://opendata.aemet.es/',
    'Reutilización autorizada citando a AEMET',
    'continuous',
    null,
    '2026-09-03T00:00:00Z',
    '{"usage":"weather","credential":"server-side API key"}'::jsonb
  ),
  (
    'raif-olivar-observations',
    'Seguimiento de plagas y enfermedades — Olivar Andalucía',
    'RAIF · Junta de Andalucía',
    'https://www.juntadeandalucia.es/datosabiertos/portal/dataset/raif',
    'CC BY 4.0',
    'weekly',
    '2026-08-31T00:00:00Z',
    '2026-09-03T00:00:00Z',
    '{"crop":"olivar","coverage":"Andalucía","ingestion":"periodic snapshot"}'::jsonb
  )
on conflict (source_key) do update set
  label = excluded.label,
  provider = excluded.provider,
  source_url = excluded.source_url,
  license_label = excluded.license_label,
  update_frequency = excluded.update_frequency,
  source_updated_at = excluded.source_updated_at,
  last_checked_at = excluded.last_checked_at,
  metadata = excluded.metadata,
  updated_at = now();
