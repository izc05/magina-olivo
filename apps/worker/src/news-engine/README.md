# News Engine — precursor del Content Center

Este directorio conserva el primer scaffold del **Mágina News Engine**.

El diseño ha evolucionado a un sistema más amplio y escalable: **Mágina Content Center / Content Engine**, que cubre noticias, eventos, ayudas, avisos agrícolas, mercado, comunicados municipales y novedades de cooperativas.

Nuevo punto de entrada:

- `apps/worker/src/content-engine/README.md`
- `docs/post-staging/MAGINA_CONTENT_CENTER.md`
- `docs/post-staging/CONTENT_CENTER_CODEX_BRIEF.md`

El documento `docs/post-staging/MAGINA_NEWS_ENGINE.md` se mantiene como contexto histórico y como diseño inicial de ingesta editorial.

## Compatibilidad

No borrar ni migrar este scaffold durante staging. Cuando C1 se autorice después del PASS de staging, Codex deberá decidir si los contratos aún útiles de `news-engine/types.ts` se absorben en `content-engine` o se eliminan en una migración limpia.

## Estado actual

**Scaffold only.** No scheduler, network fetch, OpenAI integration, Codex automation, database migration or autopublishing is active.

V11 permanece fuera de esta línea post-staging.