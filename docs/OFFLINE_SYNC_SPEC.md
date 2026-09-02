# Estrategia offline y sincronización V1 — Mágina Olivo

Fecha: 2026-09-02

## Objetivo

Permitir que las operaciones de campo más frecuentes no se pierdan cuando el móvil tenga mala cobertura, sin prometer una sincronización offline total que todavía no esté implementada y validada.

## Principio

La fuente de verdad es el servidor, pero el teléfono debe poder conservar trabajo pendiente de sincronizar.

No depender exclusivamente de Background Sync del navegador porque su soporte no es uniforme entre navegadores.

## Niveles V1

### O0 — Shell offline

La PWA abre aun sin red y muestra una pantalla útil en lugar de un error genérico.

Cachear:
- HTML/app shell;
- JS/CSS/versiones necesarias;
- iconos y recursos UI mínimos.

### O1 — Lectura reciente

IndexedDB conserva una proyección limitada de:
- explotación activa;
- fincas/parcelas recientes;
- campaña activa;
- cooperativas favoritas/recientes;
- últimas entregas;
- últimas labores;
- preferencias necesarias para formularios.

No replicar toda la cuenta indiscriminadamente.

### O2 — Borradores

Formularios críticos guardan borrador automáticamente:
- nueva entrega;
- nueva labor;
- observación;
- tarea;
- metadatos de documento antes de upload.

El usuario debe poder cerrar/reabrir la PWA sin perder el borrador.

### O3 — Cola de escrituras

Operaciones permitidas offline en piloto:
- crear entrega;
- crear labor/observación;
- crear tarea.

Cada operación local genera:
- `operation_id` UUID;
- `entity_id` UUID si crea entidad;
- tipo de operación;
- payload validado localmente;
- fecha local informativa;
- estado `pending/syncing/synced/failed/conflict`;
- número de intentos;
- último error sanitizado.

## Sincronización

La app intenta vaciar la cola cuando:

1. arranca con conexión;
2. vuelve a primer plano;
3. recibe evento `online`;
4. el usuario pulsa `Sincronizar`;
5. Background Sync está disponible y resulta seguro usarlo como mejora adicional.

Nunca depender solo del punto 5.

## Idempotencia

Toda escritura reenviable envía un `Idempotency-Key` estable basado en `operation_id`.

El backend conserva el resultado de operaciones procesadas el tiempo suficiente para evitar duplicar una entrega si:
- el navegador repite;
- se corta la respuesta;
- el usuario reabre la app;
- el service worker reintenta.

## Conflictos

### Crear entidad

Normalmente no hay conflicto si el UUID nació en cliente y el servidor no lo conoce.

### Editar entidad

Enviar versión conocida (`version` o `updated_at`).

Si el servidor ha cambiado desde esa versión:
- no sobrescribir automáticamente;
- marcar `conflict`;
- descargar versión actual;
- presentar una resolución simple al usuario.

### Borrar

No habilitar borrados definitivos offline en V1.

Archivar offline solo si se demuestra necesario durante piloto.

## Entregas offline

Campos mínimos offline:
- id;
- campaña;
- kilos;
- destino/cooperativa opcional pero recomendado;
- fecha/hora de la entrega;
- finca/parcela opcional;
- ticket opcional;
- notas.

El servidor calcula/valida los agregados de campaña después de sincronizar.

El móvil puede mostrar un total provisional claramente marcado si incluye elementos pendientes.

Ejemplo:

`18.420 kg sincronizados + 1.842 kg pendientes`

No presentar la suma provisional como dato confirmado del servidor.

## Fotos y documentos offline

Los binarios pueden ser pesados.

V1:
- permitir seleccionar/capturar foto;
- guardar referencia/blob local mientras el registro está pendiente;
- iniciar upload cuando haya conexión;
- no marcar documento como sincronizado hasta confirmar upload + metadata;
- limitar tamaño y comprimir imágenes de evidencia cuando no sea necesario conservar resolución original.

Para PDFs/documentos legales, conservar original cuando la política del producto así lo requiera.

## IndexedDB

Usar IndexedDB, no `localStorage`, para datos estructurados y blobs.

Tablas locales candidatas:
- `cache_holdings`
- `cache_farms`
- `cache_plots`
- `cache_campaigns`
- `cache_cooperatives`
- `drafts`
- `outbox`
- `pending_files`
- `sync_meta`

Dexie es candidato para simplificar esquema/versionado/transacciones.

## Persistencia local

Solicitar almacenamiento persistente (`navigator.storage.persist`) cuando el navegador lo permita y cuando exista una razón UX clara.

Aun así, nunca tratar IndexedDB como único backup: el objetivo es sincronizar con servidor.

## Privacidad local

No cachear de forma indefinida documentos sensibles completos si no son necesarios para el modo offline.

Al cerrar sesión:
- borrar tokens/sesión;
- limpiar datos privados cacheados salvo una política explícita segura;
- mantener únicamente recursos públicos del app shell.

En dispositivo compartido no debe quedar visible la última campaña tras logout.

## UI de estado

Mostrar un indicador discreto pero inequívoco:

- `Todo sincronizado`
- `3 cambios pendientes`
- `Sin conexión`
- `1 conflicto necesita revisión`

No usar solo color.

## Pruebas obligatorias

1. Crear entrega -> cortar red antes de respuesta -> reconectar -> una sola entrega en servidor.
2. Crear 5 labores sin red -> matar app -> abrir -> siguen pendientes.
3. Dos dispositivos editan el mismo registro -> no hay sobrescritura silenciosa.
4. Foto pendiente -> conexión inestable -> reintento sin duplicar documento.
5. Logout -> datos privados locales eliminados.
6. Actualización de PWA con cola pendiente -> migración local no pierde outbox.
7. Navegador sin Background Sync -> flujo sigue funcionando al reabrir app.

## Fuera de V1

- colaboración offline multiusuario avanzada;
- CRDT;
- edición concurrente compleja;
- réplica completa local de la base de datos;
- sincronización P2P entre dispositivos.