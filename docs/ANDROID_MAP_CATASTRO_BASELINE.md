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
- Gate C: CERRADO extremo a extremo.
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
- CI sobre HEAD `a26f27be26a77b91c39c46deeab79c7e2ada7992`:
  - Android CI: verde;
  - Catastro Edge CI: verde;
  - Catastro Backend E2E: verde;
  - Android Catastro Room E2E: verde;
  - Android Emulator Smoke: verde.
- Evidencia de emulador:
  - APK debug instalada correctamente;
  - `MainActivity` arranca con `Status: ok`;
  - navegación Inicio → mapa completada;
  - árbol UI confirma `Volver`, `Mi ubicación`, `PNOA` y `Catastro`;
  - screenshot real del mapa de Sierra Mágina capturado;
  - sin `FATAL EXCEPTION` ni crash de `com.isivolt.maginaolivo` en logcat.

Backend dedicado ya preparado:
- proyecto Supabase: `magina-olivo`;
- project ref: `zzelvbcuxsboafibfxch`;
- región: `eu-west-3`;
- estado: `ACTIVE_HEALTHY`;
- URL: `https://zzelvbcuxsboafibfxch.supabase.co`;
- Edge Function `catastro-map`: `ACTIVE`, versión 3, `verify_jwt = true`;
- la app Android lee `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` desde propiedades Gradle o variables de entorno; no se guarda ninguna clave en el repositorio.

Estado Auth/Edge verificado:
- Anonymous Sign-Ins habilitado y validado: HTTP 200, JWT emitido, `is_anonymous=true`, rol `authenticated`;
- `catastro-map` v3 usa el endpoint WFS oficial `http://ovc.catastro.meh.es/INSPIRE/wfsCP.aspx`;
- se añadió regresión CI para impedir volver accidentalmente al endpoint HTTPS;
- `deno check` y el test de adaptador pasan en Catastro Edge CI;
- una consulta BBOX real devolvió HTTP 200, 80 parcelas y proveedor `Dirección General del Catastro`.

Incidencia externa observada:
- el servicio WFS de Catastro presenta resets de conexión intermitentes incluso usando HTTP;
- el adapter aplica un único reintento controlado para error de red, HTTP 429 o HTTP 5xx;
- no se debe confundir esta intermitencia externa con un fallo de Auth, parser o proyección.

E2E backend automático verificado:
- workflow `Catastro Backend E2E`: verde;
- Anonymous Auth → JWT → BBOX real → primera referencia → lookup por referencia → coincidencia obligatoria;
- GitHub secret `SUPABASE_PUBLISHABLE_KEY` configurado;
- el helper no imprime el JWT;
- en el mismo HEAD también están verdes Android CI, Catastro Edge CI y Android Emulator Smoke.

Resiliencia WFS:
- máximo 2 intentos por petición;
- espera de 250 ms;
- reintento solo ante error de red, HTTP 429 o HTTP 5xx;
- no reintenta HTTP 4xx normales;
- cada intento usa su propio timeout de 8 s.

Cierre Gate C — evidencia Android real:
- workflow `Android Catastro Room E2E`: verde;
- el emulador recibe `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` desde el entorno protegido de CI;
- Android crea/reutiliza sesión anónima Supabase;
- consulta BBOX real a Catastro mediante `SupabaseCatastroParcelGateway`;
- selecciona una parcela con superficie oficial;
- vuelve a verificar la misma referencia por Catastro antes de persistir;
- crea una finca de prueba con `LocalFieldRepository`;
- importa la parcela en una Room real en memoria;
- verifica en Room: referencia catastral, geometría GeoJSON, superficie en hectáreas, `boundarySource=catastro` y `syncState=pending_upload`;
- `connectedDebugAndroidTest` finaliza con `BUILD SUCCESSFUL`.

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
