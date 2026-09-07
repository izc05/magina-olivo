# Mágina Content Engine

Post-staging module boundary for the scalable Mágina Content Center.

Current state: **design/scaffold only**.

Nothing in this directory is registered in the worker entrypoint. No scheduler, HTTP fetcher, database migration, OpenAI integration, Codex automation or auto-publication is active.

Primary design documents:

- `docs/post-staging/MAGINA_CONTENT_CENTER.md`
- `docs/post-staging/CONTENT_CENTER_CODEX_BRIEF.md`
- `docs/post-staging/MAGINA_NEWS_ENGINE.md` (historical precursor)

## Responsibilities

This module will eventually own reusable editorial pipeline logic for:

- news;
- events;
- grants;
- agri/RAIF alerts;
- market updates;
- municipal notices;
- cooperative updates.

Advertising is intentionally excluded from the editorial `ContentType` and remains a separate domain.

## Boundary

```text
manual / import URL / RSS / API / ChatGPT / Codex
                         │
                         ▼
                  ContentCandidate
                         │
                  validation/policy
                         │
                  API + persistence
                         │
                  Admin moderation
                         │
                    publication
```

External automation must never receive direct PostgreSQL credentials.

## Current code

- `types.ts`: stable candidate/source/media/run contracts.
- `policy.ts`: dependency-free deterministic policy helpers.

These files are intentionally not wired to runtime while V11 staging acceptance is open.