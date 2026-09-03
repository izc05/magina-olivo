create table weather_alert_events (
  id uuid primary key,
  user_id text not null,
  holding_id uuid not null references holdings(id) on delete cascade,
  kind text not null check (kind in ('rain')),
  status text not null default 'active' check (status in ('active', 'resolved')),
  municipality_slug text not null references public_municipalities(slug),
  forecast_date date not null,
  precipitation_probability_percent numeric(6,2) not null
    check (precipitation_probability_percent >= 0 and precipitation_probability_percent <= 100),
  threshold_percent numeric(6,2) not null
    check (threshold_percent >= 0 and threshold_percent <= 100),
  provider text not null,
  provider_elaborated_at timestamptz,
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, holding_id, kind, forecast_date)
);

create index weather_alert_events_user_active_idx
  on weather_alert_events (user_id, forecast_date, last_detected_at desc)
  where status = 'active';

comment on table weather_alert_events is
  'Server-generated contextual weather alerts. V1 stores rain alerts derived from AEMET daily municipal precipitation probability; these are not official AEMET warning levels nor parcel-level diagnoses.';
