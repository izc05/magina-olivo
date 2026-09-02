# Mágina Olivo — Arquitectura V1

Fecha de consolidación: 2026-09-02

## Objetivo

Construir una PWA móvil, modular y mantenible para datos agrícolas de larga duración, conectividad irregular e integraciones progresivas, sin depender de IA ni de una API de cooperativa.

## Arquitectura lógica

```text
Usuario
  ↓
React PWA
  ├── Service Worker / caché
  ├── IndexedDB / borradores / outbox
  └── UI móvil
        ↓ HTTPS
Fastify API / TypeScript
  ├── Auth
  ├── Explotaciones / fincas / parcelas
  ├── Campañas
  ├── Entregas / resultados
  ├── Labores / tareas
  ├── Documentos
  ├── Importaciones
  ├── Cooperativas
  ├── Alertas
  └── Automatizaciones
        ↓
PostgreSQL                 Object Storage
(datos estructurados)      (fotos/PDF/tickets)
        ↓                         ↓
Worker / jobs / outbox -----------┘
  ├── AEMET
  ├── RAIF
  ├── SIGPAC
  ├── correo / push
  ├── proveedores de almazara autorizados
  └── IA opcional
```

## Stack adoptado para el spike V1

### Web

- React.
- TypeScript.
- Vite.
- PWA instalable.
- Service worker.
- IndexedDB; Dexie como candidato tras spike.

### API

- Node.js LTS.
- TypeScript.
- Fastify.
- API versionada bajo `/api/v1`.
- contratos/esquemas compartidos con frontend.

### Datos

- PostgreSQL como fuente de verdad.
- migraciones SQL versionadas;
- UUIDs internos;
- constraints de integridad en BD;
- optimistic concurrency en entidades editables;
- idempotency keys en escrituras reintentables.

### Auth

- Better Auth como candidato inicial para email/password + PostgreSQL.
- no desarrollar almacenamiento/algoritmos de contraseña propios;
- verificación de email y recuperación de contraseña antes de producción pública;
- autorización agrícola propia siempre comprobada además de autenticación.

### Archivos

- metadata en PostgreSQL;
- binarios en object storage;
- Cloudflare R2 como candidato productivo;
- URLs privadas/firmadas o proxy autorizado;
- nunca bucket público para documentos de usuarios.

## Monorepo objetivo

```text
magina-olivo/
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/          # puede compartir proceso inicialmente
├── packages/
│   ├── contracts/
│   ├── domain/
│   └── config/
├── db/
│   ├── migrations/
│   └── seeds/
├── infra/
│   ├── docker/
│   └── backup/
└── docs/
```

## Dominios

### identity
- usuarios;
- sesiones;
- preferencias.

### holdings
- explotaciones;
- miembros;
- permisos.

### field
- fincas;
- parcelas;
- SIGPAC;
- variedades.

### operations
- labores;
- tratamientos;
- riegos;
- recolecciones;
- tareas.

### production
- campañas;
- entregas;
- resultados/rendimientos;
- destinos.

### evidence
- documentos;
- fotografías;
- hashes;
- relaciones documentales.

### imports
- lotes;
- staging;
- parsers;
- conflictos;
- deduplicación.

### information
- cooperativas/almazaras;
- fuentes;
- meteorología;
- RAIF;
- avisos.

### automation
- jobs;
- outbox;
- ejecuciones;
- reintentos;
- notificaciones.

### optional-ai
- extracción;
- borradores estructurados;
- consultas autorizadas;
- auditoría de propuestas.

## API inicial

- `/api/v1/holdings`
- `/api/v1/farms`
- `/api/v1/plots`
- `/api/v1/campaigns`
- `/api/v1/deliveries`
- `/api/v1/results`
- `/api/v1/activities`
- `/api/v1/tasks`
- `/api/v1/documents`
- `/api/v1/imports`
- `/api/v1/cooperatives`
- `/api/v1/alerts`

El frontend nunca consulta PostgreSQL ni object storage con privilegios administrativos directos.

## Permisos

Toda consulta privada se autoriza contra la explotación (`holding`).

Roles preparados:
- owner;
- admin;
- collaborator;
- viewer.

Seleccionar una cooperativa como destino no le concede acceso a los datos del agricultor.

## Offline

V1 adopta una estrategia local explícita:

1. app shell cacheado;
2. lecturas recientes en IndexedDB;
3. autoguardado de borradores;
4. outbox local para crear entrega/labor/tarea;
5. sincronización al abrir, volver a primer plano, recuperar conexión o pulsar `Sincronizar`;
6. Background Sync solo como mejora cuando el navegador lo soporte;
7. conflictos visibles, nunca overwrite silencioso.

Ver `docs/OFFLINE_SYNC_SPEC.md`.

## Automatizaciones

No depender de cron del navegador.

Flujo:

```text
API / scheduler
     ↓
jobs/outbox en PostgreSQL
     ↓
worker
     ↓
adapter
     ↓
fuente externa / notificación
```

Antes de introducir Redis/RabbitMQ u otra cola, demostrar que el volumen V1 lo necesita.

Propiedades requeridas:
- idempotencia;
- locking;
- retries con backoff;
- dead/error state;
- observabilidad;
- ejecución aislada del request del usuario.

## Fuentes externas

Adapters independientes:

```text
WeatherProvider -> WeatherAdapter -> modelo interno
RaifSource      -> RaifAdapter    -> modelo interno
SigpacSource    -> SigpacAdapter  -> modelo interno
MillProvider    -> MillAdapter    -> contrato canónico importación
AiProvider      -> AiAdapter      -> respuesta estructurada
```

AEMET, RAIF o un proveedor de almazara pueden estar caídos sin romper entregas/labores/histórico.

Ver `docs/EXTERNAL_DATA_OPERATIONS.md`.

## IA

Solo backend.

```text
Usuario
  ↓
API valida identidad/permisos
  ↓
minimiza contexto
  ↓
AiProvider
  ↓
salida estructurada
  ↓
validación de esquema/reglas
  ↓
preview
  ↓
confirmación humana
  ↓
escritura agrícola normal
```

Nunca usar IA como fuente de verdad de kilos, rendimientos, estados normativos o cálculos de campaña.

## Seguridad

- HTTPS obligatorio;
- secretos solo servidor/secret store;
- sesiones/cookies seguras según auth final;
- rate limiting;
- validación de payloads;
- autorización server-side;
- validación de MIME/tamaño;
- nombres internos aleatorios;
- logs sin secretos ni documentos completos;
- entornos separados;
- datos sintéticos en desarrollo.

## Backups

Antes de piloto real:
- backup automático PostgreSQL;
- backup/versionado de object storage según estrategia elegida;
- retención documentada;
- cifrado/transporte seguro;
- prueba real de restauración;
- RPO/RTO iniciales documentados.

Un backup que nunca se ha restaurado no se considera validado.

## Observabilidad

Separar:
- errores de aplicación;
- auth/security events;
- fallos de adapters;
- jobs/retries;
- sync offline;
- importaciones/conflictos;
- consumo de APIs de pago;
- capacidad de almacenamiento.

## Decisión sobre PocketBase

No se adopta PocketBase como fuente de verdad productiva V1. Su facilidad sigue siendo valiosa para prototipos, pero la documentación oficial de PocketBase mantiene una advertencia pre-v1.0 sobre compatibilidad y aplicaciones críticas. Para el histórico agrícola de largo plazo se prioriza PostgreSQL + API propia.

## Decisiones aplazadas

Se decidirán mediante spike o cuando haya datos reales:
- ORM/query builder final;
- hosting final;
- proveedor de email;
- Web Push vs servicio dedicado;
- proveedor de IA;
- proveedor de mapas/base tiles;
- separación física del worker;
- integraciones directas de almazara.

## Spike vertical previo al MVP

Construir antes de ampliar módulos:

`registro/login -> explotación -> parcela -> entrega -> resultado -> borrador offline -> reintento idempotente -> documento privado`

Debe demostrar:
- migraciones;
- permisos;
- auth;
- PostgreSQL;
- storage privado;
- offline básico;
- idempotencia;
- backup/restore mínimo.

Si falla alguno de esos puntos, se corrige la fundación antes de construir más pantallas.