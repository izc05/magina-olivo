# Mágina Olivo — Directorio público de Mágina V1

Fecha base de revisión: **2026-09-02**

## Objetivo

Ofrecer un directorio útil de cooperativas, S.A.T. y almazaras/empresas de Sierra Mágina como información pública separada de los datos privados del agricultor.

Ruta web preparada:

`/magina/directorio`

Endpoint:

`GET /api/v1/public/destinations`

## Universo V1

El seed parte de la auditoría 23/23 de `docs/COOPERATIVE_AUDIT_MATRIX.md` y del directorio DOP Sierra Mágina utilizado como fuente base.

La tabla histórica del backend se llama `cooperatives`, pero V1 añade `entity_type` para no convertir jurídicamente a todas las entidades en cooperativas.

Valores:

- `cooperative`
- `sat`
- `company`
- `other`

La UI traduce estos valores a lenguaje legible para el usuario.

## Datos mostrados

V1 puede mostrar:

- nombre oficial;
- marca conocida cuando ya está documentada;
- tipo de entidad;
- municipio;
- provincia;
- estado de revisión de fuente;
- fecha base de revisión.

## Datos que NO se infieren

El directorio no debe afirmar automáticamente:

- que una entidad colabora con Mágina Olivo;
- que existe integración técnica;
- que Mágina Olivo puede acceder al área privada del socio;
- que una cuenta de tienda es un portal agrícola;
- que un portal encontrado anteriormente sigue operativo;
- que los datos del directorio sustituyen a información oficial actualizada de la propia entidad.

La pantalla incluye expresamente este descargo.

## Fuente y procedencia

Cada fila conserva:

- `source_url`;
- `source_checked_at`;
- `verification_status`.

El endpoint devuelve además:

```json
{
  "source": {
    "label": "Directorio DOP Sierra Mágina",
    "checkedAt": "2026-09-02"
  }
}
```

La fecha permite decidir cuándo la información debe volver a auditarse.

## Búsqueda

El endpoint soporta:

- `q`: nombre oficial, marca o municipio;
- `municipality`;
- `entityType`.

La pantalla V1 carga el universo y filtra en cliente para una interacción inmediata con solo 23 elementos.

## Relación con una entrega

El formulario de `Nueva entrega` puede utilizar este directorio como **sugerencia**, nunca como obligación.

Regla:

```text
Directorio disponible
  -> sugiere destinos de Mágina

Directorio no disponible / sin cobertura / destino fuera de Mágina
  -> entrada manual sigue funcionando
```

Esto conserva la regla de producto:

**“Mi olivar es mío, independientemente de dónde entregue la aceituna.”**

V1 sigue guardando desde la UI el nombre elegido como destino manual. En una fase posterior se podrá vincular además `cooperative_id` cuando el usuario elija inequívocamente una entidad del directorio, sin impedir destinos externos.

## Caché y privacidad

La API distingue explícitamente datos públicos y privados.

Solo `GET /api/v1/public/*` puede devolver cabecera cacheable.

Configuración V1:

- servidor: `public, max-age=300, stale-while-revalidate=86400`;
- PWA: `NetworkFirst`;
- cache name: `magina-public-api-v1`;
- máximo 50 entradas;
- máximo 24 h.

No existe runtime cache equivalente para:

- holdings;
- farms/plots privados;
- campaigns;
- deliveries;
- activities;
- documents;
- auth/session.

Los endpoints privados siguen en `Cache-Control: no-store`.

## Tests de regresión

`public-directory-source.test.ts` comprueba:

- universo exacto de 23 IDs del seed;
- presencia de entidades ancla;
- distinción jurídica;
- fecha de revisión;
- disclaimer de no colaboración/integración.

`public-cache-policy-source.test.ts` comprueba que la caché PWA queda limitada a `/api/v1/public/*` y que el servidor conserva `no-store` para lo demás.

## Siguiente fase

Sin bloquear el piloto del núcleo privado:

1. enlazar la ruta desde la composición final de la pestaña `Mágina` cuando se sincronice con el hilo visual;
2. enriquecer únicamente campos públicos verificados;
3. introducir proceso periódico de detección de fuentes caducadas;
4. añadir coordenadas solo desde fuentes fiables antes de ofrecer mapa;
5. vincular opcionalmente una entrega a `cooperative_id` cuando el usuario seleccione una entidad inequívoca;
6. mantener siempre opción `Otro destino`/entrada manual.
