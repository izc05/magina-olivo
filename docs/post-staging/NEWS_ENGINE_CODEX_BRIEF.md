# Codex Brief — Mágina News Engine

## Mission

Implementar el futuro módulo editorial automático de Mágina Olivo **solo después de cerrar staging**, reutilizando la arquitectura existente y evitando introducir un segundo producto independiente.

## Non-negotiable constraints

- No modificar ni mover `staging/candidate-v11-2026-09-05`.
- No fusionar en `feat/integration-v2-mvp-v1` mientras el P0 de staging siga abierto.
- No introducir secretos reales en Git.
- No exponer ninguna API key al frontend.
- No activar autopublicación por defecto.
- No hacer que el funcionamiento básico dependa de IA.
- No copiar código de repositorios externos hasta verificar licencia, seguridad y compatibilidad.
- Mantener el módulo compatible con un servidor de 8 GB de RAM.

## Existing repo context to reuse

- `apps/web`: interfaz PWA y futuro panel editorial.
- `apps/api`: contratos admin/públicos y persistencia.
- `apps/worker`: trabajos programados y adapters externos.
- PostgreSQL: fuente de verdad.
- El worker ya contiene patrones de fuentes externas como RAIF/mercado; reutilizar su estilo antes de crear abstracciones nuevas.

## Target module layout

```text
apps/worker/src/news-engine/
├── adapters/
│   ├── types.ts
│   ├── rss-adapter.ts
│   ├── raif-news-adapter.ts
│   ├── aemet-alert-adapter.ts
│   └── ...
├── ai/
│   ├── provider.ts
│   ├── noop-provider.ts
│   ├── openai-provider.ts
│   └── ollama-provider.ts          # optional/later
├── normalize.ts
├── deduplicate.ts
├── relevance.ts
├── pipeline.ts
├── scheduler.ts
├── repository.ts
├── publish.ts
└── types.ts
```

Do not force this exact tree if the existing worker conventions make a smaller design cleaner. Preserve current repository style.

## Phase N1 — no AI

Implement first:

1. adapter interface;
2. one fixture-backed RSS/Atom adapter;
3. normalization;
4. deterministic deduplication;
5. persistence tables/migration;
6. one scheduled/manual scan entrypoint;
7. admin API for pending items;
8. approve/edit/discard/publish manually;
9. tests for idempotency and duplicate suppression.

### Acceptance N1

- Run same source twice -> no duplicated editorial item.
- Run after failure -> safe retry.
- Broken source -> run records error and other sources continue.
- `EDITORIAL_AI_ENABLED=false` -> full N1 workflow remains usable.
- No network calls in unit tests.

## Phase N2 — sources

Add sources incrementally. Prefer official RSS/API over scraping HTML.

Priority:

1. sources already represented in current architecture (RAIF/AEMET patterns);
2. Junta/BOJA official feeds or endpoints;
3. Diputación/Ayuntamientos;
4. cooperative/DOP sources after legal/technical review.

Each adapter must define:

- source id;
- source type;
- canonical URL strategy;
- date parsing strategy;
- rate limit/poll interval;
- attribution text;
- failure policy;
- test fixtures.

## Phase N3 — AI

Create a provider boundary before adding OpenAI.

```ts
export interface EditorialAiProvider {
  enrich(input: EditorialAiInput): Promise<EditorialAiOutput>;
}
```

Required output must be schema-validated JSON, never free-form parsing.

Suggested output fields:

```ts
{
  title: string;
  summary: string;
  body?: string;
  category: EditorialCategory;
  municipalities: string[];
  startsAt?: string;
  endsAt?: string;
  relevanceScore: number;
  pushTitle?: string;
  pushBody?: string;
  needsHumanReview: boolean;
  reviewReason?: string;
}
```

### AI safety/cost rules

- deduplicate before AI;
- truncate/clean input;
- never send secrets or private user data;
- source URL and factual dates stay available to reviewer;
- provider timeout and retries must be bounded;
- AI failure -> item stays reviewable without AI;
- daily/monthly budget guard;
- global kill switch;
- log model/provider and usage metadata, not secret credentials.

## Open-source comparative review

Evaluate these only as references:

- `qianqiuqiu/news-aggregator`
- `huawolf/news-agent`
- `eschnou/morningdeck`
- `starkSV/MuckScraper-v2`

For each produce a short ADR or matrix covering:

- license;
- language/runtime;
- RSS/web ingestion;
- dedup strategy;
- scheduler;
- persistence;
- LLM abstraction;
- Docker footprint;
- maintenance activity;
- security concerns;
- useful patterns to adapt;
- reasons not to vendor/copy it wholesale.

Default decision: **adapt patterns, not whole applications**.

## Database migration guidance

Candidate tables:

- `content_sources`
- `content_ingest_items`
- `editorial_items`
- `editorial_runs`

Required properties:

- unique constraints for deterministic idempotency;
- timestamps in UTC;
- source attribution retained after publication;
- publication and approval audit fields;
- indexes for pending status, source, publication date and canonical URL.

Migration must be reversible where practical and covered by migration smoke tests.

## Admin UX

Minimum screen:

```text
Contenido
├── Pendientes
├── Programados
├── Publicados
├── Descartados
├── Fuentes
└── Ejecuciones
```

Pending item must show:

- source;
- original title;
- source URL;
- original date;
- generated/editable title and summary;
- category/municipality;
- AI/relevance indicators if used;
- actions: View source / Edit / Approve / Publish / Discard.

Do not expose raw internal prompts or secrets in UI.

## Autopublish policy

Autopublish global default: `false`.

An item may only autopublish when all are true:

1. global switch enabled;
2. source allowlisted;
3. matching deterministic publication rule exists;
4. item passes schema/date validation;
5. no duplicate/update conflict;
6. no `needsHumanReview` flag;
7. content type is allowed for that source.

Do not use LLM confidence alone as an authorization control.

## Testing requirements

Unit:

- URL canonicalization;
- hashes;
- dedup;
- date parsing;
- municipal matching;
- rule filters;
- AI schema validation;
- budget guard.

Integration:

- ingest -> pending;
- retry -> no duplicate;
- approve -> publish once;
- source update -> update path, not duplicate;
- AI disabled;
- AI timeout;
- source timeout;
- DB transaction rollback.

Security:

- SSRF protections for configurable URLs;
- max response size;
- timeout;
- redirect limits;
- content-type checks;
- HTML sanitization before rendering;
- no secret values in logs;
- admin authorization enforced server-side.

## Operations

Expose basic metrics/logs:

- last successful scan per source;
- last error;
- items discovered;
- duplicates;
- items sent to AI;
- AI failures;
- pending review count;
- publications;
- approximate AI usage/cost units.

Worker must use bounded concurrency and memory. Do not load large sites or full archives into RAM.

## Definition of Done

The implementation is not production-ready until:

- staging P0 is closed first;
- migration/rollback tested;
- sources have traceable attribution;
- no duplicates under retry;
- admin review workflow works;
- AI-off mode works;
- kill switches work;
- external-source failures are isolated;
- secrets are absent from logs/client bundles;
- memory/load test is acceptable on the 8 GB staging server;
- first official-source autopublish rule has been manually validated before enabling it.
