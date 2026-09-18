---
name: project-guardrails
description: Usa esta skill cuando una tarea pueda alterar arquitectura, alcance, prioridades, módulos principales o decisiones ya fijadas de Mágina Olivo.
---

# Project guardrails

## Objetivo
Proteger la baseline canónica y evitar que un agente reabra decisiones ya cerradas sin una petición explícita.

## Decisiones canónicas
- Android nativo como producto principal.
- Offline-first.
- Supabase como backend desacoplado.
- Público inicial: agricultor que gestiona sus propias fincas y parcelas de olivar.
- Modo profesional para terceros: fase posterior.
- Jerarquía base: finca → parcela → campaña → actuación → cosecha / gastos / documentos.
- Catastro sirve para incorporar parcelas y conservar geometría propia.
- Arquitectura modular para ampliar tareas, maquinaria, inventario, riego, proveedores, incidencias, cuaderno avanzado y análisis sin rehacer el núcleo.
- Desarrollo por fases y gates.
- Ramas funcionales aisladas.

## Antes de cambiar algo
1. Comprueba si la tarea pide explícitamente cambiar una decisión canónica.
2. Si no lo pide, conserva la decisión.
3. Si documentación antigua contradice la baseline, documenta el conflicto y usa la baseline actual.
4. Evita ampliar alcance por iniciativa propia; separa propuestas futuras.

## Definición de terminado
El cambio cumple la tarea sin romper la baseline, sin introducir dependencias innecesarias y sin mezclar trabajo no relacionado.
