# Entornos y despliegue V1 — Mágina Olivo

Estado: diseño de fundación técnica.

## Objetivo

Evitar que desarrollo, pruebas y producción compartan datos, secretos o infraestructura de forma peligrosa.

## Entornos

### local

Para desarrollo diario.

- frontend local;
- API local;
- PostgreSQL local/container;
- object storage local compatible o filesystem temporal solo para desarrollo;
- correo capturado/local;
- datos sintéticos.

Nunca usar una copia real de producción por comodidad.

### test/CI

- base efímera limpia;
- migraciones desde cero;
- fixtures sintéticos;
- tests unit/integration/E2E;
- sin llamadas reales a AEMET/IA/correo salvo tests contractuales controlados.

### staging

Debe parecerse a producción, pero con:
- base independiente;
- bucket independiente;
- secretos independientes;
- dominio independiente;
- usuarios de prueba;
- integraciones externas en modo limitado cuando sea posible.

Staging no es un lugar para almacenar datos reales indefinidamente.

### production

- PostgreSQL persistente;
- object storage privado;
- backups externos;
- HTTPS obligatorio;
- observabilidad;
- despliegues versionados;
- secretos gestionados fuera del repositorio.

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
  ui/        # cuando llegue el diseño visual
  test-utils/
infra/
  docker/
  scripts/
```

`packages/contracts` debe albergar schemas/tipos compartidos sin importar código servidor hacia el navegador.

## Runtime

Spike recomendado:
- Node.js 24 LTS;
- Fastify 5;
- PostgreSQL 18.x;
- pnpm como candidato de workspace, a fijar al iniciar scaffold.

No usar Node Current como runtime principal de producción cuando exista LTS adecuado.

## Contenedores

Docker/Compose puede utilizarse para:
- PostgreSQL local;
- API/worker;
- entorno reproducible;
- staging/self-hosting.

No contenedizar por obligación el frontend estático si el proveedor de despliegue lo sirve mejor directamente.

## Topología de producción candidata

```text
Internet
   |
HTTPS / reverse proxy / tunnel
   |
Web estática/PWA ---- API
                       |
                    PostgreSQL
                       |
                 Worker / jobs
                       |
           Object storage privado
```

La ubicación física final (Raspberry/mini PC/VPS/cloud) no cambia el contrato lógico.

Para piloto se priorizará simplicidad y restauración frente a alta disponibilidad prematura.

## Dominio

Separación recomendada:
- `app.<dominio>` PWA;
- `api.<dominio>` API solo si aporta claridad;

Alternativa más simple: mismo origen y `/api`, que reduce CORS/cookies.

Para V1 se prefiere **mismo origen cuando sea viable**, porque simplifica cookies, CSRF y despliegue.

## Configuración

Todas las variables se validan al arrancar.

Ejemplos:
- `DATABASE_URL`
- `AUTH_SECRET`
- `APP_ORIGIN`
- `OBJECT_STORAGE_*`
- `AEMET_API_KEY`
- correo
- observabilidad

Un servicio no debe arrancar con configuración incompleta crítica.

## Secretos

- nunca en `.env` versionado;
- `.env.example` contiene solo nombres/valores ficticios;
- secretos distintos por entorno;
- rotación documentada;
- acceso mínimo.

## Migraciones en despliegue

Nunca ejecutar migraciones destructivas automáticamente sin control.

Pipeline candidato:
1. build/test;
2. backup si aplica;
3. migración compatible;
4. deploy API/worker;
5. smoke tests;
6. deploy web;
7. monitorización.

Preferir cambios expand/contract:
- añadir columna/tabla primero;
- desplegar código compatible;
- backfill;
- retirar campo antiguo después.

## Feature flags

Usar flags solo para riesgos reales, por ejemplo:
- importador nuevo;
- sincronización proveedor;
- IA;
- módulo regulatorio.

No convertir cada pantalla en una feature flag.

## Rollback

El rollback debe distinguir:
- código: volver a imagen/build anterior;
- base de datos: no asumir downgrade trivial;
- datos: restore solo con decisión explícita porque puede perder escrituras recientes.

Las migraciones deben diseñarse para que un rollback de código siga siendo posible cuando razonablemente se pueda.

## CI mínima

En cada PR técnico:
- install lockfile estricto;
- typecheck;
- lint;
- unit tests;
- integration tests con PostgreSQL;
- migraciones desde cero;
- build web/api/worker;
- análisis básico de dependencias/secretos cuando se configure.

En ramas de despliegue:
- E2E/smoke;
- artefactos versionados.

## CD

No activar despliegue automático a producción hasta que exista:
- staging útil;
- backups;
- restore probado;
- health checks;
- smoke tests;
- capacidad de rollback de código.

## Health checks

### API
- `/health/live`: proceso vivo, sin depender de servicios externos;
- `/health/ready`: comprueba dependencias mínimas como DB.

No llamar AEMET/R2 en cada health check.

### Worker
Heartbeat/estado de jobs observable sin exponer datos privados.

## Actualización PWA

El service worker debe tener estrategia de actualización segura.

Nunca eliminar IndexedDB/outbox pendiente al publicar una nueva versión.

Si hay una migración local incompatible:
- versionar schema local;
- migrar;
- probar con outbox pendiente;
- bloquear actualización destructiva hasta poder preservar datos.

## Ambientes y datos externos

AEMET/RAIF/SIGPAC deben consumirse por adapters.

En tests:
- fixtures grabadas/sintéticas;
- contract test puntual separado.

No gastar cuota ni hacer tests frágiles llamando APIs públicas en cada CI.

## Primer despliegue técnico (spike)

El spike vertical debe demostrar:
1. login;
2. crear holding/finca/parcela;
3. crear entrega;
4. añadir rendimiento;
5. upload privado de ticket;
6. apagar red y dejar entrega en outbox;
7. recuperar red y sincronizar una sola vez;
8. backup/restore básico de DB;
9. health checks;
10. logs con request id.

Solo tras superar este recorrido se amplía el MVP.
