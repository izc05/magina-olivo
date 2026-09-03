create table public_municipalities (
  slug text primary key check (length(trim(slug)) > 0),
  name text not null check (length(trim(name)) > 0),
  province text not null default 'Jaén',
  aemet_code char(5) not null unique check (aemet_code ~ '^[0-9]{5}$'),
  aliases jsonb not null default '[]'::jsonb,
  source_url text not null,
  checked_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public_municipalities is
  'Verified municipality mapping used by public territorial providers such as AEMET. Localities/pedanias live in aliases and never receive invented AEMET codes.';

insert into public_municipalities (slug, name, aemet_code, aliases, source_url, checked_at)
values
  ('albanchez-de-magina', 'Albanchez de Mágina', '23001', '[]'::jsonb, 'https://www.aemet.es/es/eltiempo/prediccion/municipios/albanchez-de-magina-id23001', '2026-09-03T00:00:00Z'),
  ('bedmar-y-garciez', 'Bedmar y Garcíez', '23902', '["Bedmar","Garcíez"]'::jsonb, 'https://www.aemet.es/es/eltiempo/prediccion/municipios/bedmar-y-garciez-id23902', '2026-09-03T00:00:00Z'),
  ('belmez-de-la-moraleda', 'Bélmez de la Moraleda', '23015', '[]'::jsonb, 'https://www.aemet.es/es/eltiempo/prediccion/municipios/belmez-de-la-moraleda-id23015', '2026-09-03T00:00:00Z'),
  ('cabra-del-santo-cristo', 'Cabra del Santo Cristo', '23017', '[]'::jsonb, 'https://www.aemet.es/es/eltiempo/prediccion/municipios/cabra-del-santo-cristo-id23017', '2026-09-03T00:00:00Z'),
  ('cambil', 'Cambil', '23018', '["Arbuniel"]'::jsonb, 'https://www.aemet.es/es/eltiempo/prediccion/municipios/cambil-id23018', '2026-09-03T00:00:00Z'),
  ('campillo-de-arenas', 'Campillo de Arenas', '23019', '[]'::jsonb, 'https://www.aemet.es/es/eltiempo/prediccion/municipios/campillo-de-arenas-id23019', '2026-09-03T00:00:00Z'),
  ('guardia-de-jaen', 'La Guardia de Jaén', '23038', '["Guardia de Jaén, La"]'::jsonb, 'https://www.aemet.es/es/eltiempo/prediccion/municipios/guardia-de-jaen-la-id23038', '2026-09-03T00:00:00Z'),
  ('huelma', 'Huelma', '23044', '["Solera"]'::jsonb, 'https://www.aemet.es/es/eltiempo/prediccion/municipios/huelma-id23044', '2026-09-03T00:00:00Z'),
  ('jimena', 'Jimena', '23052', '[]'::jsonb, 'https://www.aemet.es/es/eltiempo/prediccion/municipios/jimena-id23052', '2026-09-03T00:00:00Z'),
  ('jodar', 'Jódar', '23053', '[]'::jsonb, 'https://www.aemet.es/es/eltiempo/prediccion/municipios/jodar-id23053', '2026-09-03T00:00:00Z'),
  ('mancha-real', 'Mancha Real', '23058', '[]'::jsonb, 'https://www.aemet.es/es/eltiempo/prediccion/municipios/mancha-real-id23058', '2026-09-03T00:00:00Z'),
  ('pegalajar', 'Pegalajar', '23067', '[]'::jsonb, 'https://www.aemet.es/es/eltiempo/prediccion/municipios/pegalajar-id23067', '2026-09-03T00:00:00Z'),
  ('torres', 'Torres', '23090', '[]'::jsonb, 'https://www.aemet.es/es/eltiempo/prediccion/municipios/torres-id23090', '2026-09-03T00:00:00Z'),
  ('carcheles', 'Cárcheles', '23901', '["Carchelejo","Cárchel"]'::jsonb, 'https://www.aemet.es/es/eltiempo/prediccion/municipios/carcheles-carchelejo-id23901', '2026-09-03T00:00:00Z')
on conflict (slug) do update set
  name = excluded.name,
  province = excluded.province,
  aemet_code = excluded.aemet_code,
  aliases = excluded.aliases,
  source_url = excluded.source_url,
  checked_at = excluded.checked_at,
  active = true,
  updated_at = now();
