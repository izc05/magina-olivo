insert into public_data_sources (
  source_key, label, provider, source_url, update_frequency,
  source_updated_at, last_checked_at, metadata
)
values (
  'junta-agriculture-news',
  'Noticias de Agricultura, Pesca, Agua y Desarrollo Rural',
  'Junta de Andalucía',
  'https://www.juntadeandalucia.es/organismos/agriculturapescaaguaydesarrollorural/servicios/actualidad/noticias.html',
  'verified curated import',
  '2026-09-02T00:00:00Z',
  '2026-09-03T00:00:00Z',
  '{"usage":"news","ingestion":"verified-curated","automation":"official Atom endpoint pending validation","contentPolicy":"metadata-only"}'::jsonb
)
on conflict (source_key) do update set
  label = excluded.label,
  provider = excluded.provider,
  source_url = excluded.source_url,
  update_frequency = excluded.update_frequency,
  source_updated_at = excluded.source_updated_at,
  last_checked_at = excluded.last_checked_at,
  metadata = excluded.metadata,
  updated_at = now();

create table if not exists public_news_items (
  id uuid primary key,
  source_key text not null references public_data_sources(source_key) on delete cascade,
  external_id text not null check (length(trim(external_id)) > 0),
  title text not null check (length(trim(title)) > 0),
  source_url text not null check (length(trim(source_url)) > 0),
  published_at timestamptz not null,
  topic text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_key, external_id),
  unique (source_url)
);

create index if not exists public_news_items_published_idx
  on public_news_items(published_at desc)
  where active = true;

insert into public_news_items (
  id, source_key, external_id, title, source_url, published_at, topic, metadata
)
values
  (
    '68183800-0000-4000-8000-000000000001',
    'junta-agriculture-news',
    '681838',
    'Andalucía pide al Ministerio adoptar medidas que eviten la distorsión del mercado del aceite de oliva',
    'https://www.juntadeandalucia.es/organismos/agriculturapescaaguaydesarrollorural/servicios/actualidad/noticias/detalle/681838.html',
    '2026-09-02T00:00:00Z',
    'mercado-aceite',
    '{"verification":"official-page"}'::jsonb
  ),
  (
    '68159800-0000-4000-8000-000000000002',
    'junta-agriculture-news',
    '681598',
    'Junta y sector trabajan de la mano en un documento remitido por Agricultura sobre el modelo de PAC nacional',
    'https://www.juntadeandalucia.es/organismos/agriculturapescaaguaydesarrollorural/servicios/actualidad/noticias/detalle/681598.html',
    '2026-09-01T00:00:00Z',
    'pac-olivar',
    '{"verification":"official-page"}'::jsonb
  ),
  (
    '68122000-0000-4000-8000-000000000003',
    'junta-agriculture-news',
    '681220',
    'El valor de las exportaciones agroalimentarias alcanza los 9.326 M€ en el primer semestre de 2026',
    'https://www.juntadeandalucia.es/organismos/agriculturapescaaguaydesarrollorural/servicios/actualidad/noticias/detalle/681220.html',
    '2026-08-28T00:00:00Z',
    'exportaciones-aove',
    '{"verification":"official-page"}'::jsonb
  ),
  (
    '68043400-0000-4000-8000-000000000004',
    'junta-agriculture-news',
    '680434',
    'El 86% de las medidas de la Estrategia Andaluza del Olivar están ejecutadas o en fase de desarrollo',
    'https://www.juntadeandalucia.es/organismos/agriculturapescaaguaydesarrollorural/servicios/actualidad/noticias/detalle/680434.html',
    '2026-08-18T00:00:00Z',
    'estrategia-olivar',
    '{"verification":"official-page"}'::jsonb
  )
on conflict (source_key, external_id) do update set
  title = excluded.title,
  source_url = excluded.source_url,
  published_at = excluded.published_at,
  topic = excluded.topic,
  metadata = excluded.metadata,
  active = true,
  updated_at = now();
