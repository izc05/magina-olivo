# Codex brief — Mágina Content Center

> Scope: **post-staging only**. This brief is not authorization to modify or merge the V11 staging candidate while P0 acceptance remains open.

## Mandatory reading order

Before implementing any Content Center work, read:

1. `AGENTS.md`
2. `docs/post-staging/MAGINA_CONTENT_CENTER.md`
3. `docs/post-staging/MAGINA_NEWS_ENGINE.md` for historical context
4. `MASTER_PLAN.md`
5. `ARCHITECTURE.md`
6. the active staging issue/PR guards

If instructions conflict, the active P0 staging guard wins until staging is closed.

## Product intent

Build one scalable editorial system for:

- news;
- events;
- grants;
- agri/RAIF alerts;
- market updates;
- municipal notices;
- cooperative updates.

Keep advertising in a separate domain, although both appear inside the same Admin area.

## Non-negotiable architecture rules

1. Content is data, not code. Publishing must never require a commit or frontend deploy.
2. Manual publishing must work with AI completely disabled.
3. ChatGPT, Work, Codex and future collectors send structured candidates to the same API boundary.
4. No automation gets direct PostgreSQL credentials.
5. Source URL and attribution are mandatory for externally discovered content.
6. Do not copy full third-party articles.
7. Do not persist third-party images unless rights status allows it.
8. Unknown media rights use Mágina-owned category fallbacks.
9. Auto-publication is disabled by default and must require global + source-level permission.
10. AI score alone can never authorize publication.
11. All writes must be idempotent where retries are possible.
12. URL importing must be SSRF-safe.

## Current branch guard

While staging P0 is open, allowed changes are limited to:

- documentation;
- TypeScript contracts;
- pure helper/policy functions not wired into runtime;
- tests for pure helpers only if they do not change runtime dependencies.

Do **not** during this phase:

- register new API routes in `apps/api/src/app.ts`;
- add database migrations;
- add secrets or API keys;
- add schedulers/cron jobs;
- add network fetchers to the worker entrypoint;
- alter Docker/Nginx/staging deployment;
- enable OpenAI, Work or Codex automation;
- enable auto-publication.

## Target contracts

The implementation must converge on these boundaries:

```text
ContentCandidate
      ↓
validateCandidate()
      ↓
normalize / canonicalize
      ↓
deduplicate
      ↓
publicationPolicy()
      ↓
content_candidates
      ↓
Admin review / approved automation
      ↓
content_items
```

Candidate origins:

- `manual`
- `import_url`
- `rss`
- `api`
- `chatgpt`
- `codex`
- `worker`

Initial content types:

- `news`
- `event`
- `grant`
- `agri_alert`
- `market_update`
- `municipal_notice`
- `cooperative_update`

## Future API boundary

Admin-human endpoints:

```text
POST  /api/v1/admin/content
PATCH /api/v1/admin/content/:id
POST  /api/v1/admin/content/import-url
POST  /api/v1/admin/content/:id/approve
POST  /api/v1/admin/content/:id/schedule
POST  /api/v1/admin/content/:id/publish
POST  /api/v1/admin/content/:id/discard
GET   /api/v1/admin/content
GET   /api/v1/admin/content/sources
GET   /api/v1/admin/content/runs
```

Service endpoints:

```text
POST /api/v1/internal/content/candidates
POST /api/v1/internal/content/runs
```

Service endpoints require dedicated credentials, minimum scopes, rate limits and idempotency keys.

## Import URL implementation notes

When C2 is authorized:

- parse and validate URL before request;
- resolve DNS safely and reject private/local ranges;
- bound response size and timeout;
- limit redirects;
- allow only safe content types;
- sanitize extracted content;
- never execute remote JS inside API/worker;
- re-check final redirected target;
- capture canonical URL and source attribution;
- do not store images until media policy passes.

## AI implementation notes

AI is optional enrichment only.

Use an internal provider interface and validate structured output. AI may propose:

- editorial title;
- summary;
- category;
- municipalities;
- event fields;
- relevance score;
- tags;
- review warnings.

AI must not fabricate missing dates, URLs, venues, public bodies, prices or claims. Missing material facts remain null/unknown and route to human review.

## Advertising boundary

Do not model advertising as a `ContentType`.

Advertising has its own entities:

- advertisers;
- campaigns;
- creatives;
- delivery/impression events.

Worker handles deterministic activation/expiry. Codex/AI may inspect or suggest, but cannot auto-create or auto-approve commercial campaigns.

## Suggested implementation sequence after staging PASS

### C1

- schema/migrations;
- Admin CRUD;
- manual draft/publish;
- media fallbacks;
- audit trail.

### C2

- Import URL;
- metadata parser;
- dedupe;
- SSRF/security tests.

### C3

- RSS/API adapter interface;
- official-source registry;
- configurable 48h scheduling;
- run logs.

### C4

- optional AI provider;
- structured enrichment;
- cost budgets;
- human review safeguards.

### C5

- internal candidate endpoint;
- Codex/Work automation;
- quality metrics;
- allowlisted auto-publication.

## Definition of done

A change is not done merely because content appears on screen. It must preserve:

- provenance;
- idempotency;
- media rights state;
- source trust;
- audit trail;
- safe URL handling;
- manual fallback;
- global kill switches;
- staging/production separation.

## Current instruction to Codex

**Design and scaffold only until staging P0 is PASS. Do not broaden runtime scope.**