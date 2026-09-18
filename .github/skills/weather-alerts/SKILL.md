---
name: weather-alerts
description: Usa esta skill para predicción meteorológica, radar/lluvia, avisos, alertas agrícolas, proveedores de tiempo y cache meteorológica.
---

# Tiempo y alertas

## Principios
- El tiempo es informativo y no debe bloquear la gestión del olivar.
- Aísla el proveedor detrás de una interfaz de dominio.
- Guarda timestamp de actualización y procedencia.
- Distingue observación, predicción, radar y alerta.
- Expresa claramente la antigüedad del dato cuando se use cache.

## Alertas
- Evita duplicados.
- Permite severidad/prioridad.
- Las reglas deben poder evolucionar sin reescribir la UI.
- Una alerta local derivada debe conservar el dato que la originó.
- Si la fuente oficial no está disponible, no presentes cache antigua como información actual.

## Offline
La última información válida puede mostrarse offline con fecha/hora de actualización. Nunca inventes datos para rellenar huecos.

## Integración
Mantén preparada la sustitución o combinación de AEMET u otras fuentes mediante adaptadores desacoplados.
