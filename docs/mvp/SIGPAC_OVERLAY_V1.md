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

Endpoint base verificado:

`https://sigpac-hubcloud.es/ogcapi/collections/recintos/items`

Licencia declarada por el servicio: CC BY 4.0.

Los recintos corresponden a la campaña en uso/vigente según la descripción oficial de la colección.

## Arquitectura

El navegador no consume directamente la API externa para lógica de producto. Toda consulta pasa por un adapter backend propio:

`web -> /api/v1/maps/sigpac/recintos -> sigpac-client -> FEGA OGC API`

Esto permite:

- validar parámetros;
- limitar el área consultada;
- limitar resultados;
- aplicar timeout;
- normalizar propiedades;
- sustituir el proveedor o endpoint si cambia;
- evitar acoplamiento del frontend con el esquema externo.

## API interna

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

## Confirmación de importación

La interfaz mostrará los recintos cercanos a la parcela seleccionada.

Solo se habilitará `Usar como perímetro` cuando la geometría sea compatible con el modelo privado V2: `Polygon` simple con un único anillo exterior y sin huecos.

Al confirmar:

`PATCH /api/v1/plots/:plotId/boundary`

con `source: "sigpac"`.

El backend de parcelas vuelve a validar y recalcular el área. No se confía en la superficie informada por SIGPAC para el campo privado `boundary_area_ha`.

## Fuera de alcance

- sincronización automática permanente con SIGPAC;
- actualización silenciosa de perímetros privados;
- descarga masiva de recintos;
- consulta nacional sin bbox;
- sustitución automática de `area_ha` declarada;
- selección/importación de MultiPolygon o geometrías con huecos en V1.
