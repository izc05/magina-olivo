# Mágina Olivo — Integración Visual V2 + MVP Core V1

Fecha: 2026-09-03
Rama: `feat/integration-v2-mvp-v1`
Estado: integración P0 en curso

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
- se añade `apps/web/src/integration-v2.css` como capa de presentación;
- se reutiliza el logo aprobado existente en `/brand/magina-olivo-mark.svg`;
- no se introduce `lucide-react` ni otra dependencia visual nueva;
- no se copian valores demo desde Visual V2.

### Mi Campo

- explotación, fincas y parcelas proceden exclusivamente de `/api/v1`;
- la finca activa se mantiene como selección canónica del MVP Core;
- las parcelas conservan sus campos reales: superficie, olivos, riego y SIGPAC;
- formularios de explotación, finca y parcela siguen escribiendo contra la API real;
- la presentación de finca activa, tarjetas de parcela y formularios se ha llevado a la jerarquía Visual V2;
- no se ha introducido `localStorage` como fuente de verdad alternativa.

### Cuaderno

- las labores se escriben contra la API real y mantienen outbox offline;
- tratamientos, abonado, riego, costes, notas, parcela y campaña siguen usando el modelo canónico;
- la historia de parcela unifica labores, entregas y rendimientos sin duplicar datos;
- se añade resumen real por parcela y filtros `Todo / Labores / Entregas / Rendimientos`;
- el aviso CUE/SIEX se mantiene explícito: el cuaderno personal V1 no se presenta como registro oficial.

### Campaña y documentos

- campaña, entregas, kilos y rendimiento siguen procediendo del MVP Core y de sus cálculos deterministas;
- el formulario de entrega mantiene finca/parcela, destino, ticket, variedad, notas y outbox offline;
- los destinos reconocidos se diferencian de los destinos manuales sin bloquear la entrada libre;
- los tickets se validan en cliente y servidor para JPG/PNG/WEBP/PDF y máximo 10 MB;
- los documentos siguen almacenándose de forma privada con SHA-256 y autorización por explotación;
- se añade listado autenticado de documentos por campaña, sin exponer claves internas de almacenamiento;
- la bandeja `Tickets y documentos` se refresca automáticamente después de una subida y permite descarga autenticada;
- los metadatos de cada documento pueden mostrar la entrega vinculada (fecha, kilos y destino);
- se añade prueba de cliente para verificar el listado de campaña con credenciales de sesión.

## Orden P0

1. Login/sesión. ✅ presentación V2 sobre flujo real
2. Inicio/dashboard real. ✅ primera integración V2
3. Mi Campo: explotación -> finca -> parcela. ✅ integración visual real
4. Cuaderno/labores. ✅ integración visual + resumen/filtros reales
5. Campaña -> entrega -> rendimiento. ✅ flujo real reforzado
6. Documentos privados. ✅ listado/descarga por campaña + almacenamiento privado existente
7. Offline/sync. 🟡 base real ya integrada; pendiente cierre visual/operativo
8. Meteorología y datos públicos. 🟡 fuentes y pantallas reales ya existen; pendiente integración en navegación principal
9. Directorio/mercado/noticias. 🟡 directorio/mercado reales ya existen; pendiente integración y noticias

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

La fase podrá considerarse cerrada cuando:

- el flujo `Login -> Inicio -> Mi Campo -> Parcela -> Cuaderno -> Campaña -> Entrega -> Rendimiento` use presentación V2;
- todos los datos del flujo procedan del backend real;
- CI de MVP Core siga verde;
- los tests de accesibilidad y offline sigan verdes;
- el bundle no contenga secretos;
- no exista dependencia productiva de `demoRepositories`;
- se haya ejecutado el recorrido contra staging real.

## Siguiente paso

Cerrar la integración de **Offline/sync** en la experiencia V2 y sustituir el placeholder de la pestaña **Mágina** por las pantallas públicas reales ya construidas: AEMET, RAIF, directorio de cooperativas/almazaras y mercado. Después se preparará el primer staging real navegable sin fusionar todavía a `main`.
