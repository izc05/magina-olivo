# Android Secondary Shell V1

This block extends the canonical Android shell without changing agricultural persistence.

## Register

The `Registrar` destination exposes five structural entry types:

- Actuación
- Cosecha / entrega
- Gasto
- Documento
- Nota / tarea

The user can choose the intended kind. No record is persisted in V1.

The final implementation must reuse the canonical domain model and Gate D local-first write path instead of creating parallel storage.

## Calendar

The calendar shell reserves four sections:

- Hoy
- Próximos trabajos
- Campaña
- Avisos

Owned agricultural events must remain visible offline once the functional calendar is implemented.

Weather alerts should be referenced, not duplicated into a competing alert store.

## Profile

The profile shell reserves:

- Cuenta
- Mis datos
- Avisos
- Apariencia
- Sincronización

No setting currently changes domain data.

Authentication, export/privacy, weather preferences and sync diagnostics must connect to their existing owners when those modules are ready.

## Guardrails

This branch must not:

- add a second farm/plot/campaign model;
- write directly to Supabase from UI;
- bypass the local repository/outbox;
- modify Catastro geometry;
- change Gate D conflict policy;
- present unavailable actions as completed.

## Validation

The UI contract test must verify:

- canonical navigation remains visible;
- Register opens;
- Calendar opens;
- Profile opens;
- no functional persistence is required to navigate these screens.
