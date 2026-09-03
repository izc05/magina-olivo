insert into public_data_sources (
  source_key, label, provider, source_url, license_label, update_frequency,
  source_updated_at, last_checked_at, metadata
)
values (
  'observatorio-agricultural-prices',
  'Precios agrarios en el Observatorio de Precios y Mercados',
  'Observatorio de Precios y Mercados · Junta de Andalucía',
  'https://ws142.juntadeandalucia.es/agriculturaypesca/opendata/prb/',
  'CC BY 4.0',
  'daily (catalog declaration)',
  null,
  '2026-09-03T00:00:00Z',
  '{
    "formats":["CSV","JSON"],
    "weeklyCsv":"https://ws142.juntadeandalucia.es/agriculturaypesca/opendata/prb/SEMANAL.csv",
    "weeklyJson":"https://ws142.juntadeandalucia.es/agriculturaypesca/opendata/prb/SEMANAL_0.js",
    "currentness":"requires-staging-verification",
    "latestEditorialOilPublication":"Informe semanal de aceite. Semana 35",
    "latestEditorialOilPublicationDate":"2026-09-02",
    "usage":"market-context-not-member-settlement"
  }'::jsonb
)
on conflict (source_key) do update set
  label = excluded.label,
  provider = excluded.provider,
  source_url = excluded.source_url,
  license_label = excluded.license_label,
  update_frequency = excluded.update_frequency,
  last_checked_at = excluded.last_checked_at,
  metadata = excluded.metadata,
  updated_at = now();

comment on table public_data_sources is
  'Registry of public information sources. A registered source is not automatically trusted as fresh; metadata/currentness and snapshot checks gate product use.';
