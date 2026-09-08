insert into public_municipalities (slug, name, aemet_code, aliases, source_url, checked_at)
values (
  'larva',
  'Larva',
  '23054',
  '[]'::jsonb,
  'https://www.aemet.es/es/eltiempo/prediccion/municipios/larva-id23054',
  '2026-09-08T00:00:00Z'
)
on conflict (slug) do update set
  name = excluded.name,
  province = excluded.province,
  aemet_code = excluded.aemet_code,
  aliases = excluded.aliases,
  source_url = excluded.source_url,
  checked_at = excluded.checked_at,
  active = true,
  updated_at = now();
