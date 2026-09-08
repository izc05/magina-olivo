# RAIF → Today Engine adapter brief

Status: **post-staging / technical design**

This document complements `TODAY_ENGINE_CODEX_BRIEF.md`.

## 1. Current state

Mágina already exposes RAIF as a verified public source with:

- provider/label/license metadata
- source update date
- last check / last success
- freshness classification
- crop/scope/province focus
- official resource links
- explicit product rule: regional alert ≠ parcel diagnosis

Current frontend reference:

`apps/web/src/MaginaFieldAlertsPage.tsx`

Current public route:

`GET /api/v1/public/field-alerts`

This is a good source-health layer, but it is not yet a normalized phytosanitary signal feed for Today Engine.

## 2. Goal

Create a server-side RAIF adapter that can answer:

> Is there a recent, geographically relevant official RAIF signal worth surfacing as context to this user today?

It must **not** answer:

> Does this user's parcel have this pest/disease?

## 3. Official source characteristics

The official Andalusian RAIF open dataset includes olive monitoring data and relates observations using common province, municipality and parcel fields. Olive data is updated on a weekly cadence.

The adapter must store the actual source update date and never use download/check time as a substitute for observation freshness.

## 4. Proposed normalized signal

```ts
export type RaifSignal = {
  id: string;
  crop: 'olivar';
  category: 'pest' | 'disease' | 'phenology' | 'treatment-observation' | 'other';
  subjectCode: string | null;
  subjectLabel: string;
  observationDate: string | null;
  sourceUpdatedAt: string;
  province: string;
  municipality: string | null;
  scope: 'municipality' | 'province' | 'andalusia';
  severity: 'info' | 'watch' | 'elevated' | 'unknown';
  evidence: {
    sampleCount: number | null;
    metricLabel: string | null;
    metricValue: number | null;
    metricUnit: string | null;
  };
  source: {
    provider: 'RAIF';
    label: string;
    url: string;
  };
};
```

Exact fields must follow what RAIF actually provides. Do not invent a severity scale from numeric values without a validated technical mapping.

## 5. Ingestion architecture

Preferred:

```text
RAIF official dataset
      ↓
worker / scheduled importer
      ↓
raw source metadata + normalized observations
      ↓
RAIF summary service
      ↓
Today Engine
```

Do not parse the full RAIF historical archive in the browser.

## 6. Update cadence

Because olive RAIF data is weekly:

- check for source updates on a controlled server-side schedule
- only ingest when source version/update date changes
- preserve last good import
- record importer errors separately from source freshness

Suggested polling/check cadence can be daily even if data updates weekly, provided calls are lightweight and cached.

## 7. Freshness states

Recommended conceptual states:

```text
current  -> within expected weekly window
review   -> beyond normal window; show only with caution
stale    -> not eligible for Today alert/context card
unknown  -> not eligible for Today alert/context card
```

Reuse/adapt the existing `MaginaFieldAlertsPage` freshness semantics so public source status and Today Engine do not disagree.

## 8. Geographic matching

Today Engine must rank RAIF relevance by real scope:

```text
same municipality > same province > Andalusia
```

But UI wording must preserve scope.

Allowed examples:

- `RAIF · Huelma`
- `RAIF · provincia de Jaén`

Not allowed from province-wide evidence:

- `Problema detectado en tu parcela`
- `Tu finca tiene riesgo alto`

## 9. Signal interpretation

V1 should be conservative.

A RAIF record can become a Today context card only if:

- crop = olivar
- source freshness is acceptable
- observation/update date is known enough
- geographic scope overlaps user's holding scope
- subject mapping is known
- wording can be generated without inventing a diagnosis or treatment

If any of those fail, keep the data available on the RAIF detail page but do not promote it to Today.

## 10. Recommended Today wording

Default:

```text
RAIF · seguimiento fitosanitario
Hay una observación oficial reciente de [subject] en [scope]. Consulta el detalle y revisa tu parcela antes de decidir una actuación.
```

If evidence is only province-level:

```text
RAIF · provincia de Jaén
El seguimiento oficial recoge actividad reciente de [subject]. Es contexto regional; no confirma el estado de tu finca.
```

## 11. Actions

Each Today card should offer:

- `Ver RAIF`
- `Abrir fuente oficial`
- optional `Crear tarea de revisión`

Creating a task records the user's intent to inspect; it does not record a diagnosis.

## 12. Dedupe

Use a deterministic key such as:

```text
raif:{subject}:{scope}:{sourceUpdatedAt}
```

Do not show multiple cards for the same subject and update unless materially different evidence requires it.

## 13. Storage

Codex should choose schema after inspecting current worker/database conventions.

Potential concepts:

- `public_source_runs`
- `raif_imports`
- `raif_observations`
- `raif_subject_dictionary`

Avoid storing redundant full historical XML if normalized data + source traceability are sufficient for product needs.

If raw snapshots are retained, define retention and storage cost explicitly.

## 14. Subject dictionary

RAIF field names/codes should be mapped through a versioned dictionary, not hand-written strings scattered through React.

Example concept:

```ts
{
  sourceCode: '...',
  canonicalKey: 'olive_fly',
  labelEs: 'mosca del olivo',
  category: 'pest'
}
```

Unknown codes remain unknown and must not generate polished authoritative copy automatically.

## 15. Severity

Do **not** infer `high/medium/low` simply from arbitrary numeric thresholds.

V1 options:

1. expose only neutral `info/watch` context;
2. use an explicit severity only if RAIF itself provides an interpretable category;
3. add validated technical rules later.

Preferred V1: neutral contextual signal.

## 16. Treatments

RAIF datasets may contain treatment-related observations. These must not be converted into instructions such as:

- use the same product
- use the same dose
- treat because another monitored parcel did

Treatment observations can be displayed only as source context where appropriate.

## 17. Public vs private

Public `/magina/campo` may show general RAIF status and source information.

Authenticated Today Engine may combine:

- user's municipality
- public RAIF scope

but must not expose private coordinates or holding identifiers in public routes.

## 18. Failure behavior

If importer fails:

- keep last known source metadata
- mark import/source status correctly
- suppress stale Today cards
- keep private Home/campaign usable
- keep official RAIF links available where safe

## 19. Tests

Required:

- source update detection
- idempotent re-import
- unknown subject code
- municipality match
- province fallback
- stale suppression
- duplicate suppression
- importer failure with last-good snapshot
- no parcel-diagnosis wording
- no treatment recommendation wording
- source URL/provenance preserved

## 20. Codex pre-implementation verification

Before coding, Codex must report:

1. current backend implementation of `/api/v1/public/field-alerts`;
2. where source health/freshness is persisted;
3. whether RAIF XML/ZIP is already downloaded anywhere;
4. current worker scheduling architecture;
5. existing public-source tables/adapters that can be reused;
6. exact RAIF fields available for olive observations;
7. proposed minimum normalized schema;
8. import idempotency key;
9. freshness rule aligned with current UI;
10. how Today Engine receives the normalized signal;
11. tests;
12. confirmation V11 is untouched.

## 21. Acceptance

- [ ] Existing RAIF public page continues to work.
- [ ] Adapter is server-side.
- [ ] Import is idempotent.
- [ ] Actual source/observation dates are retained.
- [ ] Unknown/stale data cannot create Today cards.
- [ ] Geographic scope is explicit.
- [ ] Province-level evidence never becomes parcel diagnosis.
- [ ] No treatment/product/dose recommendation is generated.
- [ ] Official source link and provenance remain visible.
- [ ] Worker/source failure does not break Home.
- [ ] tests/build/typecheck/smokes pass.
