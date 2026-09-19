# Android Home Weather Alert Summary V1

This slice replaces the static Home alerts placeholder with a read-only summary produced from the existing Weather alert engine.

## Ownership

Weather remains the owner of:
- forecast loading and offline cache;
- municipality selection;
- rain, wind and frost thresholds;
- `WeatherPlanningAlertEngine`;
- notification delivery and deduplication.

Home only renders a compact summary.

## Data flow

`WeatherRepositoryHomeAlertSummarySource`:
1. reads the existing `RainAlertSettings` through an injected provider;
2. loads the forecast through the existing `WeatherRepository`;
3. evaluates the forecast with `WeatherPlanningAlertEngine`;
4. maps the result to `HomeWeatherAlertSummary`.

No second alert engine, cache, preference store or notification path is introduced.

## Home states

- pending integration;
- loading;
- no active weather alerts;
- active alerts with total and HIGH count;
- primary alert;
- degraded/cache marker;
- error.

## Guardrails

- Do not send notifications from Home.
- Do not change Weather alert thresholds in Home.
- Do not call Supabase/AEMET directly from Home.
- Cached forecasts may be summarized but are visibly marked as cache/degraded.
- Full alert configuration remains inside the Weather screens.
