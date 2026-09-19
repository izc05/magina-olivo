# Android Home Dashboard V1

This block defines the canonical structural Home screen for Mágina Olivo.

## Home blocks

The Home screen contains:

- Tiempo y radar
- Alertas
- Mercado del aceite
- Avisos
- Accesos rápidos

No external value is fabricated. Until a provider is integrated, each block shows an explicit pending or empty state.

## Quick actions

- Abrir Mi Olivar
- Registrar una actividad

These actions only navigate inside the app shell.

## Integration ownership

Weather/radar must be supplied by the validated Weather module.

Alerts must reuse the canonical alert/preferences path and avoid duplicate notification storage.

Oil-market data must come from a documented source and distinguish, when available:

- AOVE
- Virgen
- Lampante

Cooperative/territorial notices remain separate from private farm data.

## Privacy and offline rules

- Home must not send farm geometry to market/news providers.
- Private farm data remains under the app's own data model.
- Cached external information must show freshness when integrated.
- Mi Olivar and owned records remain usable without coverage.

## Guardrails

This branch does not:

- alter Catastro;
- alter Room entities or migrations;
- alter Gate D sync;
- write to Supabase;
- add fake weather or market values.

## Validation

UI tests protect the four information blocks and the quick-register navigation.
