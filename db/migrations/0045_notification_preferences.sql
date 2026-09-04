alter table user_preferences
  add column if not exists notify_field_alerts boolean not null default true,
  add column if not exists notify_rewards boolean not null default true,
  add column if not exists notify_market boolean not null default false,
  add column if not exists notify_news boolean not null default true;

comment on column user_preferences.notify_field_alerts is
  'Controls in-app field-source alerts. It does not authorize parcel-level treatment recommendations.';

comment on column user_preferences.notify_rewards is
  'Controls loyalty/reward lifecycle notices such as expiry, pickup confirmation and olive refunds.';

comment on column user_preferences.notify_market is
  'Preference reserved for verified market-change notices. Disabled by default until structured current prices are available.';

comment on column user_preferences.notify_news is
  'Controls important verified news notices. It is a product preference and not marketing consent.';
