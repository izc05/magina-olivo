-- Persist the bounded AEMET daily forecast cache across API restarts/releases.
-- It contains only public municipal forecasts, never holding or user data.
create table if not exists public_weather_forecast_cache (
  municipality_slug text primary key references public_municipalities(slug) on delete cascade,
  forecast jsonb not null,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists public_weather_forecast_cache_fetched_at_idx
  on public_weather_forecast_cache (fetched_at desc);
