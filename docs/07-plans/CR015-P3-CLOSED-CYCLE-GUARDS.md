# CR-015 P3 — Protección de ciclos cerrados y CI foundation

Base: P3 publicada `cfad9dd58` (PR #859). Rama independiente; no sustituye a #859.

## Decisión del propietario (07/11/2026)

- Un ciclo cerrado conserva su historial.
- `assign` no mueve ningún registro desde un ciclo cerrado (`source_cycle_closed`).
- `assign` no asigna gastos a un ciclo cerrado (`cycle_closed`).
- No hay movimientos silenciosos entre campañas: toda asignación exige motivo y queda en
  `agricultural_cycle_operations`.
- La reapertura controlada queda fuera de alcance; se estudiará más adelante.
- Los vínculos y operaciones ya registrados no se modifican.

Sin cambios: añadir trabajos o recolecciones históricas a un ciclo cerrado dentro de su
intervalo sigue las reglas ya existentes de P3. El panel deja de ofrecer gastos como
candidatos de un ciclo cerrado.

Pruebas: `AgriculturalCycleRoomTest` (RED 2 fallos con `cfad9dd58`, GREEN 17/17 con la corrección).

## CI foundation

La ejecución de #859 se canceló a los 30 minutos con las tres compilaciones Kotlin
(dev, staging, production) arrancadas a la vez y sin terminar tras 26 minutos, sin errores.
En P1 las mismas tres compilaciones tardaron unos 5 minutos. Hipótesis: presión de memoria
en el daemon Kotlin compartido (3 GB), ya vista antes a 2 GB.

Cambios: límite del job a 45 minutos, `--max-workers=2` (se ejecutan todas las tareas y
variantes) y muestreo de GC de los daemons cada 2 minutos. La hipótesis solo se dará por
confirmada con una ejecución de CI correcta y sus muestras.
