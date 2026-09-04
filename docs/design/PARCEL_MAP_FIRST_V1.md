# Mágina Olivo — Parcel Map-First V1

Estado: diseño post-staging. **No forma parte de `staging/candidate-v5-2026-09-03`.**

## Objetivo

Permitir que un agricultor dé de alta una o varias parcelas sin conocer coordenadas ni tener que crear primero una parcela vacía.

Flujo principal:

```text
Mi Campo
  -> Añadir parcela
     -> Buscar en mapa
        -> localizar zona
        -> tocar una o varias parcelas oficiales
        -> confirmar selección
        -> verificación server-side
        -> completar datos agrícolas
        -> guardar
```

## Principios

1. Catastro/SIGPAC identifican cartografía y referencias, no acreditan propiedad en esta interfaz.
2. El usuario declara explícitamente qué parcelas gestiona.
3. Catastro y SIGPAC son fuentes independientes y pueden coexistir.
4. El navegador nunca es autoridad sobre geometría, superficie o procedencia oficial.
5. El servidor vuelve a consultar la fuente oficial antes de crear datos privados.
6. Número de olivos, variedad, riego y nombre son datos agrícolas declarados por el usuario.
7. El flujo debe funcionar bien en Android/touch y también con teclado.

## Entradas de búsqueda

La pantalla `Buscar mis parcelas` ofrece cuatro métodos equivalentes:

### A. Mapa
- pan/zoom libre;
- Catastro por viewport/BBOX a zoom adecuado;
- tocar polígonos para seleccionar;
- multiselección.

### B. Mi ubicación
- centrar mapa con geolocalización del dispositivo;
- no guardar ubicación personal permanente;
- una vez centrado, consultar parcelas del viewport.

### C. Referencia catastral
Aceptar texto con espacios y normalizar a mayúsculas.

Entradas admitidas por UX:
- 14 caracteres: referencia de parcela cartográfica;
- 18 caracteres: referencia de inmueble sin control cuando el servicio lo admita;
- 20 caracteres: referencia completa del inmueble.

Para cartografía de parcela se conserva/deriva la referencia de **14 caracteres**. Nunca recortar silenciosamente una entrada inválida: mostrar al usuario qué referencia de parcela se va a usar antes de confirmar.

### D. Municipio + polígono + parcela
Especialmente útil para rústica:
- municipio;
- polígono;
- parcela;
- opcionalmente sector/agregado cuando corresponda a la fuente.

El resultado centra la vista y muestra la parcela candidata junto con colindantes cuando el servicio lo permita.

## Pantalla móvil

Cabecera compacta:

```text
< Volver               Buscar parcelas
```

Buscador plegable:

```text
[ Mapa ] [ Ref. catastral ] [ Polígono/parcela ]
```

Controles flotantes:

```text
[📍] Mi ubicación
[🗺️] Capas
```

Capas:
- Mapa base;
- Ortofoto PNOA/IGN;
- Catastro;
- SIGPAC;
- Mis parcelas.

Cuando el zoom no es suficiente:

```text
Acércate para ver las parcelas catastrales
```

No ejecutar consultas WFS grandes a escala regional.

## Selección

Estados visuales de una parcela:
- normal;
- hover/foco;
- seleccionada;
- ya añadida;
- no importable automáticamente;
- error temporal de verificación.

La multiselección se conserva aunque el usuario mueva ligeramente el mapa.

Bottom sheet:

```text
3 parcelas seleccionadas

1 · RC 23044A01200034 · 1,34 ha
2 · RC 23044A01200035 · 0,87 ha
3 · RC 23044A01200040 · 2,11 ha

Total oficial mostrado: 4,32 ha

[Continuar con 3 parcelas]
```

La suma es informativa; cada parcela se mantiene como entidad independiente.

## Confirmación de fuente

Antes de crear:

> Has seleccionado 3 parcelas de cartografía oficial. Mágina Olivo volverá a verificarlas directamente en la fuente antes de crear tus parcelas de trabajo.

Nunca usar frases como `estas parcelas son tuyas` o `propietario verificado`.

## Alta agrícola

Después de prevalidar las referencias oficiales:

Por parcela:
- nombre de trabajo;
- olivos (opcional, entero >= 0);
- riego: secano / regadío / mixto / sin definir;
- variedad principal: picual / hojiblanca / arbequina / otra / mixta / sin definir;
- notas.

Acciones batch:
- aplicar riego a todas;
- aplicar variedad a todas tras acción explícita;
- asignar todas a una finca existente;
- crear una finca nueva y asignarlas.

No aplicar Picual automáticamente por estar en Sierra Mágina.

## Ortofoto

Usar PNOA/IGN como ayuda visual:
- lazy-load;
- viewport/teselas;
- fallback a mapa base;
- atribución visible;
- selección y límites oficiales dibujados encima.

La ortofoto no es fuente de propiedad, superficie oficial ni número de olivos.

## Catastro

### Visualización
WMS oficial para límites/etiquetas cuando sea útil.

### Selección/datos
WFS Cadastral Parcel:
- BBOX para viewport;
- `GetParcel` por referencia de parcela;
- `GetNeighbourParcel` para mostrar colindantes;
- `GetParcelsByZoning` cuando la búsqueda territorial lo justifique.

El adapter server-side normaliza a GeoJSON/WGS84 para la web.

## SIGPAC

Después de seleccionar una parcela Catastro:

```text
[Ver recintos SIGPAC de esta zona]
```

- calcular BBOX de la parcela + margen;
- consultar colección oficial de recintos;
- mostrar los recintos cercanos/intersectantes;
- permitir asociar varios recintos a una parcela de trabajo;
- no reemplazar automáticamente el perímetro Catastro.

## Modelo de datos propuesto

### `plots`
Mantener:
- `cadastral_reference` como referencia de parcela de 14 caracteres;
- perímetro principal y su procedencia;
- datos agrícolas privados.

### Nueva relación `plot_sigpac_recintos`
Conceptual:

```text
plot_id uuid
holding_id uuid
sigpac_feature_id text
provincia integer
municipio integer
agregado integer|null
zona integer|null
poligono integer
parcela integer
recinto integer
source_checked_at timestamptz
created_at timestamptz
```

Restricciones:
- FK `(plot_id, holding_id)`;
- unique `(holding_id, sigpac_feature_id)` si el feature no debe asociarse dos veces dentro de la explotación;
- no almacenar geometría duplicada salvo que exista una necesidad offline justificada.

Esto permite 1 parcela de trabajo -> N recintos SIGPAC sin sobrescribir Catastro.

## Duplicados Catastro

Antes de crear una parcela desde Catastro:
- buscar `cadastral_reference` activa dentro del holding;
- si existe, devolver `already-added` con enlace a la parcela existente;
- no duplicar silenciosamente;
- permitir una resolución explícita futura para casos excepcionales.

El índice final debe diseñarse después de revisar los casos reales de parcelas compartidas/gestión diferenciada, pero el comportamiento por defecto será anti-duplicado.

## API propuesta

### Buscar por referencia

```http
GET /api/v1/maps/catastro/parcelas/by-reference/:reference
```

Devuelve referencia de parcela normalizada, geometría, superficie, etiqueta, importabilidad y fuente.

### Buscar rústica por polígono/parcela

```http
GET /api/v1/maps/catastro/parcelas/search?municipality=...&polygon=...&parcel=...
```

El adapter decide el servicio oficial subyacente y devuelve una respuesta normalizada.

### Prevalidar lote

```http
POST /api/v1/farms/:farmId/plots/import-catastro/validate
```

Body:

```json
{
  "references": ["23044A01200034", "23044A01200035"]
}
```

Respuesta por referencia:
- `ready`;
- `already-added`;
- `unsupported-geometry`;
- `not-found`;
- `upstream-error`.

### Crear lote

```http
POST /api/v1/farms/:farmId/plots/import-catastro
```

El navegador envía referencias + datos agrícolas, nunca geometría ni superficie como autoridad.

El servidor:
1. autentica;
2. comprueba `canWrite`;
3. normaliza referencias;
4. detecta duplicados;
5. vuelve a consultar Catastro;
6. valida geometrías;
7. calcula áreas internamente;
8. crea todas dentro de una transacción cuando sea seguro;
9. devuelve parcelas creadas + cualquier conflicto explícito.

Límite de lote inicial recomendado: 20 parcelas.

## Rendimiento

- debounce de `moveend`;
- AbortController para solicitudes supersedidas;
- BBOX máximo igual o menor al adapter existente;
- límite de features;
- caché privada corta;
- no consultar en cada frame de movimiento;
- no pedir SIGPAC si la capa está desactivada;
- no pedir PNOA hasta activar ortofoto;
- simplificar solo para render si es necesario, nunca para persistir una geometría oficial distinta de la verificada.

## Accesibilidad

Cada parcela visible debe tener equivalente en lista:
- referencia;
- superficie;
- estado de selección;
- botón seleccionar/deseleccionar.

Así el flujo no depende exclusivamente de tocar un polígono pequeño en el mapa.

## Offline

V1 map-first requiere red para consultar/verificar fuentes oficiales.

Si se pierde la red antes de confirmar:
- conservar selección local temporal;
- mostrar `Necesitas conexión para verificar y crear estas parcelas`;
- no crear una falsa parcela `oficial` offline.

Una parcela ya creada sí podrá mostrarse desde datos privados/cacheados según la política PWA existente.

## Pruebas mínimas

- normalización RC 14/18/20;
- RC inválida;
- BBOX demasiado grande;
- viewport con 0/1/N parcelas;
- selección y deselección;
- multiselección persistente;
- duplicado en holding;
- geometría compleja;
- Catastro 502/timeouts;
- alta batch transaccional;
- aislamiento entre usuarios;
- vínculo 1:N con recintos SIGPAC;
- touch y teclado;
- PNOA caído no bloquea alta Catastro.

## Fuera de V1

- demostrar titularidad/propiedad;
- consultar datos catastrales protegidos de titulares;
- conteo automático de olivos;
- clasificación automática de variedad;
- editar geometría oficial y seguir llamándola oficial.
