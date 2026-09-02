# Decisión de arquitectura técnica V1 — Mágina Olivo

Fecha: 2026-09-02
Estado: propuesta adoptada para iniciar fundación técnica, pendiente únicamente de validación en spike.

## Objetivo

Elegir una arquitectura mantenible para una PWA agrícola móvil que pueda:

- conservar datos durante años;
- soportar varias explotaciones y miembros;
- manejar documentos privados;
- funcionar con conectividad irregular;
- integrar AEMET, RAIF, SIGPAC y proveedores de almazara mediante adapters;
- crecer sin depender de una API de IA;
- poder desplegarse en infraestructura propia mediante contenedores.

## Decisión

### Frontend

- React + TypeScript + Vite.
- PWA instalable.
- Service worker para shell de aplicación, assets y estrategias de caché.
- IndexedDB para borradores, datos recientes y cola local de escrituras.
- Dexie como wrapper candidato de IndexedDB, sujeto a spike técnico.

### Backend

- Node.js LTS + TypeScript.
- Fastify como servidor HTTP/API.
- API propia versionada: `/api/v1/...`.
- Validación de entrada/salida basada en esquemas.
- Separación por dominios: identity, holdings, field, campaign, deliveries, results, documents, imports, cooperatives, alerts, automations.

### Base de datos

- PostgreSQL como fuente de verdad de datos estructurados.
- Migraciones SQL versionadas en repositorio.
- UUIDs internos para entidades sincronizables/offline.
- Constraints e índices en base de datos, no solo en frontend.
- Campos derivados reconstruibles desde eventos/registros base.

Para el piloto se recomienda una versión estable y soportada de PostgreSQL, evitando versiones beta.

### Autenticación

- Sesiones seguras server-side/cookie según librería elegida.
- Better Auth es el candidato inicial porque soporta email/password, recuperación de contraseña y PostgreSQL.
- No implementar criptografía de contraseñas propia.
- Verificación de email antes de habilitar funciones sensibles en la versión pública.
- Rate limiting en login/reset y controles antiabuso.

La librería de autenticación podrá sustituirse sin alterar las entidades de negocio.

### Documentos y fotografías

Separar metadatos de archivo y binario:

- PostgreSQL: propietario, tipo, hash, tamaño, relaciones, estado.
- Object storage: bytes del PDF/foto/ticket.

Candidato de producción: Cloudflare R2 mediante API S3-compatible.

Razones:

- documentos privados independientes del ciclo de vida de la base de datos;
- URLs firmadas/de corta duración;
- buena escalabilidad;
- posibilidad de backups independientes;
- coste reducido para un piloto.

En desarrollo local puede usarse almacenamiento S3-compatible local o un adapter filesystem explícitamente no productivo.

### Automatizaciones

No ejecutar trabajos periódicos dentro del navegador.

Backend/worker responsable de:

- ingestión AEMET;
- ingestión RAIF;
- comprobación de tareas vencidas;
- entregas pendientes de rendimiento;
- resúmenes diarios/semanales;
- mantenimiento de importaciones;
- notificaciones.

Diseño inicial:

`API -> tabla jobs/outbox -> worker -> adapters externos`

No introducir una plataforma compleja de colas hasta que el volumen lo justifique. PostgreSQL puede almacenar jobs V1 con locking y reintentos controlados.

### IA

Proveedor de IA detrás de `AiProvider` y exclusivamente en backend.

Ninguna tabla agrícola tendrá dependencia obligatoria de campos generados por IA.

Funciones futuras:

- extracción de ticket/PDF;
- lenguaje natural a borrador de labor;
- consulta/resumen de datos autorizados.

Siempre: salida estructurada -> validación -> preview -> confirmación humana.

## Por qué PostgreSQL y no PocketBase como fuente principal

PocketBase es muy atractivo para prototipos por su binario pequeño, SQLite, auth, API y panel integrado. Sin embargo, su documentación oficial continúa indicando que está en desarrollo activo y que la compatibilidad completa no está garantizada antes de v1.0; además desaconseja su uso en aplicaciones críticas si no se acepta gestionar migraciones manuales ocasionales.

Mágina Olivo pretende conservar campañas, documentos y trazabilidad durante años. Para ese núcleo se prioriza una base relacional madura y una API propia.

PocketBase podría seguir utilizándose en prototipos aislados o herramientas internas, pero no será una dependencia de la arquitectura V1.

## Por qué no Supabase/Firebase como dependencia obligatoria

No existe un rechazo técnico a esos servicios. La decisión es mantener:

- portabilidad;
- posibilidad de self-hosting;
- control de costes;
- dominio de datos claro;
- API propia estable ante cambios de proveedor.

Un PostgreSQL gestionado podría reemplazar al PostgreSQL self-hosted sin cambiar el modelo funcional.

## Monorepo objetivo

```text
magina-olivo/
├── apps/
│   ├── web/          # React PWA
│   ├── api/          # Fastify API
│   └── worker/       # jobs/automatizaciones
├── packages/
│   ├── contracts/    # tipos/esquemas compartidos
│   ├── domain/       # lógica de negocio pura
│   └── config/
├── db/
│   ├── migrations/
│   └── seeds/
├── docs/
└── infra/
    ├── docker/
    └── backup/
```

No crear `apps/worker` separado si el spike demuestra que basta con un proceso API + worker mode compartiendo código; la separación lógica sí debe mantenerse.

## API

Convenciones:

- `/api/v1/holdings`
- `/api/v1/farms`
- `/api/v1/plots`
- `/api/v1/campaigns`
- `/api/v1/deliveries`
- `/api/v1/results`
- `/api/v1/activities`
- `/api/v1/documents`
- `/api/v1/imports`
- `/api/v1/cooperatives`
- `/api/v1/alerts`

Toda operación privada valida la membresía del `holding` en backend.

## IDs y concurrencia

- UUID generado antes de sincronizar cuando sea necesario crear offline.
- `created_at` / `updated_at` del servidor.
- versión o `updated_at` usado para optimistic concurrency en entidades editables.
- idempotency key en operaciones susceptibles de reenvío offline/importación.
- no confiar en timestamps del teléfono como única fuente de orden global.

## Backups

Como mínimo antes de piloto real:

- backup automatizado de PostgreSQL;
- copia/versionado de object storage;
- restauración probada, no solo backup creado;
- política de retención documentada;
- credenciales y secretos fuera de Git.

## Seguridad mínima

- HTTPS obligatorio.
- cookies seguras/HttpOnly/SameSite cuando aplique.
- CSRF según modelo de sesión.
- rate limiting.
- validación estricta de MIME/tamaño de archivos.
- nombres de archivo internos aleatorios.
- autorización de descarga comprobada por backend.
- logs sin tokens ni contenido privado completo.
- separación de secretos por entorno.

## Decisiones aplazadas intencionadamente

- ORM/query builder definitivo: elegir tras spike pequeño, sin acoplar dominio a él.
- proveedor de email transaccional.
- proveedor final de hosting.
- servicio push dedicado o Web Push propio.
- proveedor de IA.
- integración directa con un proveedor de almazaras.

## Spike técnico de entrada

Antes del MVP completo, construir una prueba vertical mínima:

`login -> explotación -> parcela -> entrega -> resultado -> offline draft -> sync -> documento privado`

Criterio de éxito: demostrar autorización, migraciones, almacenamiento privado y reintento idempotente antes de ampliar módulos.