# Catastro Manual + GPS V1

Estado: implementación en rama de trabajo, no candidata de staging.

Rama: `feat/catastro-manual-gps-v1`

Base congelada: V11 `063767560fe824c3415f200e0314dc5b2e8f4122`.

## 1. Objetivo

Permitir que un agricultor asocie una parcela oficial del Catastro a una parcela privada de Mágina Olivo de dos formas muy simples:

1. **Manual**: tocar dentro de la finca en el mapa.
2. **GPS**: estando físicamente en la finca, pulsar `Localizar mi parcela`.

El usuario no necesita conocer WFS, GML, GeoJSON, EPSG ni la referencia catastral.

## 2. Principio de UX

El flujo debe sentirse así:

```text
Mi Campo
  -> Mapa de parcelas
  -> Añadir parcela desde Catastro
       -> Manual | GPS

Manual
  -> acercar mapa
  -> tocar dentro de la finca
  -> Mágina consulta Catastro
  -> resalta perímetro
  -> usuario revisa
  -> Esta es mi parcela
  -> segunda confirmación
  -> servidor vuelve a verificar Catastro
  -> guarda perímetro oficial

GPS
  -> Localizar mi parcela
  -> navegador solicita geolocalización
  -> Mágina consulta Catastro con lat/lon
  -> si no hay coincidencia exacta busca referencias próximas
  -> resalta una o varias candidatas
  -> usuario elige
  -> Esta es mi parcela
  -> segunda confirmación
  -> servidor vuelve a verificar Catastro
  -> guarda perímetro oficial
```

## 3. Arquitectura implementada

### Frontend

Archivo principal:

`apps/web/src/CatastroParcelPanel.tsx`

Responsabilidades:

- selector Manual / GPS;
- mapa OSM ligero, sin dependencia adicional;
- clic manual convertido a latitud/longitud;
- uso de `navigator.geolocation.getCurrentPosition`;
- visualización de precisión GPS;
- llamada al endpoint privado de identificación;
- representación del polígono oficial devuelto;
- lista de candidatas cuando Catastro devuelve referencias próximas;
- doble confirmación antes de importar;
- refresco de la cartografía privada tras guardar.

Estilos:

`apps/web/src/catastro-panel.css`

La integración existente se conserva:

```text
FieldNotebook
  -> PlotMapPanel
       -> PlotMapEditor
       -> ParcelSourceComparisonPanel
       -> SigpacRecintoPanel
       -> CatastroParcelPanel
```

Por tanto, el módulo aparece dentro de **Mi Campo** sin crear una aplicación o ruta paralela.

### Backend

Adaptador:

`apps/api/src/catastro-client.ts`

Servicios usados:

- Servicio de coordenadas JSON de la Dirección General del Catastro.
- WFS INSPIRE de parcelas catastrales.

Operaciones:

- `Consulta_RCCOOR`: coordenadas -> referencia catastral exacta.
- `Consulta_RCCOOR_Distancia`: referencias cercanas cuando el GPS o el punto caen junto a una linde/camino.
- `GetParcel`: referencia catastral -> geometría oficial.

Nuevo endpoint privado:

```http
GET /api/v1/maps/catastro/identify?lat=<lat>&lon=<lon>&nearby=1
```

Respuesta conceptual:

```json
{
  "items": [
    {
      "nationalCadastralReference": "...",
      "areaM2": 28400,
      "geometry": { "type": "Polygon", "coordinates": [] }
    }
  ],
  "match": "exact",
  "query": {
    "latitude": 37.7,
    "longitude": -3.5,
    "nearby": true
  },
  "source": {
    "provider": "Dirección General del Catastro",
    "service": "Coordinates JSON + INSPIRE WFS"
  }
}
```

El endpoint exige sesión autenticada.

## 4. Seguridad y confianza

La búsqueda y la importación son operaciones distintas.

El navegador puede mostrar una parcela candidata, pero **no puede guardar directamente un polígono como Catastro**.

La importación continúa usando:

```http
POST /api/v1/plots/:plotId/import-catastro
```

con únicamente:

```json
{
  "cadastralReference": "XXXXXXXXXXXXXX"
}
```

El servidor:

1. verifica sesión y permisos sobre la finca;
2. valida la referencia catastral;
3. vuelve a consultar directamente `GetParcel` en Catastro;
4. valida la geometría;
5. recalcula superficie;
6. guarda `boundary_source = 'catastro'`;
7. guarda referencia externa y fecha de comprobación.

Nunca se acepta del frontend `source: catastro` ni un GeoJSON presentado como oficial.

## 5. Tolerancia al GPS

El GPS de un móvil puede tener errores de varios metros, especialmente bajo arbolado, entre edificios o con mala visibilidad del cielo.

Por ello el flujo GPS usa:

1. consulta exacta por coordenadas;
2. si no devuelve referencia y `nearby=1`, consulta por distancia;
3. si aparecen varias candidatas, el usuario debe elegir visualmente la correcta.

Nunca se debe seleccionar automáticamente una parcela próxima sin mostrarla y pedir confirmación.

## 6. Diferencia Catastro / SIGPAC

Mágina Olivo mantiene las fuentes separadas.

```text
Perímetro de trabajo
  source = manual_map | manual_gps | imported | sigpac | catastro
```

Catastro y SIGPAC pueden diferir en límites, superficies y finalidad administrativa. La interfaz debe seguir mostrando esa advertencia y `ParcelSourceComparisonPanel` debe conservar la comparación.

## 7. Estados de interfaz

### Manual

- sin selección;
- consultando;
- coincidencia exacta;
- coincidencias próximas;
- sin parcela encontrada;
- error de servicio;
- pendiente de confirmación;
- verificando importación;
- guardada.

### GPS

Además:

- solicitando permiso;
- permiso denegado;
- GPS no disponible;
- precisión aproximada en metros;
- posición encontrada pero sin referencia catastral.

## 8. Accesibilidad

Requisitos:

- Manual / GPS son botones reales con `aria-pressed`;
- no depender del color para saber qué modo está activo;
- los estados de carga usan `role=status`;
- los errores usan `role=alert`;
- botones de zoom tienen `aria-label`;
- el mapa mantiene una descripción accesible;
- la confirmación crítica requiere una acción explícita adicional.

## 9. Pruebas añadidas

Backend:

`apps/api/src/catastro-client.test.ts`

Cubre:

- URL WFS BBOX;
- stored query `GetParcel`;
- URL de coordenadas exactas;
- URL de búsqueda por distancia;
- extracción robusta de referencias de respuestas JSON con envoltorios distintos;
- validación de coordenadas;
- normalización GML existente.

Frontend/source gate:

`apps/web/src/catastro-source.test.ts`

Cubre:

- registro de rutas;
- autenticación;
- endpoint `/identify`;
- presencia de Manual y GPS;
- geolocalización;
- doble confirmación;
- revalidación server-side;
- integración `FieldNotebook -> PlotMapPanel -> CatastroParcelPanel`.

El test se añade al script de `apps/web/package.json`.

## 10. Límites conocidos de V1

1. El fondo de mapa actual es OpenStreetMap; el diseño visual futuro puede incorporar ortofoto PNOA/IGN o una capa autorizada de satélite.
2. La importación automática sigue limitada a polígonos simples. Geometrías complejas se pueden consultar pero no importar automáticamente.
3. El parser GML actual sigue siendo conservador y debe evolucionar a tratamiento estructurado de exteriores/interiores antes de habilitar todas las geometrías complejas.
4. La búsqueda por proximidad puede devolver varias parcelas; siempre requiere elección humana.
5. El servicio externo de Catastro puede estar temporalmente no disponible; Mágina debe fallar de forma clara sin perder datos privados.

## 11. Criterios de aceptación funcional

- [ ] En Manual, tocar dentro de una parcela obtiene al menos una candidata cuando Catastro responde.
- [ ] El polígono seleccionado se dibuja sobre el mapa.
- [ ] En GPS, se solicita permiso de geolocalización solo tras acción del usuario.
- [ ] Se muestra precisión GPS aproximada.
- [ ] Si el punto exacto no produce referencia, la búsqueda próxima puede devolver candidatas.
- [ ] Nunca se guarda una candidata sin confirmación.
- [ ] La confirmación provoca una segunda consulta server-side por referencia.
- [ ] El perímetro queda con procedencia `catastro` y fecha de comprobación.
- [ ] Catastro y SIGPAC siguen separados.
- [ ] Los tests API y web pasan.
- [ ] Typecheck API y web pasa.
- [ ] Build web pasa.

## 12. Regla de integración

Esta rama parte del V11 congelado, pero **no debe fusionarse sobre el candidato de staging mientras el P0 de aceptación de V11 siga abierto**.

La rama es trabajo post-staging. V11 debe permanecer inmutable durante su aceptación real.
