# Decisión de arquitectura técnica — Mágina Olivo

Fecha: 2026-09-02
Estado: arquitectura candidata adoptada para spike; decisiones finas se validan con implementación.

## Objetivo

Elegir una base técnica durable para datos agrícolas históricos, PWA offline, documentos privados e integraciones progresivas, sin depender de IA ni de software de cooperativa.

## Stack del spike

### Frontend
- React + TypeScript + Vite.
- PWA instalable.
- IndexedDB para datos locales limitados, borradores y outbox.
- Dexie como wrapper candidato de IndexedDB, sujeto a spike técnico.
- contratos compartidos mediante package neutral.

### Runtime backend
- Node.js 24 LTS.
- Fastify 5 como framework API candidato.
- TypeScript strict.

Node 24 figura actualmente como LTS en la política oficial de Node.js; para producción se priorizan ramas LTS frente a Current.

### Base de datos
- PostgreSQL 18.x.
- Fuente de verdad del dominio.
- migraciones versionadas.
- `numeric` para kilos/rendimientos/cantidades exactas.

PostgreSQL 18 es la versión current soportada y 18.6 fue publicada el 13 de agosto de 2026.

### Auth
- Better Auth como candidato inicial.
- PostgreSQL para usuarios/sesiones.
- sesión server-side con cookie HttpOnly/Secure.
- autorización de holdings implementada en dominio/API, no delegada a la librería auth.

Better Auth documenta PostgreSQL, TypeScript y gestión tradicional de sesión/cookies; debe superar el spike antes de adopción final.

### Documentos
- object storage privado.
- Cloudflare R2 como candidato productivo por coste/simplicidad.
- metadata/document links en PostgreSQL.
- URLs temporales para acceso.

### Automatización
- worker Node/TypeScript.
- job outbox en PostgreSQL inicialmente.
- no Redis/queue externa hasta medir necesidad.

### Integraciones
Siempre:

`Proveedor -> Adapter -> contrato canónico -> dominio`

Nunca exponer el formato AEMET/RAIF/portal directamente al frontend como dependencia estable.

## Por qué PostgreSQL y no PocketBase como fuente de verdad V1

PocketBase es excelente para prototipos pequeños y sigue siendo útil en otros proyectos, pero su documentación oficial mantiene la advertencia pre-v1.0 y no recomienda aplicaciones críticas salvo aceptación de migraciones/cambios manuales.

Mágina Olivo pretende conservar años de:
- entregas;
- rendimientos;
- labores;
- documentos;
- campañas;
- trazabilidad.

Para ese núcleo se elige PostgreSQL.

Esto no significa que PostgreSQL sea suficiente por sí mismo: necesitamos migraciones, backups, restore, autorización y observabilidad bien implementados.

## Monorepo candidato

```text
apps/
  web/
  api/
  worker/
packages/
  contracts/
  db/
  config/
  ui/
  test-utils/
infra/
  docker/
  scripts/
```

`apps/worker` puede compartir proceso/código con API si el spike demuestra que simplifica operación; la separación lógica de jobs debe mantenerse.

## API

Base path:

`/api/v1`

Principios:
- schemas runtime;
- OpenAPI antes del MVP completo;
- idempotency key en escrituras con retry;
- versión/ETag para concurrencia;
- request id;
- autorización server-side;
- paginación cursor para históricos.

Ver `API_CONTRACT_V1.md`.

## Modelo de datos

Ver `DATABASE_SCHEMA_V1.md`.

Decisiones estructurales:
- `holding` como scope privado;
- entrega separada de resultado/rendimiento;
- documento binario fuera de PostgreSQL;
- importaciones pasan por staging;
- agregados reconstruibles;
- auditoría separada de logs.

## Multi-tenant

Unidad de aislamiento: `holding`.

Defensa obligatoria:
- membership/role en API;
- queries scoped;
- tests cross-holding.

Defensa adicional a evaluar:
- PostgreSQL Row Level Security.

RLS nunca sustituirá autorización del servicio si se adopta.

## Autenticación

Ver `AUTH_SESSION_V1.md`.

Objetivo:
- sesión server-side;
- cookie HttpOnly/Secure;
- no token de larga duración en localStorage;
- CSRF/CORS/origin checks;
- rate limiting;
- outbox namespaced por usuario/holding.

## Offline

Modelo:

```text
UI
 ↓
IndexedDB/outbox
 ↓
API /api/v1
 ↓
Idempotency
 ↓
PostgreSQL
```

Background Sync se considera optimización progresiva, no mecanismo único.

La sincronización también ocurre por:
- reconexión;
- apertura;
- foreground;
- acción manual.

## Entornos y despliegue

Ver `ENVIRONMENTS_DEPLOYMENT_V1.md`.

Separados:
- local;
- test/CI;
- staging;
- production.

Secretos y datos no se comparten entre ellos.

Preferencia topológica V1: mismo origen web/API cuando sea viable para simplificar cookies/CORS/CSRF.

## Observabilidad

Ver `OBSERVABILITY_V1.md`.

Desde el spike:
- logs estructurados;
- request id;
- health live/ready;
- métricas básicas de latencia/error/jobs;
- no payloads privados/secretos.

## Seguridad

Ver `THREAT_MODEL_V1.md`.

P0 antes de piloto:
- aislamiento cross-holding;
- cookies/sesiones;
- idempotencia offline;
- tickets privados;
- upload seguro;
- secretos;
- backups/restore.

## Estrategia ORM/query builder

No se fija por documentación.

El spike comparará el candidato elegido por:
- soporte PostgreSQL;
- migraciones claras;
- SQL observable;
- tipos;
- transacciones;
- facilidad para queries multi-tenant;
- compatibilidad con RLS si se adopta;
- mantenimiento.

La base de datos es el contrato durable; el ORM es reemplazable.

## Backups

Antes de piloto:
- backup PostgreSQL automatizable;
- copia fuera del host principal;
- estrategia object storage;
- restauración sobre entorno limpio;
- evidencia de restore documentada.

Un backup sin restore probado no supera el gate.

## Gate

Antes de ampliar el MVP debe pasar `TECHNICAL_SPIKE_ACCEPTANCE.md`.

Entre otras cosas debe probar realmente:
- login;
- holding A/B aislados;
- finca/parcela/campaña;
- entrega 1.842 kg;
- rendimiento 21,7 % posterior;
- ticket privado;
- retry sin duplicado;
- offline outbox;
- conflicto concurrente;
- backup/restore;
- health/observabilidad.

## Referencias oficiales verificadas al tomar la decisión

- Node.js Releases: https://nodejs.org/en/about/previous-releases
- Fastify v5 Migration/LTS: https://fastify.dev/docs/latest/Guides/Migration-Guide-V5/
- PostgreSQL 18: https://www.postgresql.org/docs/18/
- Better Auth PostgreSQL: https://better-auth.com/docs/adapters/postgresql
- Better Auth Session Management: https://better-auth.com/docs/concepts/session-management
- Better Auth Cookies: https://better-auth.com/docs/concepts/cookies

Estas referencias deben revisarse al ejecutar el spike si ha pasado tiempo o hay nuevas major versions.
