# Mágina Olivo — Technical Spike Results

Estado: **EN PROGRESO, núcleo técnico + staging local reproducible verdes**. Este documento registra únicamente evidencias ejecutadas; un criterio no probado no se marca como PASS por inferencia.

Fecha de evidencia: 2026-09-02.
Rama: `feat/technical-spike-v1`.
PR: #2, base `feat/foundation-v1`.
Último commit validado de esta tanda: `1fb3a1bb890a71895ab359cf789ee37c86277a40`.
CI verde: `Technical Spike Smoke` run `33676771660`, job `100403716460`.
Entorno CI: Ubuntu 24.04, Node.js 24.20.0, PostgreSQL 18.6 y Docker Compose.

## PASS demostrado

### Runtime / build reproducible
- Node.js 24.20 fijado para el spike.
- TypeScript 6 strict y `erasableSyntaxOnly` en API/worker.
- `package-lock.json` lockfileVersion 3 comprometido en Git.
- instalación limpia mediante `npm ci` verde.
- API typecheck verde.
- worker typecheck verde.
- PWA typecheck/build verde.
- CI desde checkout limpio verde.
- inspección del bundle PWA no encuentra `BETTER_AUTH_SECRET`, `DATABASE_URL`, credencial CI ni contraseña sintética del smoke.

### PostgreSQL
- PostgreSQL 18.6 real levantado en CI.
- Better Auth migra sobre base vacía mediante `getMigrations()` de la dependencia bloqueada, sin descargar CLI durante deploy.
- migrador de dominio aplica `0001_business_core.sql`, `0002_job_queue.sql` y `0003_job_queue_recovery.sql` sobre base vacía.
- FK/checks del recorrido probado se ejecutan en PostgreSQL real.
- kilos y rendimientos persisten como `numeric`.
- el resumen de campaña se reconstruye desde entregas + resultado vigente.
- la cola de jobs es persistente en PostgreSQL.
- staging usa el layout persistente correcto de PostgreSQL 18: volumen en `/var/lib/postgresql`.

### Auth / sesión / aislamiento
- registro email/password real mediante Better Auth.
- sesión por cookie utilizada para `/api/v1/me` y recursos privados.
- cabecera de sesión comprobada con `HttpOnly` y `SameSite=Lax` en CI HTTP.
- logout real mediante `POST /api/auth/sign-out` invalida la sesión: `/api/v1/me` devuelve 401 después.
- usuario sin sesión recibe 401.
- Usuario A/Holding A y Usuario B/Holding B creados en el mismo test.
- listados de holdings no se mezclan.
- usuario B recibe 404 al intentar operar sobre holding, finca, parcela, campaña, entrega, rendimiento, timeline y documento de A en los casos cubiertos.

`Secure` no se marca todavía como end-to-end: la configuración lo activa en producción, pero debe demostrarse bajo HTTPS real en staging externo.

### Origin / CSRF / headers
- Better Auth mantiene comprobaciones CSRF/origin activadas.
- mutación `/api/v1` con `Origin: https://evil.example` + `Sec-Fetch-Site: cross-site` devuelve 403.
- origen permitido llega hasta la validación normal del payload.
- respuestas privadas comprobadas con:
  - `Cache-Control: no-store`;
  - `X-Content-Type-Options: nosniff`;
  - `X-Frame-Options: DENY`;
  - CSP restrictiva para API;
  - `Referrer-Policy: no-referrer` configurada;
  - `Cross-Origin-Resource-Policy: same-origin` configurada.
- rate limiting de autenticación demostrado: una ráfaga limitada de logins fallidos termina en HTTP 429.

### Higiene de logs
- logger de API redacta `authorization`, `cookie` y `set-cookie`.
- el workflow actual ya no imprime las respuestas de signup que contienen token.
- los logs históricos de ejecuciones anteriores no se consideran borrados; el cambio evita nuevas exposiciones equivalentes en el smoke.

### Flujo agrícola vertical
- crear explotación.
- crear finca.
- crear parcela.
- crear campaña 2026/27.
- registrar entrega `1842.000 kg`.
- listar la entrega en la campaña.
- añadir rendimiento posterior `21.7000 %`.
- corregirlo a `21.9000 %` conservando el anterior como `superseded`.
- adjuntar ticket privado a la entrega.
- reconstruir timeline privado de parcela con entrega + rendimiento vigente.

### Idempotencia de entrega
- primera petición crea una única entrega.
- misma `Idempotency-Key` + mismo payload devuelve el mismo ID.
- el listado confirma que sigue existiendo una sola entrega.
- misma key + payload diferente devuelve 409 `IDEMPOTENCY_KEY_REUSED`.

### Concurrencia
Caso demostrado sobre la entrega `004281`:
- edición con `version=1` se confirma y eleva el recurso a `version=2`;
- segundo cliente con versión obsoleta `1` recibe 409 `DELIVERY_VERSION_CONFLICT`;
- usuario B recibe 404 al intentar editar;
- la nota de la primera edición permanece en PostgreSQL;
- versión 2 + nota sobreviven al backup/restore.

No existe `last-write-wins` silencioso para esta edición probada.

### Resumen de campaña
Caso probado:
- entrega 1: `1842.000 kg`, rendimiento vigente `21.9000 %`;
- entrega 2: `1000.000 kg`, sin rendimiento.

Resultado probado:
- `deliveriesCount = 2`;
- `totalKilograms = 2842.000`;
- `deliveriesWithResult = 1`;
- `pendingResultCount = 1`;
- `resultCoveredKilograms = 1842.000`;
- `coveragePercent = 64.8135`;
- `weightedYieldPercent = 21.9000`.

Esto demuestra que la API no presenta una media parcial sin exponer también la cobertura de kilos.

### Timeline de parcela
- timeline no mantiene una copia mutable de eventos: se reconstruye desde registros fuente.
- para `Parcela Norte` devuelve la entrega `1842.000 kg` y el rendimiento vigente `21.9000 %`.
- `21.7000 %` superseded no aparece como rendimiento actual de la timeline.
- usuario B recibe 404 aun conociendo el ID de parcela.

### Offline / outbox
Tests unitarios con IndexedDB mediante `fake-indexeddb`:
- operación de entrega queda persistida en la outbox.
- reabrir la base conserva la operación.
- error de red incrementa intentos y no elimina la operación.
- HTTP 409 no elimina la operación.
- solo una respuesta 2xx confirmada elimina la operación.
- la sincronización reenvía la misma `Idempotency-Key` al backend.
- outbox está separada por `ownerUserId`.
- dos usuarios pueden usar la misma key raw sin colisionar localmente.
- sincronizar B no lee, envía ni elimina operaciones pendientes de A.
- limpiar la outbox de un usuario no requiere borrar la del otro.

### Documento privado / object storage
- storage local de spike fuera del frontend y con key interna generada.
- filename del usuario no forma parte de la ruta física.
- ticket se vincula a la entrega.
- propietario recupera exactamente los mismos bytes subidos.
- usuario B recibe 404 en metadatos.
- usuario B recibe 404 al intentar descargar contenido con el ID exacto.
- SHA-256 del objeto se conserva y verifica durante restore.
- adapter S3-compatible implementado con AWS SDK v3 para R2/S3.
- configuración S3 requiere endpoint, bucket y credenciales solo de servidor.
- `NODE_ENV=production` + storage local falla de forma explícita.
- `NODE_ENV=production` + configuración S3 válida inicializa el adapter sin fallback local.

Todavía falta probar PUT/GET/DELETE contra un bucket R2 real; la compatibilidad externa no se marca como demostrada solo por inicializar el cliente.

### Backup / restore
Gate ejecutado en CI sobre datos creados mediante la API, no fixtures SQL preconstruidos:

1. crea dump PostgreSQL custom-format con herramientas PG18;
2. copia dump fuera del contenedor;
3. copia documentos independientemente;
4. elimina el almacenamiento documental vivo para simular pérdida;
5. crea base limpia `magina_restore`;
6. restaura PostgreSQL;
7. restaura documentos;
8. verifica registros, valores y checksum.

Comprobado tras restore:
- 2 holdings;
- 1 finca;
- 1 parcela;
- 1 campaña;
- 2 entregas;
- 2 filas históricas de rendimiento;
- `21.9000` vigente;
- `21.7000` superseded;
- 1 documento y vínculo a entrega;
- edición concurrente conservada (`version=2` + nota correcta);
- contenido exacto y SHA-256 del ticket privado.

### Worker / jobs
- `apps/worker` ejecuta TypeScript estricto sobre Node 24.
- cola persistente `job_queue` en PostgreSQL.
- claim usa `FOR UPDATE SKIP LOCKED` para evitar doble toma concurrente.
- job `spike.noop` pasa a `succeeded` con `attempts=1` y libera lock.
- job no soportado pasa a `retry` con `attempts=1`, `last_error` y `run_after` futuro.
- worker usa lease temporal configurable (`WORKER_LEASE_SECONDS`).
- job `running` abandonado con lease vencida es reclamado por otro worker y completa con nuevo intento.
- job con lease vigente no es robado ni modificado.
- job abandonado que ya agotó `max_attempts` termina en `failed` y libera el lock.
- logs del worker son estructurados con job id/kind/attempts.

### Staging Docker aislado
Gate ejecutado en GitHub Actions con Docker Compose real:
- construye imagen runtime Node 24 para API/worker/migraciones.
- construye PWA y la sirve con Nginx.
- arranca PostgreSQL 18.6 con volumen persistente en el layout correcto de PG18.
- ejecuta migración Better Auth desde dependencia bloqueada y después migraciones del dominio.
- arranca API y espera `/health/ready`.
- arranca worker.
- Nginx expone una única entrada same-origin y proxy de `/api` + `/health`.
- el gate recupera la PWA desde el puerto loopback.
- API `3001` no publica puerto host.
- PostgreSQL `5432` no publica puerto host.
- la red de datos de PostgreSQL es interna en Compose.
- el stack se destruye con volúmenes al acabar el CI sintético.

### Observabilidad básica
- liveness y readiness implementados.
- request IDs habilitados.
- errores API del dominio incluyen `request_id`.
- logs API estructurados por Fastify/Pino.
- worker expone estado/reintentos en base y eventos estructurados en logs.

## Pendiente P0 antes de piloto/producción

El núcleo y el staging local reproducible están verdes, pero todavía NO se considera listo para agricultores reales. Quedan:

- staging externo HTTPS real y comprobación end-to-end de cookie `Secure` detrás de Cloudflare Tunnel/proxy;
- PUT/GET/DELETE real contra bucket privado Cloudflare R2 o S3-compatible elegido;
- recuperación de contraseña/correo real o bloqueo explícito de piloto hasta implementarla;
- copia de backup fuera del host principal en staging/operación, no solo bundle CI;
- UI real de `pendiente/sincronizado/error` integrada con la outbox;
- prueba de actualización del service worker/PWA sin pérdida de outbox;
- política de logout en UI respecto a operaciones pendientes (no mezclar usuarios; decidir conservar vs advertir/borrar);
- deploy y rollback probados sobre un host de staging real;
- restore probado sobre staging real, incluyendo object storage;
- decisión final sobre RLS como defensa adicional en PostgreSQL.

## P1 posterior al núcleo

- adapters AEMET/RAIF/SIGPAC reales;
- importaciones CSV/PDF con staging/preview;
- actividades/labores completas;
- notificaciones y scheduling real;
- integración autorizada con proveedores/cooperativas;
- capa de IA opcional.

## Decisiones confirmadas por el spike

- PostgreSQL 18.x: **mantener**.
- Fastify 5 + Node 24: **mantener**.
- Better Auth: **mantener para continuar**, con HTTPS/password-recovery todavía como gates operativos.
- migraciones Better Auth programáticas desde dependencia bloqueada: **mantener** para CI/staging/deploy.
- PWA React/Vite: **mantener**.
- IndexedDB + outbox por usuario + idempotencia backend: **mantener**.
- rendimiento separado de entrega: **confirmado**.
- optimistic concurrency mediante versión: **mantener para recursos sensibles**.
- worker PostgreSQL con lease/recovery: **válido como base duradera para tareas críticas**.
- almacenamiento privado detrás de adapter: **mantener**; local solo desarrollo/CI y S3/R2 para staging/producción.
- staging Docker same-origin con una única entrada loopback: **mantener** como arquitectura de despliegue inicial.

## Próximo gate

El próximo bloque es externo al CI local:

`host staging -> Cloudflare Tunnel HTTPS -> cookie Secure -> R2 real -> deploy/rollback -> restore staging`

En paralelo puede integrarse la UI final del otro hilo sobre los contratos ya validados.
