# Android UI + Weather Integration V1

This document freezes the intended convergence of the canonical Android UI with the existing Weather module on top of the Catastro + Sync baseline.

## Required coexistence

The convergence branch must preserve all of these at the same time:

### Catastro
- cadastral parcel import and normalized local geometry;
- map screens and gateways;
- Catastro Supabase function registration.

### Sync / Gate D
- Room migration `MIGRATION_1_2`;
- `FieldWriteDao`;
- sync outbox;
- `FieldSyncScheduler` and WorkManager scheduler;
- existing Supabase/RLS sync behavior.

### Weather
- `WeatherRepository` and offline cache;
- Weather forecast and radar gateways;
- radar repository;
- weather alert preferences;
- rain/wind/frost planning alerts;
- notification channel and WorkManager weather scheduler;
- Weather forecast/radar Supabase functions.

### Canonical UI
- onboarding;
- Home dashboard;
- bottom navigation;
- secondary screens;
- Home Weather summary;
- entry from Home to full Weather / Radar / Alerts.

## Ownership rules

- Home never calls Supabase or AEMET directly.
- Weather owns forecast transport, cache, freshness, attribution and municipality preference.
- Sync owns Room migration and field write/outbox scheduling.
- Catastro owns cadastral import and normalized geometry.
- `MaginaOlivoApplication` is the composition point and must combine these responsibilities without replacing one with another.

## Home Weather behavior

`WeatherRepositoryHomeSummarySource` maps the existing `WeatherRepository` result into Home.

Expected states:
- live forecast;
- cached/degraded forecast;
- loading;
- error.

The full Weather screen remains the owner of municipality selection, detailed forecast, radar and alert configuration.

## Supabase configuration

The convergence must preserve:

- `[functions.catastro-map]`;
- `[functions.weather-forecast]`;
- `[functions.weather-radar]`;
- private `weather-radar` storage bucket.

No service-role credential may exist in Android sources.

## Merge rule

This integration is not complete merely because the project compiles.

The dedicated integration gate must pass, along with Android CI and Weather CI. Emulator-backed checks remain evidence for real Android behavior.
