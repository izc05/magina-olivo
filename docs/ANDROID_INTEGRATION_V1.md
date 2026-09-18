# Android Integration V1

## Purpose

`integration/android-v1` is the controlled convergence branch for the current native Android application.

It is not a replacement for active feature branches and must not be used to interrupt work that is still closing its own gate.

## Current base

The branch starts from `feat/android-sync-gate-d-v1`.

That means the integration baseline already contains:

- native Android project;
- Catastro/map foundation inherited by Gate D;
- Room local persistence;
- offline-first outbox;
- Supabase synchronization foundation;
- RLS-oriented remote model;
- WorkManager synchronization path;
- canonical repository Agent Skills and instructions.

## Pending convergence

Weather is prepared through Draft PR #191:

`feat/android-weather-v1 -> integration/android-v1`

Do not merge that PR only to make the branch look complete. Merge it when the source feature is stable enough and the integration conflicts have been explicitly resolved.

The current semantic reconciliation plan is documented in:

- `docs/ANDROID_V1_CONFLICT_MATRIX.md`

## Known shared integration points

The main files that require deliberate reconciliation between Sync and Weather are:

- `app/src/main/java/com/isivolt/maginaolivo/MaginaOlivoApplication.kt`;
- `app/src/main/java/com/isivolt/maginaolivo/ui/MaginaOlivoApp.kt`;
- `app/src/main/AndroidManifest.xml`;
- `supabase/config.toml`.

The latest comparison found `app/build.gradle.kts` and `gradle/libs.versions.toml` equivalent between the two source branches. Recompare them before the final merge because either source branch may still move.

These files must be merged semantically. Do not resolve conflicts by accepting one side wholesale.

## Gate requirements

Before Android Integration V1 can be proposed as the main development baseline:

1. Catastro source branch has its own closing evidence and no unresolved gate regression.
2. Gate D preserves local-first writes, outbox ordering, retry behavior, RLS isolation and recovery after process restart.
3. Weather preserves forecast/radar/alert behavior, cache semantics and degraded offline state.
4. `Android Convergence Gate` passes.
5. Existing feature-specific Android CI remains green for the source branches involved.
6. No service-role or privileged Supabase credential exists in Android.
7. Shared application wiring initializes Sync and Weather without duplicate workers or duplicate Supabase clients.
8. Navigation exposes the integrated features without replacing the canonical design direction.
9. Airplane mode, reconnect and app restart are tested after convergence.
10. A real Android device pass is completed before declaring the integration gate closed.

## Integration order

Preferred order:

1. Finish/verify Catastro and Gate D source work.
2. Reconcile build configuration and manifest.
3. Reconcile application initialization.
4. Integrate Weather repositories/workers.
5. Integrate Weather navigation/UI.
6. Run unit/build convergence gate.
7. Run feature-specific CI.
8. Run emulator/device scenarios.
9. Document evidence.
10. Only then consider a PR from `integration/android-v1` to `main`.

## Non-goals

This branch must not:

- revive the historical web/PWA architecture;
- merge unrelated legacy web PRs;
- redesign the canonical UI without an explicit task;
- introduce professional/client farm management;
- silently change Catastro geometry ownership or sync conflict policy;
- weaken repository protections to obtain a green result.
