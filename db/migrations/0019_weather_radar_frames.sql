create table weather_radar_frames (
  id uuid primary key,
  captured_at timestamptz not null default now(),
  image_sha256 text not null unique
    check (image_sha256 ~ '^[0-9a-f]{64}$'),
  content_type text not null
    check (content_type in ('image/png', 'image/gif', 'image/jpeg', 'image/webp')),
  image_data bytea not null,
  provider text not null default 'AEMET OpenData',
  source_product text not null default 'national-radar-composite',
  created_at timestamptz not null default now()
);

create index weather_radar_frames_captured_idx
  on weather_radar_frames (captured_at desc, id desc);

comment on table weather_radar_frames is
  'Short-lived AEMET radar snapshots used to animate recent precipitation movement. Radar reflectivity is not a satellite cloud layer or a parcel-level diagnosis.';
