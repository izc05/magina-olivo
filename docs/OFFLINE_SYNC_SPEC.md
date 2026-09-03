# Estrategia offline y sincronización V1 — Mágina Olivo

Fecha inicial: 2026-09-02  
Estado actualizado: 2026-09-03

## Objetivo

Permitir que las operaciones de campo más frecuentes no se pierdan cuando el móvil tenga mala cobertura, sin ampliar la superficie de exposición de datos privados ni prometer una réplica offline que todavía no esté implementada y validada.

## Principio

La fuente de verdad es el servidor, pero el teléfono puede conservar **trabajo pendiente de sincronizar**.

No depender exclusivamente de Background Sync porque su soporte y comportamiento no son uniformes entre navegadores.

La seguridad de datos privados tiene prioridad sobre disponer de una copia completa local.

## Estado V1 piloto

### O0 — Shell offline — IMPLEMENTADO

La PWA conserva su shell y puede abrir aunque no haya red.

El service worker mantiene los recursos mínimos de aplicación necesarios para presentar una interfaz controlada.

No se cachean respuestas privadas de `/api/` mediante Workbox.

### O1 — Lectura privada tras cold-start — FAIL CLOSED EN PILOTO

La idea inicial contemplaba persistir una proyección de explotación, fincas, parcelas, campaña y registros recientes en IndexedDB.

**Esa caché privada persistente no se activa en el piloto V1.**

Decisión actual:

- durante una sesión ya abierta pueden reutilizarse lecturas recientes únicamente desde memoria;
- la memoria se elimina al recargar/cerrar la aplicación y al hacer logout;
- si la PWA arranca de cero sin poder validar la sesión con el servidor y existe un usuario local conocido, entra en `Modo protegido`;
- el modo protegido no muestra nombres de fincas, parcelas, campañas, entregas ni labores persistidos localmente;
- sí puede informar del número y tipo de operaciones pendientes de la outbox;
- cuando vuelve la conexión se vuelve a validar la sesión antes de mostrar datos privados.

Motivo:

persistir en claro una réplica privada solo para conseguir un cold-start más cómodo no está justificado todavía. Antes de activar O1 se deberá definir y probar una de estas opciones:

1. caché privada cifrada y desbloqueo local explícito;
2. protección apoyada en credenciales/biometría del dispositivo cuando el navegador lo permita de forma fiable;
3. otra estrategia con amenaza, retención, recuperación y logout documentados.

Hasta entonces el piloto falla de forma cerrada y segura.

### O2 — Borradores — PARCIAL / NO GENERALIZADO

No existe aún un sistema genérico de drafts persistentes de formularios.

Lo que sí existe es una outbox persistente para operaciones ya confirmadas por el usuario al pulsar Guardar.

No presentar esto como autosave de borradores.

### O3 — Cola de escrituras — IMPLEMENTADO PARA NÚCLEO

Operaciones permitidas offline actualmente:

- crear entrega;
- crear labor/observación.

Cada operación local conserva:

- identificador local estable;
- usuario propietario;
- tipo de operación;
- ruta de sincronización;
- payload validable;
- fecha de creación local;
- número de intentos;
- último error sanitizado.

La outbox está en IndexedDB y sobrevive al cierre/reapertura del navegador.

## Aislamiento de usuario

Cada operación tiene `ownerUserId` y la consulta/sincronización se hace exclusivamente para ese propietario.

Un cambio de cuenta no expone ni sincroniza la outbox de otra persona.

### Logout con cambios pendientes

En piloto V1 no se permite cerrar sesión mientras existan operaciones pendientes.

Razón:

- borrar la outbox implicaría perder trabajo;
- dejarla huérfana tras logout mantendría datos privados en el dispositivo sin una sesión activa que pueda resolverlos.

La interfaz exige sincronizar primero. Una opción futura de `Descartar cambios y cerrar sesión` requerirá confirmación fuerte y borrado explícito.

## Sincronización

La aplicación intenta vaciar la cola cuando:

1. recupera el evento `online`;
2. el usuario pulsa `Sincronizar`;
3. la aplicación permanece abierta y detecta operaciones pendientes;
4. futuras mejoras de Background Sync resulten suficientemente interoperables.

Nunca depender solo del punto 4.

Después de una sincronización confirmada:

- se elimina la operación de IndexedDB;
- se emite `magina:sync-complete`;
- campaña y timeline de parcela refrescan sus datos del servidor.

## Idempotencia y retry safety

### Entrega

La entrega usa:

- `clientGeneratedId` estable;
- `Idempotency-Key` estable.

El servidor conserva el contrato de idempotencia probado en el spike técnico para impedir duplicados ante reenvío o respuesta perdida.

### Labor

La labor genera un `clientGeneratedId` UUID estable en cliente.

Ese UUID se usa como identificador de dominio de la actividad. El backend hace inserción retry-safe:

- primer intento: crea la actividad;
- repetición del mismo identificador en la misma explotación: no crea una segunda fila y devuelve la existente;
- conflicto no resoluble: respuesta no satisfactoria y la outbox no borra la operación.

Esto cubre el caso de que el servidor haya guardado la labor pero la respuesta se pierda antes de llegar al móvil.

## Errores

Una operación de outbox solo desaparece con una respuesta HTTP satisfactoria.

Ante:

- error de red;
- timeout/interrupción;
- HTTP no-2xx;

se conserva y aumenta su información de intento/error.

No hay sobrescritura silenciosa.

## Entregas offline

Campos soportados por el flujo actual:

- campaña;
- kilos;
- destino/cooperativa;
- fecha/hora;
- finca opcional;
- parcela opcional, siempre dependiente de la finca elegida;
- ticket textual opcional;
- variedad;
- notas.

Los agregados de campaña confirmados siguen calculándose en servidor después de sincronizar.

## Labores offline

El cuaderno personal puede encolar una labor con:

- tipo de labor;
- fecha/hora;
- campaña opcional;
- finca/parcela;
- superficie afectada;
- producto y referencia de registro cuando aplique;
- cantidad/unidad;
- coste;
- notas.

`Recolección` sigue siendo una labor y no sustituye a `Entrega`.

El cuaderno V1 no se presenta como CUE/SIEX oficial.

## Fotos y documentos offline

La especificación inicial contemplaba blobs pendientes en IndexedDB. Esa parte se **pospone en el piloto**.

Estado actual:

- una entrega puede guardarse offline sin perderse;
- una foto/PDF de ticket necesita conexión para subir al almacenamiento privado;
- si el usuario había seleccionado un archivo y la entrega termina encolada, la interfaz avisa explícitamente de que el binario aún no se ha subido;
- después de sincronizar, el ticket puede adjuntarse a la entrega existente;
- formatos permitidos en la UI: JPG, PNG, WEBP y PDF;
- máximo actual: 10 MB;
- el backend guarda el archivo fuera del bundle público, calcula SHA-256 y lo vincula a la entrega.

No persistir blobs privados grandes en IndexedDB hasta definir:

- cifrado/local-at-rest;
- límites de almacenamiento;
- política de limpieza;
- fallo parcial metadata/upload;
- comportamiento en logout y dispositivo compartido.

## IndexedDB V1 real

Actualmente la persistencia estructurada local crítica es:

- `outbox`.

La caché de lecturas privadas se mantiene solo en memoria de la sesión.

No usar `localStorage` para payloads de entregas, labores o documentos. `localStorage` solo conserva un identificador opaco del último propietario para poder aislar la outbox y decidir el modo protegido.

## UI de estado

Estados implementados:

- `Sin conexión`;
- `Pendiente de sincronizar`;
- desglose por `entregas` y `labores`;
- botón `Sincronizar`;
- aviso `Entrega guardada en este móvil`;
- aviso `Labor guardada en este móvil`;
- aviso `Datos sincronizados`;
- pantalla `Modo protegido` para cold-start sin validación online.

No se usa solo color para comunicar estado.

## Actualizaciones PWA

Si existe outbox pendiente, la actualización de la PWA se aplaza hasta que los cambios se hayan sincronizado.

Objetivo: evitar una migración/reload de aplicación en mitad de una cola crítica.

## Pruebas cubiertas actualmente

- entrega sobrevive a IndexedDB y reintento de red;
- operación no-2xx permanece pendiente;
- aislamiento entre usuarios;
- PWA update se aplaza mientras haya outbox;
- labor se encola con owner, ruta y `clientGeneratedId` estables;
- labor se sincroniza hacia la ruta correcta;
- cliente API crea entrega offline;
- cliente API crea labor offline con UUID estable;
- build PWA y TypeScript strict pasan en `MVP Core Smoke`.

## Pruebas P0 todavía necesarias

1. E2E real: crear entrega -> cortar respuesta después del commit -> reconectar -> una sola entrega.
2. E2E real: crear varias labores offline -> matar app -> reabrir -> siguen en outbox.
3. E2E browser del `Modo protegido` y recuperación de sesión al volver la red.
4. Verificar logout bloqueado con outbox pendiente y permitido con outbox vacía.
5. Dos dispositivos editan el mismo registro -> no sobrescritura silenciosa.
6. Ticket privado con conexión inestable -> no duplicación de documento.
7. Actualización PWA real con cola pendiente -> no pérdida de outbox.

## Evolución posterior al piloto

Solo si la validación de campo demuestra que el cold-start offline completo es imprescindible, diseñar O1 cifrado con:

- opt-in explícito por dispositivo;
- caducidad/TTL de la proyección privada;
- cifrado local;
- desbloqueo local;
- borrado verificable al logout/revocación;
- migraciones IndexedDB probadas;
- pérdida/robo de dispositivo contemplados en threat model.

## Fuera de V1

- réplica privada completa sin desbloqueo local;
- colaboración offline multiusuario avanzada;
- CRDT;
- edición concurrente compleja;
- sincronización P2P entre dispositivos;
- documentos privados grandes persistidos offline sin política específica.
