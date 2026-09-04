# Estadísticas comerciales avanzadas — Mágina Olivo

## Objetivo

Dar al anunciante evidencia útil del rendimiento de su presencia comercial sin introducir seguimiento personal ni acceso a datos agrícolas privados.

## Superficie del anunciante

Ruta: `/anunciante/estadisticas`.

Cada cuenta solo puede consultar un `advertiser_id` para el que tenga una membresía activa en `advertiser_portal_memberships`.

Periodos disponibles:
- 30 días;
- 90 días;
- 365 días.

Incluye:
- impresiones;
- interacciones;
- tasa de acción;
- días con actividad;
- evolución diaria/semanal/mensual;
- desglose por llamada, WhatsApp, web y apertura de ficha;
- rendimiento por municipio;
- rendimiento por placement;
- histórico por campaña;
- exportación CSV agregada por día/tipo de evento.

La exportación CSV no contiene IP, usuario visitante, sesión, explotación, parcela, coordenadas ni identificadores de navegación.

## Benchmark administrativo

Ruta: `/admin/estadisticas`.

Disponible para `commercial` y `superadmin` mediante la misma autorización server-side de los módulos comerciales.

Compara de forma agregada:
- Destacado (`featured`);
- Premium (`premium`).

Métricas:
- anunciantes en cohorte;
- impresiones;
- interacciones;
- tasa de acción;
- impresiones por anunciante;
- acciones por anunciante.

### Protección de cohortes pequeñas

No se muestran métricas de un plan si la cohorte tiene menos de 3 anunciantes. En ese caso la respuesta devuelve `suppressed: true`.

Esto evita que una media o total de una cohorte de una o dos empresas se convierta en un dato comercial casi individual.

## Datos fuente

Se utiliza exclusivamente `advertising_events`, cuyo contrato ya prohíbe persistir IP, coordenadas precisas de parcela o identificadores de explotación/usuario.

No se añade una migración nueva para este bloque.

## Límites intencionados

- No se afirma que una impresión equivalga a una persona única.
- No se calcula conversión a venta porque Mágina Olivo no conoce la venta real del anunciante.
- No hay píxeles de terceros ni cookies publicitarias nuevas.
- No se comparte el rendimiento individual de otro anunciante.
- La comparación Destacado/Premium es orientativa y depende del volumen/madurez de la muestra.
- El CSV es un informe comercial de métricas, no una factura ni justificante de cobro.

## Privacidad

Todas las respuestas privadas usan `Cache-Control: private, no-store`.

La autorización del anunciante se resuelve server-side por `(advertiser_id, user_id)` y el benchmark administrativo requiere rol comercial.
