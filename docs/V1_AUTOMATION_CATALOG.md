# Catálogo de automatizaciones V1 — Mágina Olivo

Fecha: 2026-09-02

## Objetivo

Definir automatizaciones que aportan valor real al MVP y los datos que necesitan, sin usar IA salvo cuando sea imprescindible.

## A. Automatizaciones de campaña

### A1. Total de kilos

Trigger: crear/editar/eliminar entrega.

Resultado:

- kilos totales campaña;
- kilos por cooperativa;
- kilos por parcela/finca cuando se haya indicado origen;
- número de entregas.

IA: no.

### A2. Rendimiento medio ponderado

Trigger: añadir/modificar rendimiento asociado a entrega o lote.

Cálculo base:

`sum(kilos * rendimiento) / sum(kilos con rendimiento)`

Mostrar siempre cuánto peso de campaña está cubierto por rendimientos conocidos para no dar una media engañosa.

IA: no.

### A3. Entregas pendientes de rendimiento

Trigger: job diario.

Condición configurable: entrega con X días de antigüedad sin rendimiento.

Resultado: recordatorio agrupado.

IA: no.

### A4. Comparativa con campaña anterior

Trigger: cálculo on-demand/cache invalidable.

Métricas:

- kilos;
- número de entregas;
- rendimiento medio;
- fechas de inicio/fin;
- kilos por finca/parcela;
- costes cuando exista el módulo.

IA: no para el cálculo. IA opcional en el futuro para redactar explicación.

## B. Meteorología

### B1. Snapshot meteorológico

Trigger: programado cada varias horas según proveedor/límites.

Ámbito: coordenadas de finca/parcela o ubicación agregada.

Guardar solo el subconjunto necesario y la fecha/validez del pronóstico.

IA: no.

### B2. Riesgo de lluvia para tarea

Trigger: actualización meteorológica + tarea futura.

Ejemplo:

- tarea sensible a lluvia en próximas 24/48 h;
- precipitación/probabilidad supera umbral configurable;
- emitir aviso informativo.

No presentar como recomendación agronómica profesional.

IA: no.

### B3. Helada / calor / viento

Trigger: actualización meteorológica.

Umbrales configurables por tipo de aviso.

Evitar duplicados durante una misma ventana meteorológica.

IA: no.

## C. RAIF / sanidad vegetal

### C1. Sincronización RAIF

Trigger: semanal, alineado con la frecuencia de publicación; no tiene sentido consultar compulsivamente.

Proceso:

1. detectar nueva versión/fecha;
2. descargar/reprocesar dataset relevante;
3. normalizar datos de Jaén/municipios objetivo;
4. guardar procedencia y fecha;
5. publicar solo cuando el lote sea válido.

IA: no.

### C2. Panel fitosanitario local

Trigger: nuevo lote RAIF.

Resultado: información por ámbito geográfico con fuente y fecha.

Nunca inferir automáticamente que la finca del usuario está infectada.

IA: no.

### C3. Aviso de cambio relevante RAIF

Futuro/post-MVP.

Solo si se define una regla agronómica segura y verificable. Preferir avisos de "nueva información disponible" frente a prescripciones.

## D. Labores y cuaderno

### D1. Recordatorios

Trigger: hora/día programado.

- labor prevista próxima;
- labor vencida;
- recordatorio creado manualmente.

IA: no.

### D2. Historial automático de parcela

Trigger: cualquier labor/entrega/documento asociado.

Resultado: timeline ordenada.

IA: no.

### D3. Resumen operativo diario

Trigger: una vez al día, solo para usuarios que lo activen.

Contenido determinista:

- tareas de hoy;
- avisos meteorológicos internos;
- entregas pendientes de completar;
- datos de campaña;
- nuevas alertas/fuentes.

IA: no necesaria. Una redacción IA sería opcional y posterior.

## E. Cooperativas

### E1. Verificación de datos públicos

No hacer scraping frecuente.

Cada registro público lleva:

- fuente;
- `verified_at`;
- estado `verified/stale/needs_review`.

La primera V1 puede usar revisión editorial/manual.

### E2. Avisos públicos

Solo para fuentes con mecanismo permitido y estable (RSS/API/feed o autorización). Si no existe, enlazar a la fuente oficial en vez de copiar/monitorizar agresivamente.

### E3. Importación de fichero del usuario

Trigger: usuario sube CSV/PDF/archivo soportado.

Proceso:

- identificar formato;
- parsear;
- mostrar borrador;
- detectar duplicados;
- confirmar;
- importar.

IA: no para CSV estructurado; opcional para documentos no estructurados.

## F. Integridad y seguridad

### F1. Backup

Trigger: programado.

- base de datos;
- almacenamiento documental según arquitectura;
- política de retención;
- prueba periódica de restauración.

IA: no.

### F2. Detección de jobs fallidos

Cada ejecución registra estado, duración, intento y error sanitizado.

Alertar al administrador solo cuando supere umbral de reintentos.

### F3. Deduplicación

Toda importación/sincronización externa debe ser idempotente.

## Orden de implementación recomendado

### MVP núcleo

1. A1 total kilos.
2. A2 rendimiento ponderado.
3. D2 timeline.
4. D1 recordatorios.

### V1 enriquecida

5. B1 meteorología.
6. B2/B3 avisos meteorológicos.
7. A3 pendiente de rendimiento.
8. D3 resumen diario.
9. C1/C2 RAIF.

### Después

10. E3 importaciones.
11. C3 alertas fitosanitarias avanzadas.
12. integraciones oficiales con cooperativas.

## Regla de coste

No ejecutar una automatización por usuario si puede resolverse de forma agregada.

Ejemplo: descargar RAIF una vez y filtrar localmente, no descargar el mismo dataset para cada agricultor.

## Regla de IA

Una automatización determinista nunca se sustituye por un LLM únicamente para hacerla parecer inteligente.
