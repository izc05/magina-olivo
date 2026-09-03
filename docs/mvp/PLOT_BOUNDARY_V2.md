# Plot Boundary V2 — perímetro funcional de parcelas

## Objetivo

Evolucionar `Mapa de Parcelas` desde una ubicación puntual a un perímetro privado persistente, editable y utilizable por el resto del producto.

## Alcance V2

- Mantener la ubicación puntual V1 (`latitude`, `longitude`).
- Guardar un perímetro de parcela como GeoJSON `Polygon` WGS84 (EPSG:4326).
- Dibujar vértices sobre un mapa OpenStreetMap sin añadir una librería cartográfica al bundle.
- Añadir vértices usando el GPS del dispositivo cuando el agricultor recorra la finca.
- Calcular una superficie aproximada durante la edición.
- Recalcular y validar la superficie en backend antes de persistirla.
- Conservar `area_ha` como superficie declarada/manual y almacenar la superficie geométrica por separado.
- Permitir borrar únicamente el perímetro sin borrar parcela, histórico ni ubicación puntual.
- Mantener autorización por explotación en todas las lecturas/escrituras privadas.

## Modelo

Campos nuevos en `plots`:

- `boundary_geojson jsonb null`
- `boundary_area_ha numeric(12,4) null`
- `boundary_source text null`
- `boundary_updated_at timestamptz null`

Fuentes admitidas inicialmente:

- `manual_map`: vértices creados pulsando sobre el mapa.
- `manual_gps`: vértices capturados con el GPS del dispositivo.
- `imported`: geometría importada por el usuario o por una herramienta controlada.
- `sigpac`: reservado para geometría proveniente de una integración SIGPAC verificada.
- `catastro`: reservado para geometría proveniente de Catastro/INSPIRE verificada.

## Reglas geométricas

- Coordenadas GeoJSON: `[longitude, latitude]`.
- El anillo exterior debe tener al menos 4 posiciones incluyendo el cierre.
- Primera y última posición deben ser iguales.
- Máximo V2: 500 vértices por perímetro.
- Longitud entre -180 y 180; latitud entre -90 y 90.
- El backend calcula el área a partir de la geometría recibida y no confía en un área enviada por cliente.
- El área geométrica es informativa/operativa y no sustituye por sí sola una superficie administrativa oficial.

## API

`PATCH /api/v1/plots/:plotId/boundary`

Guardar:

```json
{
  "boundary": {
    "type": "Polygon",
    "coordinates": [[[-3.5, 37.7], [-3.49, 37.7], [-3.49, 37.71], [-3.5, 37.7]]]
  },
  "source": "manual_map"
}
```

Borrar:

```json
{
  "boundary": null,
  "source": null
}
```

La respuesta devuelve la parcela serializada con `boundaryGeoJson`, `boundaryAreaHa`, `boundarySource` y `boundaryUpdatedAt`.

## Interfaz

Dentro de `Mi Campo > Mapa de Parcelas`:

1. Seleccionar parcela.
2. Mantener la edición de punto V1.
3. Abrir `Perímetro`.
4. Añadir vértices tocando/clicando el mapa o usando `Añadir mi posición`.
5. Deshacer último vértice o limpiar borrador.
6. Ver superficie aproximada en hectáreas y m².
7. Guardar el perímetro.
8. Poder eliminarlo sin afectar al histórico.

## Cartografía oficial — siguiente capa

La V2 deja `boundary_source` preparada para adaptadores SIGPAC y Catastro. No se debe etiquetar una geometría como `sigpac` o `catastro` hasta obtenerla de un servicio oficial verificado.

SIGPAC se integrará detrás de un adapter propio usando sus servicios OGC/WMS oficiales. Catastro se integrará detrás de adapter propio usando servicios INSPIRE/WMS/WFS cuando corresponda. La geometría privada persistida seguirá siendo responsabilidad del backend de Mágina Olivo.

## Fuera de alcance V2

- edición de agujeros interiores del polígono;
- multipolígonos;
- snapping avanzado a lindes;
- descarga masiva SIGPAC;
- sustitución automática de superficie declarada por superficie calculada;
- cartografía offline completa.