# Android Home ↔ Weather Bridge V1

This branch defines the compile-time contract between the canonical Home dashboard and the existing Weather module.

## Goal

Home must consume Weather without:

- creating another weather client;
- knowing Supabase;
- knowing AEMET transport details;
- duplicating Weather cache or freshness logic.

## Existing Weather owner

The existing Weather module already owns:

- `WeatherRepository.loadForecast(municipalityCode)`;
- local forecast cache;
- live/degraded delivery semantics;
- freshness;
- provider attribution;
- municipality selection/preferences;
- radar;
- weather alerts.

Home must reuse that module.

## Home contract

`HomeWeatherSummarySource` returns a compact `HomeWeatherSummary`.

The Home card supports:

- pending integration;
- loading;
- ready;
- error;
- degraded/cache state.

If no source is injected, Home remains fully functional and shows an explicit pending state.

## Adapter mapping after Weather convergence

The adapter should call the existing `WeatherRepository` and map one `WeatherLoadResult`:

- `forecast.municipality.name` → municipality name;
- first `forecast.days` item → sky/min/max/rain;
- `forecast.attribution` → provider label;
- `result.degraded` → degraded state;
- `forecast.freshnessStatus` + age → freshness label.

The municipality code should come from the Weather preference owner when available, otherwise from `MaginaWeatherMunicipalities.default`.

Do not move this preference into Home.

## Expected implementation after module merge

Conceptually:

```kotlin
class WeatherRepositoryHomeSummarySource(
    private val repository: WeatherRepository,
    private val municipalityCode: () -> String,
) : HomeWeatherSummarySource {
    override suspend fun loadSummary(): Result<HomeWeatherSummary> =
        repository.loadForecast(municipalityCode()).map { result ->
            val forecast = result.forecast
            val today = forecast.days.firstOrNull()
            HomeWeatherSummary(
                municipalityName = forecast.municipality.name,
                skyDescription = today?.skyDescription,
                temperatureMinC = today?.temperatureMinC,
                temperatureMaxC = today?.temperatureMaxC,
                precipitationProbabilityPercent = today?.precipitationProbabilityPercent,
                providerLabel = forecast.attribution,
                freshnessLabel = /* map canonical freshness */,
                degraded = result.degraded,
            )
        }
}
```

The actual adapter should be added only once Weather exists on the convergence branch so it compiles against the canonical Weather types.

## Guardrails

- no network calls directly from Home UI;
- no duplicate SharedPreferences weather cache;
- no fake weather values;
- no second municipality preference;
- offline/cache semantics remain owned by Weather;
- Home only renders a summary.

## Integration point

After PR #191 Weather convergence is resolved, `MaginaOlivoRoot` can obtain the existing Weather repository from `MaginaOlivoApplication`, wrap it with the adapter, and pass it to:

`MaginaAppShell(weatherSource = ...)`.

Until then, the parameter remains optional.
