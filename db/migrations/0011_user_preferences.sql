create table user_preferences (
  user_id text primary key,
  preferred_cooperative_id uuid references cooperatives(id) on delete set null,
  notify_weather boolean not null default true,
  notify_tasks boolean not null default true,
  notify_pending_yield boolean not null default true,
  weather_rain_mm_threshold numeric(8,2) not null default 5 check (weather_rain_mm_threshold >= 0 and weather_rain_mm_threshold <= 500),
  weather_frost_c_threshold numeric(6,2) not null default 0 check (weather_frost_c_threshold >= -50 and weather_frost_c_threshold <= 20),
  weather_wind_kmh_threshold numeric(8,2) not null default 50 check (weather_wind_kmh_threshold >= 0 and weather_wind_kmh_threshold <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table user_preferences is
  'Per-user UI/notification preferences. Agricultural records remain scoped by holding; this table must not become a second source of agricultural truth.';

comment on column user_preferences.preferred_cooperative_id is
  'Convenience preference for the public destination directory; it does not grant the cooperative access to private holding data.';
