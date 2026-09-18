---
name: git-safe-workflow
description: Usa esta skill al crear ramas, integrar trabajo paralelo, preparar PRs, hacer cherry-picks, resolver conflictos o revisar integraciones.
---

# Git workflow seguro

## Reglas
- Una tarea funcional importante = una rama aislada.
- No trabajes directamente sobre main.
- No fusiones ramas ajenas solo para “poner todo al día”.
- Antes de integrar, identifica base, head y archivos tocados.
- Evita cambios cosméticos masivos junto a cambios funcionales.
- Prefiere commits pequeños y con propósito claro.
- No fuerces ramas compartidas salvo petición explícita y revisión previa.

## Integración
1. Revisa el diff.
2. Detecta solapamientos.
3. Verifica contratos y modelos compartidos.
4. Ejecuta tests relevantes.
5. Integra de forma explícita.
6. Documenta conflictos y decisiones.

Catastro, tiempo, sincronización, UI y otras líneas pueden evolucionar por separado. No asumas que una rama es la nueva base canónica solo por ser más reciente.

Cada PR debe explicar qué cambia, qué no cambia, cómo se verificó y qué riesgos quedan.
