# Mágina Olivo — Technical Spike Results

Estado: **EN PROGRESO**. Este documento registra únicamente evidencias ejecutadas; un criterio no probado no se marca como PASS por inferencia.

Fecha de evidencia: 2026-09-02.
Rama: `feat/technical-spike-v1`.
PR: #2, base `feat/foundation-v1`.
Último commit validado de esta tanda: `230cd16e35ffa3a317c8441831677136e38a06be`.
CI verde: `Technical Spike Smoke` run `33651303678`.
Entorno CI: Ubuntu 24.04, Node.js 24.20.0, PostgreSQL 18.6 en contenedor.

## PASS demostrado

### Runtime / build
- Node.js 24.20 fijado para el spike.
- TypeScript 6 strict y `erasableSyntaxOnly` en API.
- API typecheck verde.
- PWA typecheck/build verde.
- CI desde checkout limpio verde.

### PostgreSQL
- PostgreSQL 18.6 real levantado en CI.
- Better Auth migra sobre base vacía.
- migrador de dominio aplica `0001_business_core.sql` sobre base vacía.
- FK/checks del recorrido probado se ejecutan en PostgreSQL real.
- kilos y rendimientos persisten como `numeric`.
- el resumen de campaña se reconstruye desde entregas + resultado vigente.

### Auth / aislamiento
- registro email/password real mediante Better Auth.
- sesión por cookie utilizada para `/api/v1/me` y recursos privados.
- usuario sin sesión recibe 401.
- Usuario A/Holding A y Usuario B/Holding B creados en el mismo test.
- listados de holdings no se mezclan.
- usuario B recibe 404 al intentar operar sobre holding, finca, parcela, campaña, entrega, rendimiento y documento de A en los casos cubiertos.

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

### Idempotencia de entrega
- primera petición crea una única entrega.
- misma `Idempotency-Key` + mismo payload devuelve el mismo ID.
- el listado confirma que sigue existiendo una sola entrega.
- misma key + payload diferente devuelve 409 `IDEMPOTENCY_KEY_REUSED`.

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

### Offline / outbox
Tests unitarios con IndexedDB realista mediante `fake-indexeddb`:
- operación de entrega queda persistida en la outbox.
- reabrir la base conserva la operación.
- error de red incrementa intentos y no elimina la operación.
- HTTP 409 no elimina la operación.
- solo una respuesta 2xx confirmada elimina la operación.
- la sincronización reenvía la misma `Idempotency-Key` al backend.

### Documento privado
- storage local de spike fuera del frontend y con key interna generada.
- filename del usuario no forma parte de la ruta física.
- ticket se vincula a la entrega.
- propietario recupera exactamente los mismos bytes subidos.
- usuario B recibe 404 en metadatos.
- usuario B recibe 404 al intentar descargar contenido con el ID exacto.
- producción no permite usar silenciosamente el directorio local por defecto.

### Observabilidad básica
- liveness y readiness implementados.
- request IDs habilitados.
- cabeceras `authorization`, `cookie` y `set-cookie` redactadas en logs.

## Pendiente P0

Todavía NO se considera PASS global. Quedan, entre otros:
- lockfile reproducible comprometido en Git;
- worker real / compilación del worker;
- logout y revocación explícita de sesión;
- validación explícita de `HttpOnly`, `Secure`, CSRF/origin y recuperación de contraseña;
- timeline de parcela/campaña;
- indicador UI de pendiente/sincronizado;
- prueba de actualización PWA sin pérdida de outbox;
- separación de outbox por usuario/logout;
- concurrencia/optimistic locking 409 en ediciones;
- adapter productivo R2 o equivalente y flujo presignado;
- backup PostgreSQL automatizable;
- restore sobre entorno limpio;
- recuperación conjunta de DB + documentos tras restore;
- rate limiting auth;
- headers de seguridad/CSP;
- inspección explícita del bundle para secretos;
- jobs/worker y reintentos;
- decisión sobre RLS;
- staging real.

## Decisiones provisionales confirmadas por el spike

- PostgreSQL 18.x: **mantener**.
- Fastify 5 + Node 24: **mantener por ahora**.
- Better Auth: **viable**, pendiente de completar gates de sesión/seguridad antes de confirmación definitiva.
- PWA React/Vite: **viable**.
- IndexedDB + outbox + idempotencia backend: **mantener**.
- rendimiento separado de entrega: **confirmado**.
- almacenamiento privado detrás de adapter: **mantener**; el adapter local es solo de spike/desarrollo y no sustituye al object storage productivo.

## Próximo gate

`backup -> pérdida simulada -> restore limpio -> comprobar usuarios/holdings/finca/parcela/campaña/entregas/rendimientos/documento`

No ampliar el MVP masivamente hasta que restore y los restantes P0 estén verdes.
