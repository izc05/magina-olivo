alter table user_preferences
  add column weather_rain_probability_percent_threshold numeric(6,2) not null default 60
    check (weather_rain_probability_percent_threshold >= 0 and weather_rain_probability_percent_threshold <= 100);

comment on column user_preferences.weather_rain_probability_percent_threshold is
  'Minimum AEMET daily precipitation probability percentage used by the V1 contextual weather alert. The legacy weather_rain_mm_threshold is retained for compatibility but is not used for this alert because the current AEMET adapter does not expose accumulated precipitation in millimetres.';
