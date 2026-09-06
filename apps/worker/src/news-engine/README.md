# News Engine

Post-staging module boundary for automated editorial ingestion.

Current state: **scaffold only**. No scheduler, network fetch, OpenAI integration or autopublishing is active.

See:

- `docs/post-staging/MAGINA_NEWS_ENGINE.md`
- `docs/post-staging/NEWS_ENGINE_CODEX_BRIEF.md`

Planned responsibilities:

- source adapters;
- normalization;
- deterministic deduplication;
- relevance/rules;
- optional AI enrichment;
- persistence;
- moderation workflow;
- idempotent publication.

This directory intentionally contains no executable integration yet so the V11 acceptance line remains unaffected.