# Mágina Olivo — Integración Visual V2 + MVP Core V1

Fecha: 2026-09-03
Rama: `feat/integration-v2-mvp-v1`
Estado: **P0 integrado; pendiente validación contra staging real**

## Objetivo

Unificar la interfaz Visual V2 con el backend y las reglas de negocio ya validadas en `feat/mvp-core-v1`, sin crear una segunda aplicación ni una segunda fuente de verdad.

## Autoridades del proyecto

### Presentación

`feat/visual-v2-foundation` es la autoridad de:
- identidad visual;
- jerarquía de pantallas;
- lenguaje editorial;
- navegación;
- responsive;
- composición visual.

### Backend y reglas de negocio

`feat/mvp-core-v1` es la autoridad de:
- Fastify;
- PostgreSQL;
- Better Auth;
- sesiones;
- autorización server-side;
- holdings, fincas y parcelas;
- campañas, entregas y rendimientos;
- documentos privados;
- offline/outbox;
- idempotencia;
- cálculos deterministas;
- worker;
- seguridad y gates de staging.

## Decisión cerrada

La arquitectura de integración es:

```text
Visual V2
  -> componentes/presentación
  -> adaptadores o repositorios de frontend
  -> /api/v1 MVP Core
  -> Fastify
  -> PostgreSQL
```

Los repositorios demo se permiten únicamente para:
- capturas visuales;
- pruebas de presentación;
- desarrollo aislado de UI.

Nunca serán fuente de verdad en producción.

## Rebanadas integradas

La rama parte directamente de `feat/mvp-core-v1`.

### Base visual

- se conserva `App.tsx` y toda su lógica real;
- se conserva autenticación, API, offline y cálculos;
- se usa la capa Visual V2 sobre el flujo productivo;
- se reutiliza el logo aprobado existente en `/brand/magina-olivo-mark.svg`;
- no se copian valores demo desde Visual V2.

### Mi Campo

- explotación, fincas y parcelas proceden exclusivamente de `/api/v1`;
- la finca activa se mantiene como selección canónica del MVP Core;
- las parcelas conservan sus campos reales: superficie, olivos, riego y SIGPAC;
- formularios de explotación, finca y parcela siguen escribiendo contra la API real;
- la presentación de finca activa, tarjetas de parcela y formularios usa la jerarquía Visual V2;
- no se ha introducido `localStorage` como fuente de verdad alternativa.

### Cuaderno

- las labores se escriben contra la API real y mantienen outbox offline;
- tratamientos, abonado, riego, costes, notas, parcela y campaña siguen usando el modelo canónico;
- la historia de parcela unifica labores, entregas y rendimientos sin duplicar datos;
- existe resumen real por parcela y filtros `Todo / Labores / Entregas / Rendimientos`;
- el aviso CUE/SIEX se mantiene explícito: el cuaderno personal V1 no se presenta como registro oficial.

### Campaña y documentos

- campaña, entregas, kilos y rendimiento proceden del MVP Core y de sus cálculos deterministas;
- el formulario de entrega mantiene finca/parcela, destino, ticket, variedad, notas y outbox offline;
- los destinos reconocidos se diferencian de los destinos manuales sin bloquear la entrada libre;
- los tickets se validan en cliente y servidor para JPG/PNG/WEBP/PDF y máximo 10 MB;
- los documentos se almacenan de forma privada con SHA-256 y autorización por explotación;
- existe listado autenticado de documentos por campaña, sin exponer claves internas de almacenamiento;
- la bandeja `Tickets y documentos` se refresca automáticamente después de una subida y permite descarga autenticada;
- los metadatos de cada documento muestran la entrega vinculada cuando existe.

### Offline / sync

- IndexedDB mantiene la outbox separada por usuario;
- entrega y labor usan claves de idempotencia al sincronizar;
- la reconexión intenta sincronización automática;
- el cierre de sesión se bloquea cuando quedan cambios privados pendientes;
- la interfaz distingue `sin conexión`, `pendiente de sincronizar` y `sincronización fallida`;
- un fallo de sincronización conserva los datos y ofrece reintento explícito.

### Mágina pública

La navegación privada ya enlaza con las pantallas públicas reales y mantiene la separación de datos:

- `/magina/tiempo` — AEMET;
- `/magina/campo` — RAIF;
- `/magina/noticias` — noticias oficiales verificadas;
- `/magina/mercado` — contexto de mercado;
- `/magina/directorio` — cooperativas y almazaras.

Noticias mantiene política `metadata-only`: título, fecha, tema y URL oficial; no copia artículos completos.

## Orden P0

1. Login/sesión. ✅ presentación V2 sobre flujo real
2. Inicio/dashboard real. ✅ integración V2
3. Mi Campo: explotación -> finca -> parcela. ✅
4. Cuaderno/labores. ✅
5. Campaña -> entrega -> rendimiento. ✅
6. Documentos privados. ✅
7. Offline/sync. ✅ cierre visual y operativo
8. Meteorología y datos públicos. ✅ integrados en navegación
9. Directorio/mercado/noticias. ✅ integrados; ingestión de noticias sigue siendo curada hasta validar automatización oficial

## Reglas de integración

- Ningún dato real hardcodeado en JSX.
- Ningún cálculo crítico duplicado en frontend.
- Ninguna autorización trasladada al cliente.
- IDs y semántica del MVP Core son canónicos.
- Cambios visuales no pueden degradar accesibilidad ni objetivos táctiles.
- Offline/outbox y actualización PWA no se reescriben por motivos visuales.
- No introducir PocketBase como backend alternativo en esta línea.
- No fusionar a `main` antes de staging real y revisión de la integración.

## Gate de cierre de esta fase

El P0 de integración de código está cerrado cuando CI permanezca verde. La fase completa aún requiere:

- ejecutar el flujo `Login -> Inicio -> Mi Campo -> Parcela -> Cuaderno -> Campaña -> Entrega -> Rendimiento` contra staging real;
- comprobar almacenamiento privado con R2/S3 real;
- comprobar HTTPS, cookies, Cloudflare Access y aislamiento;
- ejecutar accesibilidad y PWA/offline manual en navegador real;
- validar backup/restore aislado;
- confirmar que el bundle no contiene secretos y que no existe dependencia productiva de `demoRepositories`.

## Siguiente paso

No añadir otra arquitectura. Preparar y ejecutar el **primer staging real navegable** siguiendo:

- `docs/mvp/STAGING_EXECUTION_V1.md`;
- `docs/mvp/STAGING_ACCEPTANCE_V1.md`;
- `docs/mvp/ACCESSIBILITY_GATE_V1.md`.

Hasta disponer del host delante, continuar únicamente con trabajo preparatorio de staging, pruebas y pulido que no requiera secretos ni infraestructura externa. No fusionar todavía a `main`.
