# Android UI Canonical V1

This document freezes the current Android visual/navigation contract for Mágina Olivo.

## Main navigation

The canonical bottom navigation is:

1. `Inicio`
2. `Mi Olivar`
3. `+ Registrar`
4. `Calendario`
5. `Perfil`

Do not rename, reorder or replace these destinations unless the product decision is explicitly reopened.

## Onboarding

The canonical onboarding has six steps:

1. `Bienvenida`
2. `Fincas y parcelas`
3. `Mapa y Catastro`
4. `Actividad y campaña`
5. `Cosecha, gastos y documentos`
6. `Tiempo, mercado y alertas`

Shared structure:

- Mágina Olivo branding at the top;
- optional `Saltar` before the final step;
- progress indicator;
- central visual area;
- editorial headline + concise explanatory copy;
- primary CTA at the bottom;
- final CTA: `Entrar en Mágina Olivo`.

## Visual identity

- cream background;
- olive green as primary action/identity;
- editorial serif for important headlines;
- operational sans-serif for controls and body copy;
- soft rounded cards;
- high contrast and mobile-first spacing;
- olive grove / Sierra Mágina photography when official assets are available.

The code must not invent a replacement logo or unrelated imagery when the official asset is unavailable.

## Functional shell

During convergence:

- `Mi Olivar` hosts the current functional farms/plots/Catastro flow;
- `Inicio` prepares slots for weather/radar, alerts, oil market and direct access to the orchard;
- `+ Registrar`, `Calendario` and `Perfil` may remain structurally prepared until their functional modules are integrated;
- placeholder states must be explicit and must not pretend unavailable features are live.

## Isolation rules

The UI branch must not change:

- Catastro geometry logic;
- Catastro gateways;
- Room entities/DAO/migrations;
- Gate D outbox/sync semantics;
- RLS;
- Supabase backend schema;
- weather provider logic.

## Validation

`CanonicalUiContractTest` protects the six onboarding steps and the five main navigation labels.

Before integration:

- Android CI must pass;
- Android Convergence Gate must pass;
- emulator smoke must not regress;
- Catastro Room E2E and Gate D checks must remain green;
- visual review on a real Android device is still required.
