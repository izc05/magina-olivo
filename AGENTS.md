# AGENTS.md — Mágina Olivo

Este archivo es la puerta de entrada para cualquier agente que trabaje en este repositorio.

## Antes de empezar

1. Lee `.github/copilot-instructions.md`.
2. Identifica la skill relevante dentro de `.github/skills/`.
3. Revisa la rama actual y evita mezclar trabajo de otras líneas activas.
4. Determina el gate y los criterios de aceptación antes de implementar.

## Baseline obligatoria

- Android nativo.
- Offline-first.
- Supabase como backend remoto desacoplado.
- Núcleo: finca → parcela → campaña → actuación → cosecha / gastos / documentos.
- Catastro para localizar/incorporar parcelas, conservando geometrías propias.
- Enfoque inicial: agricultor gestionando sus propias fincas.
- Modo profesional para terceros: fase posterior.
- Desarrollo modular y por ramas aisladas.
- Diseño visual canónico crema + verde olivo, fotografía del olivar/Sierra Mágina y experiencia móvil coherente.

No cambies estas decisiones por iniciativa propia.

## Skills disponibles

- `project-guardrails`: arquitectura, alcance y decisiones canónicas.
- `android-offline-first`: Kotlin/Android, persistencia local y sincronización diferida.
- `olivar-domain`: finca, parcela, campaña, actuaciones, cosecha, gastos e histórico.
- `catastro-maps`: Catastro, SIGPAC, PNOA, geometrías y mapas.
- `weather-alerts`: tiempo, radar, cache y alertas.
- `supabase-sync`: Supabase, RLS, Storage y conflictos.
- `ui-canonical`: diseño, onboarding y navegación.
- `testing-gates`: criterios de aceptación y pruebas.
- `git-safe-workflow`: ramas, PRs e integración segura.

## Reglas de seguridad de trabajo

- No trabajar directamente sobre `main`.
- No integrar ramas ajenas automáticamente.
- No hacer force-push sobre ramas compartidas.
- No introducir secretos ni claves.
- No ocultar conflictos ni sobrescribir datos del usuario silenciosamente.
- No declarar un gate cerrado sólo porque el proyecto compile.
- Mantén los cambios pequeños, verificables y reversibles.

## Si encuentras documentación contradictoria

La baseline descrita aquí y en `.github/copilot-instructions.md` prevalece sobre documentación histórica de la etapa web/PWA, salvo orden explícita en la tarea actual.
