create table public_growth_daily (
  bucket_date date not null,
  event text not null,
  route text not null,
  channel text not null default '',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  referrer_category text not null,
  event_count bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint public_growth_daily_event_check check (
    event in ('public_page_view', 'share_started', 'share_completed')
  ),
  constraint public_growth_daily_route_check check (
    route in (
      '/magina',
      '/magina/mercado',
      '/magina/tiempo',
      '/magina/campo',
      '/magina/noticias',
      '/magina/directorio'
    )
  ),
  constraint public_growth_daily_channel_check check (
    channel in ('', 'native', 'whatsapp', 'copy')
  ),
  constraint public_growth_daily_referrer_check check (
    referrer_category in ('direct', 'google', 'bing', 'social', 'other')
  ),
  constraint public_growth_daily_utm_source_length check (char_length(utm_source) <= 80),
  constraint public_growth_daily_utm_medium_length check (char_length(utm_medium) <= 80),
  constraint public_growth_daily_utm_campaign_length check (char_length(utm_campaign) <= 80),
  constraint public_growth_daily_utm_source_format check (utm_source ~ '^[A-Za-z0-9._-]*$'),
  constraint public_growth_daily_utm_medium_format check (utm_medium ~ '^[A-Za-z0-9._-]*$'),
  constraint public_growth_daily_utm_campaign_format check (utm_campaign ~ '^[A-Za-z0-9._-]*$'),
  constraint public_growth_daily_event_count_check check (event_count > 0),
  primary key (
    bucket_date,
    event,
    route,
    channel,
    utm_source,
    utm_medium,
    utm_campaign,
    referrer_category
  )
);

comment on table public_growth_daily is
  'Privacy-first daily aggregate counters for public Growth V1. No visitor, account, IP, session or farm identifiers.';

create index public_growth_daily_bucket_date_idx
  on public_growth_daily (bucket_date desc);
