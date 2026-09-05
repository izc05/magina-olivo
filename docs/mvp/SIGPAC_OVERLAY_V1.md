# SIGPAC Overlay V1 — consulta oficial de recintos

## Objetivo

Añadir a `Mi Campo` una consulta explícita de recintos SIGPAC de la campaña vigente, manteniendo separados:

1. el dato oficial consultado en FEGA/SIGPAC;
2. el perímetro privado de trabajo guardado por el usuario en Mágina Olivo.

Una geometría SIGPAC nunca se persistirá automáticamente. El usuario debe seleccionar un recinto y confirmar que desea usarlo como perímetro privado.

## Fuente oficial

Proveedor: Fondo Español de Garantía Agraria (FEGA).

Servicio: OGC API Features SIGPAC.

Colección: `recintos`.

Endpoints verificados:

- zona: `https://sigpac-hubcloud.es/ogcapi/collections/recintos/items`
- elemento por ID: `https://sigpac-hubcloud.es/ogcapi/collections/recintos/items/{featureId}`

Licencia declarada por el servicio: CC BY 4.0.

Los recintos corresponden a la campaña en uso/vigente según la descripción oficial de la colección.

## Arquitectura

El navegador no consume directamente la API externa para lógica de producto. Toda consulta pasa por un adapter backend propio:

`web -> /api/v1/maps/sigpac/recintos -> sigpac-client -> FEGA OGC API`

La importación usa una segunda verificación independiente:

`web -> POST /api/v1/plots/:plotId/import-sigpac -> sigpac-client -> FEGA /items/{featureId} -> plots`

Esto permite:

- validar parámetros;
- limitar el área consultada;
- limitar resultados;
- aplicar timeout;
- normalizar propiedades;
- verificar de nuevo el recinto elegido antes de persistirlo;
- sustituir el proveedor o endpoint si cambia;
- evitar acoplamiento del frontend con el esquema externo;
- impedir que el cliente pueda etiquetar una geometría arbitraria como `sigpac`.

## API interna de consulta

`GET /api/v1/maps/sigpac/recintos`

Query:

- `minLon`
- `minLat`
- `maxLon`
- `maxLat`

Reglas V1:

- sesión autenticada obligatoria;
- WGS84/CRS84;
- bbox válido y no invertido;
- máximo 0,05 grados de ancho y alto;
- máximo 100 features solicitadas al proveedor;
- timeout de 8 segundos;
- no persistir respuesta externa.

## Respuesta normalizada

Cada recinto incluirá cuando esté disponible:

- `id`;
- `provincia`;
- `municipio`;
- `agregado`;
- `zona`;
- `poligono`;
- `parcela`;
- `recinto`;
- `pendienteMedia`;
- `altitud`;
- `surfaceM2`;
- `usoSigpac`;
- geometría GeoJSON `Polygon` o `MultiPolygon` solo para visualización/selección.

## Confirmación e importación verificada

La interfaz mostrará los recintos cercanos a la parcela seleccionada.

Solo se habilitará `Usar como perímetro` cuando la geometría mostrada sea compatible con el modelo privado V2: `Polygon` simple con un único anillo exterior y sin huecos.

La primera pulsación únicamente arma la confirmación. La segunda confirma la intención del usuario y envía al backend **solo** el ID oficial del recinto:

`POST /api/v1/plots/:plotId/import-sigpac`

```json
{
  "recintoId": "233788127"
}
```

El backend:

1. vuelve a consultar `FEGA /collections/recintos/items/{featureId}`;
2. comprueba que el ID devuelto coincide;
3. rechaza MultiPolygon/huecos en V1;
4. valida el GeoJSON con las reglas privadas de Mágina Olivo;
5. recalcula `boundary_area_ha` sin confiar en la superficie declarada por SIGPAC;
6. persiste `boundary_source = 'sigpac'`;
7. guarda `boundary_external_id = featureId`;
8. guarda `boundary_source_checked_at`.

El endpoint general `PATCH /api/v1/plots/:plotId/boundary` queda reservado a fuentes editables (`manual_map`, `manual_gps`, `imported`) y limpia cualquier procedencia oficial previa cuando el usuario sustituye el perímetro manualmente.

## Trazabilidad

Los perímetros procedentes de fuentes oficiales conservan:

- proveedor lógico (`boundary_source`);
- identificador externo (`boundary_external_id`);
- momento de verificación (`boundary_source_checked_at`);
- momento de actualización de geometría (`boundary_updated_at`).

Esto permite distinguir una geometría oficial verificada de una copia manual o importación de usuario.

## Fuera de alcance

- sincronización automática permanente con SIGPAC;
- actualización silenciosa de perímetros privados;
- descarga masiva de recintos;
- consulta nacional sin bbox;
- sustitución automática de `area_ha` declarada;
- selección/importación de MultiPolygon o geometrías con huecos en V1.
