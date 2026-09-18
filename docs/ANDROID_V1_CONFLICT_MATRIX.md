# Android V1 — Integration Conflict Matrix

This document describes how to reconcile the shared files between:

- base: `feat/android-sync-gate-d-v1`
- incoming: `feat/android-weather-v1`
- target: `integration/android-v1`

The goal is to preserve both offline-first synchronization and Weather behavior.

## Summary

Most Weather work is additive. The actual semantic integration surface is small.

| File | Sync must preserve | Weather must add | Resolution |
| --- | --- | --- | --- |
| `MaginaOlivoApplication.kt` | Room migration 1→2, `FieldSyncScheduler`, WorkManager scheduling, repository outbox wiring | notification channel, rain-alert scheduling, Weather repositories | Build one combined initializer. Never replace the Sync database/repository block with the older Weather version. |
| `MaginaOlivoApp.kt` | current farms/plots flow, Catastro map/import flow, local-first repository | Weather route/screen and entry point | Add Weather navigation to the Sync version. Keep Catastro flow unchanged. |
| `AndroidManifest.xml` | INTERNET + location permissions and application/activity declarations | `POST_NOTIFICATIONS` | Add notification permission; preserve everything else. |
| `app/build.gradle.kts` | current dependencies and BuildConfig | none; files currently match | No semantic merge required. Keep current integration version. |
| `gradle/libs.versions.toml` | current versions/catalog | none; files currently match | No semantic merge required. |
| `supabase/config.toml` | Catastro function with JWT verification | weather-forecast, weather-radar, private radar bucket | Append Weather blocks; do not weaken Catastro JWT verification. |

## MaginaOlivoApplication.kt

The Sync version is authoritative for persistence and field writes because it contains:

- `MIGRATION_1_2`;
- `FieldSyncScheduler`;
- conditional `WorkManagerFieldSyncScheduler`;
- `fieldWriteDao`;
- `syncScheduler` injection into `LocalFieldRepository`;
- startup scheduling only when Supabase is configured.

Weather must be layered on top:

- `WeatherAlertNotifier.createChannel(this)`;
- `WeatherRainAlertScheduler.ensureScheduled(this)`;
- `weatherRepository`;
- `weatherRadarRepository`.

### Required combined startup

Conceptually:

1. initialize MapLibre;
2. create the Weather notification channel;
3. schedule Weather alert work according to its own safe scheduler;
4. schedule field sync only when Supabase is configured.

Do not create duplicate Supabase clients or replace the single `SupabaseProvider`.

## Room database

The Weather branch currently builds Room without `.addMigrations(MIGRATION_1_2)`.

That must **not** overwrite the Sync implementation.

The integrated database must preserve:

```kotlin
.addMigrations(MaginaOlivoDatabase.MIGRATION_1_2)
```

Otherwise existing Gate D local databases could fail or lose the validated migration path.

## LocalFieldRepository

The Weather branch uses the earlier constructor with only:

- `farmDao`;
- `plotDao`.

The integrated application must preserve the Gate D constructor including:

- `fieldWriteDao`;
- `syncScheduler`.

Weather does not need to modify `LocalFieldRepository` to read farms for forecast assignment.

## MaginaOlivoApp.kt

Use the Sync version as the structural base.

Add only the Weather pieces:

- import `WeatherScreen`;
- `showWeather` state;
- the Weather screen branch;
- the Weather entry button/navigation destination.

Do not replace the Catastro map/import state machine.

This is temporary wiring. The canonical visual navigation will later replace these development buttons, so convergence should avoid unnecessary UI redesign here.

## AndroidManifest.xml

Add:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

Runtime permission UX must remain appropriate for Android versions that require it. Merely declaring the permission is not proof that alert UX is complete.

## Gradle files

As of the comparison performed during Android V1 preparation:

- `app/build.gradle.kts` is identical between Sync and Weather;
- `gradle/libs.versions.toml` is identical between Sync and Weather.

Treat merge conflicts in these files as historical noise unless the source branches move again.

Recompare before the final integration.

## Supabase config

Preserve:

```toml
[functions.catastro-map]
verify_jwt = true
```

Add:

```toml
[functions.weather-forecast]
verify_jwt = true

[functions.weather-radar]
verify_jwt = true

[storage.buckets.weather-radar]
public = false
file_size_limit = "5MiB"
allowed_mime_types = ["image/png", "image/gif", "image/jpeg", "image/webp"]
```

No public radar bucket and no weakening of JWT requirements.

## Verification after semantic merge

The convergence is not complete until all of the following hold:

- Gate D unit tests remain green;
- Weather unit tests remain green;
- Android debug build succeeds;
- Room migration remains configured;
- local field writes still enqueue Sync outbox work;
- Weather repositories initialize without a configured remote backend;
- Weather cache/offline behavior remains available;
- field sync and Weather workers do not create an initialization loop;
- notification permission behavior is verified on a real Android device;
- no service-role key is present in Android;
- Catastro import continues to save local geometry without requiring Weather.

## Current decision

PR #191 remains Draft while Catastro/Gate D source work is still closing.

This matrix is preparation, not authorization to bypass source gates or merge unfinished feature work.
