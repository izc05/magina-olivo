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
