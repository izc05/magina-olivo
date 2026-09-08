# Mágina Today Engine — Codex implementation brief

Status: **post-staging / ready for technical verification**  
Repository: `izc05/magina-olivo`  
Reference integration base: `feat/integration-v2-mvp-v1`  
Safety rule: **do not modify or move `staging/candidate-v11-2026-09-05`**. Do not implement or merge while staging P0 #7 remains open.

## 1. Product goal

Turn the Mágina Olivo Home screen from a passive dashboard into an answer to one practical question:

> **¿Qué tengo que revisar hoy?**

The Today Engine must combine verified signals already present or planned in Mágina and surface a small ranked set of useful actions, warnings or reminders.

It must **not** become an autonomous agronomic prescriber. It must never invent treatments, doses, diagnoses or mandatory field actions from weak evidence.

The engine should help the user decide where to look next.

## 2. Desired Home experience

Example target:

```text
Buenos días, Isi

Hoy en tu olivar

🌧 Lluvia probable mañana · 72 %
   Revisa las labores sensibles al tiempo.
   [Ver tiempo] [Crear tarea]

🌿 RAIF · señal fitosanitaria en Jaén
   Consulta el seguimiento oficial antes de decidir una actuación.
   [Ver RAIF] [Guardar para revisar]

🫒 2 entregas pendientes de rendimiento
   Completa los datos cuando los facilite la almazara.
   [Completar]
```

The engine should normally show **1–3 cards**, not an endless feed.

## 3. Existing repository building blocks

Codex must inspect and reuse existing work before creating new logic.

Important existing files/features include:

- `apps/web/src/PilotAlerts.tsx`
  - already combines rain alarms, frost/wind thresholds and pending-yield reminders
  - already checks weather freshness before surfacing forecast-based alerts
- `apps/web/src/WeatherRainAlertSummary.tsx`
  - server-side rain alarm summary
  - explicit disclaimer that it is not an agronomic recommendation
- `apps/web/src/MaginaWeatherPage.tsx`
  - AEMET municipal forecast
  - freshness/degraded-cache handling
  - radar frames and 5-minute refresh
- `apps/web/src/MaginaPrivateHub.tsx`
  - deliberate separation between public territory data and private holding data
- campaign summary / deliveries / field notebook / calendar / account preferences
- planned Dynamic Weather Hero documentation

The Today Engine should evolve these pieces into a reusable server/client contract rather than duplicating their logic inside Home.

## 4. Core architecture

Target architecture:

```text
                 DATA SOURCES

AEMET / weather ----┐
RAIF ---------------┤
IFAPA / official ---┤
Campaign data ------┤
Field notebook -----┤
Calendar/tasks -----┤
User preferences ---┤
Cooperative data ---┤  future
                    ↓
              Signal Normalizer
                    ↓
                Today Engine
       validation + ranking + expiry
                    ↓
              TodayItem[] API
                    ↓
              Home / Mi Campo
```

Do not make React components themselves the decision engine.

## 5. Main design principle: signal, not prescription

Every Today item must belong to one of these classes.

### A. Factual reminder

Examples:

- pending yield result
- incomplete campaign record
- user-created task due today
- cooperative event or appointment

Safe to state directly when backed by private data.

### B. Weather context

Examples:

- rain probability crosses configured threshold
- forecast frost threshold crossed
- high wind threshold crossed
- official weather warning exists

Safe wording:

> "Revisa las labores previstas para mañana: AEMET indica 75 % de probabilidad de lluvia."

Avoid:

> "No trates mañana."

unless a future rule has a specifically approved official basis and sufficient context.

### C. Fitosanitary context

Examples:

- RAIF indicates activity/risk in the relevant geographic scope
- RAIF update is recent enough

Safe wording:

> "RAIF publica actividad de mosca del olivo en la zona. Revisa la fuente y comprueba tu parcela."

Avoid:

> "Trata la mosca hoy."

### D. Official guidance context

IFAPA or other official technical publications can support educational context.

Example after exceptional rainfall:

> "Tras episodios de lluvia intensa, IFAPA señala riesgos como encharcamiento, erosión y enfermedades. Revisa las zonas con peor drenaje."

This must link to the official source and must not transform a general publication into a parcel-specific diagnosis.

### E. Agronomic recommendation requiring expert confirmation

This class is **not enabled automatically in V1**.

Any future recommendation involving:

- pesticide selection
- dose
- treatment timing
- diagnosis
- irrigation quantity
- fertilizer quantity
- harvest timing presented as definitive

requires separate product/safety review and stronger data provenance.

## 6. Today item contract

Suggested normalized contract:

```ts
export type TodayItemKind =
  | 'official-warning'
  | 'weather-context'
  | 'phytosanitary-context'
  | 'task'
  | 'campaign-reminder'
  | 'data-quality'
  | 'information';

export type TodayItemSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

export type TodayItemConfidence =
  | 'official'
  | 'verified'
  | 'contextual'
  | 'unknown';

export type TodayAction = {
  id: string;
  label: string;
  href?: string;
  action?: 'create-task' | 'dismiss' | 'snooze' | 'open-source' | 'open-record';
};

export type TodayItem = {
  id: string;
  kind: TodayItemKind;
  severity: TodayItemSeverity;
  confidence: TodayItemConfidence;
  title: string;
  detail: string;
  reason: string | null;
  locationLabel: string | null;
  sourceLabel: string | null;
  sourceUrl: string | null;
  sourceUpdatedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  actions: TodayAction[];
};
```

Exact naming may change to fit repository conventions.

## 7. Ranking model V1

Use deterministic rules, not an LLM ranking black box.

Recommended priority order:

1. official civil/weather safety warnings
2. time-sensitive user tasks/deadlines
3. active rain/frost/wind threshold alerts
4. relevant fresh RAIF context
5. campaign/data-completion reminders
6. informational context

Within equal priority, rank by:

- nearer expiry/deadline
- stronger source confidence
- closer geographic relevance
- user preference
- novelty / not recently dismissed

V1 target: return maximum **3 primary items** plus optional `moreCount`.

## 8. Geographic relevance

Signals must carry scope.

Preferred specificity:

```text
plot > farm > holding municipality > comarca > province > Andalucía
```

Do not claim parcel-specific relevance from a province-wide RAIF or IFAPA publication.

UI must make scope understandable.

Examples:

- `Tu parcela` only when location is truly parcel-specific
- `Huelma`
- `Sierra Mágina`
- `Jaén`
- `Andalucía`

## 9. Freshness and expiry

Every external signal must have freshness semantics.

### Weather

Use existing weather freshness logic. Do not promote stale/unknown forecast into urgent Today items.

### RAIF

RAIF olive data is updated on a weekly cadence. Codex must store/use the actual dataset/source update date and define a conservative freshness rule.

Do not show an old RAIF signal as "hoy" simply because it still exists in a dataset.

### Official guides

Guides such as IFAPA are knowledge sources, not live alerts. They should only appear when a current trigger makes the guidance relevant, and the card must clearly separate:

- current trigger
- general official guidance

### Private records

Campaign/task reminders expire based on their own dates/state.

## 10. Source policy

Preferred source confidence:

```text
official
  AEMET
  Junta de Andalucía / RAIF
  IFAPA
  official municipality/cooperative source when verified

verified
  curated trusted source approved by Admin

contextual
  derived combination of official/private signals

unknown
  never eligible for urgent Today cards
```

Every external Today item should expose its source to the user.

## 11. AEMET integration

AEMET OpenData currently provides:

- municipal daily forecasts
- municipal hourly forecasts up to 48 h
- conventional station observations
- other official weather products

Codex must verify which existing Mágina backend route already uses which AEMET product.

For V1:

- existing rain/frost/wind alerts may continue using forecast data
- current-condition visuals should remain a separate concern from future forecast alerts
- do not call AEMET directly from Home

## 12. RAIF integration

RAIF must remain a contextual official signal.

Current official dataset characteristics relevant to implementation:

- historical + current monitoring data
- olive dataset available
- fields relate municipality / parcel / sampling
- weekly olive updates
- source maintained by Andalusian plant-health services

Codex must first determine whether an ingestion/normalization worker already exists in the current integration branch.

If not, Today Engine V1 may initially consume a smaller verified RAIF summary endpoint rather than parsing the entire historical dataset in the client.

Never download and parse the full RAIF archive in the browser.

## 13. IFAPA guidance

IFAPA may be used as a curated knowledge layer.

A relevant 2026 example is its guidance for olive groves and Mediterranean fruit trees following extreme rainfall, discussing risks including erosion, root asphyxia, disease incidence and nutrient leaching.

Use such sources in a rule like:

```text
verified extreme-rain trigger
        +
relevant IFAPA guidance
        ↓
context card with source
```

Not:

```text
IFAPA document exists
        ↓
show generic warning every day
```

## 14. User actions

Today cards should be actionable.

V1 actions may include:

- `Ver tiempo`
- `Ver radar`
- `Ver RAIF`
- `Abrir fuente`
- `Crear tarea`
- `Completar entrega`
- `Ver campaña`
- `Posponer`
- `Descartar por hoy`

Do not silently modify field records because a Today item exists.

## 15. Dismiss / snooze behavior

The user must be able to reduce noise.

Recommended semantics:

- **dismiss today**: hide until the next local day or meaningful signal change
- **snooze**: hide for a selected period where appropriate
- **resolved automatically**: item disappears when its underlying condition is no longer true

Do not permanently suppress critical official warnings through a casual dismissal control.

## 16. Deduplication

Avoid showing the same underlying event in multiple cards.

Example:

```text
Rain alert + Weather Hero + Today Engine
```

should produce:

- hero visual context
- one Today card
- detailed weather page

not three competing alerts on Home.

Use a deterministic `dedupeKey`/signal identity server-side.

## 17. Home UI integration

The Today Engine belongs close to the top of Home, below or integrated with the dynamic hero.

Suggested structure:

```text
Dynamic Weather Hero
        ↓
Today summary
  1–3 cards
        ↓
existing campaign / field content
```

Do not redesign all Home navigation as part of V1.

## 18. Weather Hero relationship

Dynamic Weather Hero and Today Engine share weather data but have different responsibilities.

```text
Weather Engine
   ├── visual state -> Dynamic Weather Hero
   ├── forecast alerts -> Today Engine
   ├── detailed data -> Tiempo
   └── radar -> Tiempo/Radar
```

Do not let the hero animation itself trigger recommendations.

## 19. Future "Mágina IA" relationship

Today Engine should be deterministic and source-grounded.

A future AI layer may:

- summarize the top items
- explain why they matter
- answer follow-up questions

But AI should not be the source of truth for whether an alert exists.

Target future flow:

```text
Today Engine factual items
        ↓
Mágina IA explanation
        ↓
user chooses action
```

not:

```text
LLM guesses field state
        ↓
creates urgent recommendation
```

## 20. Example Today rules V1

### Rule: rain threshold

Input:

- account rain alerts enabled
- forecast probability >= configured threshold
- forecast freshness acceptable

Output:

```text
Lluvia probable mañana
AEMET indica 72 % en Huelma. Revisa las labores previstas sensibles al tiempo.
```

Actions:

- Ver tiempo
- Crear tarea

### Rule: frost

Input:

- notifyWeather enabled
- min temperature <= user threshold
- forecast trustworthy

Output:

```text
Temperatura baja prevista
La mínima prevista alcanza tu umbral configurado.
```

### Rule: wind

Input:

- max wind >= user threshold

Output:

```text
Viento fuerte previsto
Revisa las labores que dependan de condiciones de viento.
```

### Rule: pending yield

Input:

- active campaign
- `pendingResultCount > 0`

Output:

```text
2 entregas pendientes de rendimiento
Completa el dato cuando lo facilite la almazara.
```

### Rule: RAIF context

Input:

- fresh RAIF olive signal
- geographic overlap with holding scope
- validated mapping

Output:

```text
RAIF · seguimiento fitosanitario
Hay una señal oficial reciente relevante para tu zona. Consulta el detalle y revisa tu parcela antes de decidir una actuación.
```

### Rule: extreme rainfall + official guide

Input:

- verified heavy-rain event / threshold
- appropriate recent weather evidence

Output:

```text
Tras la lluvia intensa
IFAPA recomienda prestar atención a drenaje, erosión y síntomas asociados al exceso de agua. Revisa las zonas sensibles de tu finca.
```

This must link to IFAPA and be labeled as general official guidance.

## 21. Rules explicitly prohibited in V1

Do not automatically generate:

- "Aplica cobre"
- "Trata con X producto"
- pesticide dosage
- fertilizer dosage
- irrigation volume
- disease diagnosis from weather alone
- "Cosecha hoy" as a definitive prescription
- claims that a RAIF provincial observation proves the user's parcel is infected

## 22. Backend endpoint

Preferred pattern:

```text
GET /api/v1/today
```

Possible response:

```json
{
  "generatedAt": "2026-09-08T12:00:00Z",
  "location": {
    "scope": "municipality",
    "label": "Huelma"
  },
  "items": [],
  "moreCount": 0,
  "sources": {
    "weather": "fresh",
    "raif": "fresh",
    "privateData": "available"
  }
}
```

Codex should adapt naming to existing API conventions.

## 23. Server-side vs client-side

Prefer server-side aggregation for:

- external source normalization
- ranking
- deduplication
- freshness checks
- source confidence
- user preference application where practical

Frontend should focus on rendering and local interactions.

This reduces duplicated requests and keeps source rules consistent across devices.

## 24. Caching

Do not recompute/fetch external sources independently for every Home load.

Cache external source data centrally according to source cadence:

- weather: short TTL
- radar: existing cadence
- RAIF: substantially longer, aligned with actual update cadence
- IFAPA knowledge: durable curated metadata

Private campaign data remains per-user and must not leak across users.

## 25. Privacy

Today Engine can combine private holding data with public sources only server-side or within authenticated private UI.

Rules:

- do not publish plot coordinates in public endpoints
- do not log precise plot coordinates unnecessarily
- prefer municipality/holding scope for public-source matching where sufficient
- preserve current separation between public Mágina content and private farm data

## 26. Explainability

Each card should answer:

- **qué ocurre**
- **por qué lo ves**
- **qué fuente lo respalda**
- **qué puedes hacer dentro de Mágina**

Suggested optional `reason` UI:

> "Lo ves porque la previsión supera tu umbral de lluvia del 60 %."

This is more trustworthy than mysterious ranking.

## 27. Notifications

Today Engine V1 should first work **inside the app**.

Push/email/WhatsApp notification delivery is a separate concern.

Only some item classes should later be eligible for external notification, e.g.:

- official warning
- opted-in rain/frost/wind alert
- explicit user task reminder

Do not send every contextual Today card as a push notification.

## 28. Observability

Track at minimum:

- Today endpoint success/failure
- generation latency
- external source status
- number of items generated by kind
- deduplication count
- stale-source suppression count
- user card opens/actions
- dismiss/snooze rate

Do not log sensitive private contents unnecessarily.

## 29. Feature flag

Implement behind a simple project-consistent feature flag, e.g.:

```text
TODAY_ENGINE_ENABLED
```

If disabled or failing:

- existing Home continues to work
- existing `PilotAlerts` may remain as fallback during migration

Do not remove `PilotAlerts` until Today Engine has passed acceptance.

## 30. Migration strategy

### Phase T0 — verification

Codex reports current paths and source contracts.

### Phase T1 — Today API skeleton

- private/campaign reminders
- existing rain/frost/wind signals
- deterministic ranking/dedupe

No RAIF automation required yet.

### Phase T2 — Home cards

- render top 1–3 items
- actions
- source labels
- dismissal/snooze where applicable

### Phase T3 — RAIF context

- verified ingestion/summary
- geographic relevance
- freshness
- source link

### Phase T4 — curated IFAPA guidance triggers

- small rule library
- official source metadata
- no autonomous prescriptions

### Phase T5 — AI explanation (future)

- optional summarization over already-generated Today items
- never source-of-truth alert generation

## 31. Testing requirements

### Unit

- ranking by severity
- expiry
- dedupe
- stale-source suppression
- location scope ranking
- preference filtering
- rain threshold
- frost threshold
- wind threshold
- pending yield
- RAIF contextual wording

### Source/static tests

- no direct external provider call from Home
- no banned treatment/prescription strings in V1 rule templates
- every external item requires source metadata
- maximum primary-card count enforced

### Integration

- authenticated account with no signals -> clean empty state
- rain alert + pending yield -> correct ranking
- stale weather -> no weather alert
- RAIF unavailable -> private reminders still work
- provider failure -> Home still loads
- flag disabled -> fallback works

### Manual

- Android mobile
- PWA installed
- offline/online transition
- different municipalities
- long source titles / localization
- reduced motion unaffected
- Today cards remain understandable with Weather Hero on and off

## 32. Acceptance criteria

- [ ] Today Engine is deterministic in V1.
- [ ] Home shows at most 3 primary Today items.
- [ ] Every external signal has visible provenance.
- [ ] Stale/unknown external signals cannot create urgent cards.
- [ ] No V1 rule prescribes pesticide/product/dose/diagnosis.
- [ ] Existing private/public separation is preserved.
- [ ] Rain/frost/wind preferences are reused rather than duplicated.
- [ ] Existing `PilotAlerts` is migrated safely or retained as fallback.
- [ ] RAIF cards reflect true geographic scope and freshness.
- [ ] IFAPA guidance is contextual, sourced and not presented as parcel diagnosis.
- [ ] Home remains functional when Today API fails.
- [ ] Build/typecheck/tests pass.
- [ ] Required smoke tests pass.
- [ ] V11 remains untouched.

## 33. Codex verification checklist before coding

Codex must first report:

1. exact current `PilotAlerts` integration point in Home;
2. current rain-alert server implementation;
3. current weather provider and freshness path;
4. current task/calendar capabilities that can feed Today Engine;
5. campaign reminder sources already available;
6. RAIF ingestion/status currently implemented, if any;
7. whether a reusable public-source freshness abstraction exists;
8. proposed `GET /api/v1/today` contract or equivalent;
9. dedupe/ranking strategy;
10. migration plan from `PilotAlerts`;
11. tests to add;
12. confirmation that V11 and its SHA are untouched.

Only after this report should implementation begin.

## 34. Suggested implementation branch

After staging P0 #7 is closed:

```text
feat/today-engine-v1
```

Do not implement directly on V11.

## 35. Product north star

The user should open Mágina and immediately understand:

> **qué merece su atención hoy, por qué, y dónde comprobarlo.**

Mágina should reduce searching and remembering without pretending to replace the farmer, technician, official warning systems or professional agronomic judgment.
