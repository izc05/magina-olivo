---
name: testing-gates
description: Usa esta skill para criterios de aceptación, validación de fases, pruebas Android, regresiones y cierre de gates.
---

# Testing y gates

No declares un gate cerrado solo porque compile. Debe existir evidencia proporcional al riesgo.

## Checklist mínimo
- Compilación desde entorno limpio.
- Tests del dominio crítico.
- Pruebas de persistencia y sincronización cuando aplique.
- Flujo principal probado manualmente.
- Modo avión y reconexión para funciones offline.
- Estados vacío, carga y error.
- Geometrías complejas y volumen razonable en mapas.
- Android real para permisos, mapas, notificaciones, hardware o rendimiento.

## Cada gate debe declarar
- alcance;
- criterios de entrada;
- criterios de aceptación;
- riesgos conocidos;
- evidencia;
- qué queda fuera.

No mezcles el cierre de un gate con funciones nuevas que no sean necesarias para validarlo.
