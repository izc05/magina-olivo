# Android Domain Core V1

This branch introduces the canonical agricultural domain defined by the Master Implementation Pack without changing the existing Catastro/Room/Sync implementation.

## Scope

Canonical package: `com.isivolt.maginaolivo.domain.core`.

Implemented:
- `Farm`, `Parcel`, `Campaign`, `CampaignParcel`;
- farm-level campaign ownership with an explicit campaign↔parcel relation;
- `Money`, `Weight`, `Area`, `Percentage` exact value objects;
- neutral parcel geometry and geometry-source types;
- domain repository contracts;
- use cases for creating farms, parcels and campaigns, linking/unlinking parcels, and closing campaigns;
- semantic domain errors/results;
- JVM tests D1-01…D1-13.

## Compatibility decision

The pre-existing `domain.model.Farm` / `domain.model.Plot` and the Room `FarmEntity` / `PlotEntity` are deliberately left unchanged in F1. They are part of the already validated Catastro + Gate D baseline. F2 is responsible for adding Room mappings/migrations to the canonical domain without breaking that baseline.

This is intentional migration safety, not a second source of truth for new features. New agricultural-domain work should target `domain.core`.

## Non-goals

F1 does not change:
- Room schema;
- Supabase schema or RLS;
- Sync Engine;
- Catastro;
- Weather;
- Compose/navigation.

## Gate

F1 is acceptable only when JVM unit tests pass and the Android build still compiles with the existing Catastro/Sync/UI integration.
