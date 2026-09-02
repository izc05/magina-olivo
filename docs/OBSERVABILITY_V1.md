# Observabilidad V1 — Mágina Olivo

## Objetivo

Poder saber qué falla, dónde y con qué impacto sin convertir logs/analytics en una copia de los datos privados del agricultor.

## Tres señales principales

### Logs
Eventos estructurados de aplicación.

Campos candidatos:
- timestamp;
- level;
- service (`api`, `worker`);
- environment;
- request_id;
- route/action;
- status_code;
- duration_ms;
- user_id hash/ID interno cuando sea necesario;
- holding_id cuando sea necesario y permitido;
- error_code;
- integration/provider;
- job_id/import_id.

No registrar payload completo por defecto.

### Métricas

Iniciales:
- requests por ruta/status;
- latencia p50/p95/p99;
- errores 5xx;
- errores 4xx relevantes;
- conexiones DB/pool;
- jobs pendientes/fallidos;
- edad del job más antiguo;
- sincronizaciones offline exitosas/fallidas;
- conflictos 409;
- idempotency hits;
- documentos subidos/bytes;
- importaciones por estado;
- llamadas AEMET/RAIF;
- uso/cache hit de fuentes externas;
- notificaciones generadas/deduplicadas.

### Trazas

No son requisito para el primer commit, pero la arquitectura debe permitir OpenTelemetry o equivalente si el sistema crece.

Un `request_id` consistente aporta valor desde el primer día.

## Error taxonomy

Los fallos deben clasificarse con códigos estables.

Ejemplos:
- `AUTH_REQUIRED`
- `FORBIDDEN_HOLDING`
- `VALIDATION_ERROR`
- `VERSION_CONFLICT`
- `IDEMPOTENCY_MISMATCH`
- `DOCUMENT_UPLOAD_FAILED`
- `IMPORT_PARSE_FAILED`
- `IMPORT_DUPLICATE`
- `WEATHER_PROVIDER_UNAVAILABLE`
- `JOB_RETRY_EXHAUSTED`

La UI puede traducir estos códigos a mensajes humanos sin depender del texto interno del error.

## Privacidad

Prohibido en logs estándar:
- passwords;
- cookies/session tokens;
- reset tokens;
- API keys;
- contenido de tickets/PDF/fotos;
- notas completas del usuario;
- direcciones completas si no son necesarias;
- respuestas completas de proveedores que contengan datos privados.

Si se necesita depuración puntual con contenido sensible, debe existir procedimiento temporal, acceso limitado y eliminación posterior.

## Request ID

Cada petición recibe `request_id`.

- aceptar uno confiable del edge solo si está controlado;
- si no, generar UUID;
- devolverlo en errores;
- propagarlo a DB/audit/job cuando corresponda.

Así soporte puede investigar un fallo sin pedir al usuario capturas de datos privados.

## Jobs

Cada ejecución programada registra:
- job id;
- tipo;
- scheduled_at;
- started_at;
- finished_at;
- attempt;
- resultado;
- error code;
- next retry.

Alertas candidatas:
- cola creciendo durante X minutos;
- job crítico agotó reintentos;
- AEMET sin actualización dentro de ventana esperada;
- backup no ejecutado;
- restore drill vencido.

## Fuentes externas

Registrar por proveedor:
- latencia;
- status;
- rate limit restante si se expone y es útil;
- cache hit/miss;
- fecha del dato;
- errores por código;
- última sincronización exitosa.

Nunca hacer que la caída de RAIF/AEMET derribe la API agrícola principal.

## Métricas de producto para piloto

Sin analytics invasivo, medir:
- tiempo hasta guardar entrega;
- número de pasos;
- porcentaje de entregas con parcela opcional;
- tiempo hasta añadir rendimiento;
- porcentaje de usuarios que completan onboarding;
- uso de offline/outbox;
- errores de formularios;
- frecuencia de documentos/tickets;
- tareas abandonadas.

Preferir eventos mínimos y agregables.

## Auditoría vs logs

`audit_events` es evidencia funcional/seguridad con retención deliberada.

Logs son diagnóstico operativo y pueden rotarse antes.

No usar logs como registro legal de cambios.

## Alertas

V1 debe evitar fatiga de alertas.

Alertas de alta prioridad:
- API no disponible;
- DB no disponible;
- backups fallando repetidamente;
- worker detenido con jobs vencidos;
- error anormal de autenticación;
- crecimiento de 5xx;
- almacenamiento casi lleno si self-hosted.

No alertar por cada 404 o fallo individual recuperable.

## Dashboards

Panel operativo mínimo:
1. salud API/DB/worker;
2. tasa de error/latencia;
3. jobs/outbox servidor;
4. integraciones AEMET/RAIF;
5. almacenamiento/documentos;
6. backups;
7. errores recientes por código.

## Retención

Definir antes de producción:
- logs debug: corta;
- logs info/error: según necesidad operativa;
- audit: mayor y justificada;
- métricas agregadas: más largas sin PII cuando sea posible.

La retención debe estar incluida en el análisis de privacidad.

## Criterios de aceptación del spike

- cada request tiene ID;
- un error E2E puede localizarse por request ID;
- no aparecen secretos/payloads sensibles en logs;
- métricas muestran latencia y 5xx;
- jobs exponen estado/reintentos;
- una caída simulada de proveedor externo se ve en observabilidad y no rompe el núcleo agrícola.
