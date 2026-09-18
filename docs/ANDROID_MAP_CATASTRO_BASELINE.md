# Mágina Olivo — Android Map + Catastro baseline

Estado: implementación activa en `feat/android-map-catastro-v1`.

## Decisión de arquitectura

Esta rama inicia la nueva aplicación Android nativa. La arquitectura web/PWA anterior se conserva únicamente como referencia funcional para rescatar lógica ya probada de Catastro, SIGPAC, PNOA, geometrías y reglas de validación.

Base adoptada:

- Kotlin + Jetpack Compose.
- Android nativo.
- `minSdk 26`.
- Room como fuente local para experiencia offline-first.
- Supabase como backend remoto desacoplado.
- MapLibre como motor cartográfico.
- Catastro y SIGPAC siempre detrás de adapters propios.
- La geometría oficial se verifica antes de persistirse como fuente oficial.
- Las parcelas ya incorporadas deben poder verse y editarse sin cobertura.

## Flujo objetivo cerrado

```text
Mi Campo
  -> Añadir finca o parcela
     -> Buscar en mapa
        -> usar GPS / mover mapa / buscar referencia
        -> consultar Catastro
        -> tocar una o varias parcelas
        -> revisar referencia + superficie + perímetro
        -> verificar de nuevo la fuente oficial
        -> elegir finca existente o crear finca
        -> completar datos agrícolas
        -> guardar local
        -> sincronizar con Supabase
```

## Modelo mínimo local

`FarmEntity`
- id
- name
- coverImageUri
- updatedAt
- syncState

`PlotEntity`
- id
- farmId
- name
- cadastralReference
- areaHa
- boundaryGeoJson
- boundarySource
- updatedAt
- syncState

La geometría local permite seguir mostrando la parcela cuando no existe conexión.

## Fuentes de perímetro

- `catastro`
- `sigpac`
- `manual_map`
- `manual_gps`
- `imported`

Nunca etiquetar un perímetro como `catastro` o `sigpac` si no ha sido obtenido y verificado contra la fuente oficial.

## Estado verificado — 2026-09-18

- Gate A: completado previamente (Android/Compose/Room/configuración sin secretos).
- Gate B: CERRADO. MapLibre, ubicación con permisos Android, mapa base, PNOA IGN y render de parcelas propias desde Room implementados y validados en emulador.
- Gate C:
  - consulta Catastro por BBOX implementada;
  - búsqueda por referencia 14/18/20 implementada;
  - Polygon y MultiPolygon implementados;
  - selección táctil y multiselección implementadas;
  - selección resaltada sobre mapa;
  - cola de importación desde mapa implementada;
  - cada parcela se vuelve a consultar por referencia antes de guardarse;
  - deduplicación local por referencia catastral;
  - límite oficial WFS de BBOX de 1 km² aplicado en Android y servidor;
  - sesión Supabase obligatoria antes de invocar la Edge Function;
  - si no existe sesión, se crea una sesión anónima; si existe, se reutiliza;
  - `verify_jwt = true` se mantiene en `catastro-map`.
- Adaptador Catastro: WFS 2.0 usando ETRS89 / UTM 30N (EPSG:25830), convertido a GeoJSON WGS84 para MapLibre.
- PNOA: WMTS oficial del IGN con `OI.OrthoimageCoverage` y `GoogleMapsCompatible`.
- CI sobre HEAD `932a935fa633f2a354f26c1d072e4830e7db77ab`:
  - Android CI: verde;
  - Catastro Edge CI: verde;
  - Android Emulator Smoke: verde.
- Evidencia de emulador:
  - APK debug instalada correctamente;
  - `MainActivity` arranca con `Status: ok`;
  - navegación Inicio → mapa completada;
  - árbol UI confirma `Volver`, `Mi ubicación`, `PNOA` y `Catastro`;
  - screenshot real del mapa de Sierra Mágina capturado;
  - sin `FATAL EXCEPTION` ni crash de `com.isivolt.maginaolivo` en logcat.

Gate C NO se considera todavía cerrado extremo a extremo.

Backend dedicado ya preparado:
- proyecto Supabase: `magina-olivo`;
- project ref: `zzelvbcuxsboafibfxch`;
- región: `eu-west-3`;
- estado: `ACTIVE_HEALTHY`;
- URL: `https://zzelvbcuxsboafibfxch.supabase.co`;
- Edge Function `catastro-map`: `ACTIVE`, versión 1, `verify_jwt = true`;
- la app Android lee `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` desde propiedades Gradle o variables de entorno; no se guarda ninguna clave en el repositorio.

Pendiente para cerrar Gate C:
1. habilitar **Anonymous Sign-Ins** en el proyecto `magina-olivo` desde Supabase Dashboard → Authentication → Providers → Anonymous Sign-Ins → Enable;
2. configurar localmente:
   - `SUPABASE_URL=https://zzelvbcuxsboafibfxch.supabase.co`;
   - `SUPABASE_PUBLISHABLE_KEY=<clave publishable default del proyecto>`;
3. validar el recorrido real mapa → Catastro remoto → selección → revisión → Room.

Nota de seguridad:
- usar la clave **publishable**, nunca una clave secret/service-role en Android;
- `catastro-map` permanece con `verify_jwt = true`;
- los usuarios anónimos reciben JWT de usuario autenticado y podrán migrarse a identidad permanente más adelante;
- antes de producción se revisará protección antiabuso/rate-limit para altas anónimas.

El proyecto `magina-olivo-aventura` permanece separado y no se reutiliza para esta aplicación.

## Próximos gates

### Gate A — fundación Android
- proyecto sincroniza;
- Compose arranca;
- Room crea BD local;
- configuración Supabase no contiene secretos.

### Gate B — mapa
- mapa móvil real;
- ubicación;
- OSM/base;
- PNOA;
- render de GeoJSON;
- parcelas propias offline.

### Gate C — Catastro
- BBOX por viewport;
- búsqueda por referencia;
- Polygon/MultiPolygon;
- selección táctil;
- multiselección;
- deduplicación;
- verificación previa al alta.

### Gate D — persistencia/sync
- finca + parcelas en Supabase con RLS;
- outbox local;
- sincronización;
- conflictos visibles;
- caché de geometría oficial.

### Gate E — SIGPAC
- overlay de recintos;
- asociación 1:N;
- trazabilidad independiente de Catastro.

No se avanza al siguiente gate ocultando fallos del anterior.
