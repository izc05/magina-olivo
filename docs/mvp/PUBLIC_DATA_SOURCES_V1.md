# Mágina Olivo — Fuentes públicas V1

Estado: arquitectura e integración inicial en `feat/mvp-core-v1`.

## Principio

La información pública de `Mágina` nunca se mezcla conceptualmente con el histórico privado del agricultor.

```text
Fuentes públicas
  -> adaptador / ingesta
  -> procedencia + fecha + estado
  -> API /api/v1/public/*
  -> interfaz Mágina

Datos privados
  -> sesión + autorización por holding
  -> /api/v1/... privados
  -> Cache-Control: no-store
```

## Registro de fuentes

Migración: `db/migrations/0006_public_data_sources.sql`.

Tablas:

### `public_data_sources`

Catálogo canónico de fuentes:

- `source_key`;
- etiqueta y proveedor;
- URL oficial;
- licencia;
- frecuencia esperada;
- fecha declarada/observada de actualización;
- último chequeo;
- último éxito;
- último error;
- metadata técnica.

### `public_source_snapshots`

Preparada para ingestas reproducibles:

- hash SHA-256 del artefacto;
- fecha de fuente;
- fecha de descarga;
- versión de parser;
- número de registros;
- clave de objeto raw cuando exista;
- estado `downloaded / parsed / failed / superseded`.

Regla: **primero snapshot; después interpretación**. Un cambio de parser no debe borrar la evidencia de qué artefacto produjo los datos.

## Endpoint de transparencia

`GET /api/v1/public/sources`

Expone únicamente información de procedencia pública y salud de la fuente. No expone secretos, credenciales ni errores internos completos.

## AEMET

Fuente: **AEMET OpenData**.

V1 implementa:

- adaptador server-side `aemet-weather-provider.ts`;
- endpoint `GET /api/v1/public/weather?municipalityCode=#####`;
- `AEMET_API_KEY` solo en backend;
- allowlist `AEMET_ALLOWED_MUNICIPALITY_CODES` para impedir que el servicio sea un proxy abierto;
- caché backend de 30 minutos;
- caché PWA únicamente dentro del namespace público;
- parser probado con fixtures.

Normalización V1 por día:

- fecha;
- probabilidad de precipitación;
- temperatura mínima;
- temperatura máxima;
- viento máximo disponible.

Si AEMET omite un valor, la API devuelve `null`; no se convierte en `0`.

La respuesta incluye atribución `AEMET`.

## RAIF — Olivar

Fuente: **Red de Alerta e Información Fitosanitaria de Andalucía**, portal de datos abiertos de la Junta de Andalucía.

El dataset público de olivar se trata como fuente de contexto regional/municipal, nunca como diagnóstico de una finca concreta.

### Fase implementada: inspección

Artefacto oficial V1:

`RAIF_Olivar_Andalucia_2006_2026.zip`

El worker soporta el job:

`public.raif.inspect`

Comando para encolarlo:

```bash
npm run source:raif:enqueue --workspace @magina/worker
```

El enqueue usa una `dedupe_key` diaria, por lo que repetir el comando el mismo día no crea trabajos duplicados.

El worker:

1. hace `HEAD` al recurso oficial;
2. exige HTTPS;
3. acepta únicamente `juntadeandalucia.es` o subdominios;
4. vuelve a validar el host tras redirects;
5. recoge `ETag`, `Last-Modified`, `Content-Length` y `Content-Type`;
6. actualiza `public_data_sources`;
7. utiliza los reintentos y leases existentes de `job_queue`;
8. registra el error de fuente si falla.

### Deliberadamente NO implementado todavía

- descargar el ZIP completo automáticamente en producción;
- descomprimir;
- parsear XML;
- crear alertas por municipio;
- inferir riesgo para una parcela del usuario.

Antes hay que inspeccionar archivos reales y definir campos canónicos con tests.

## DOP Sierra Mágina

Fuente V1 del directorio de 23 entidades.

Implementado:

- entidades versionadas por migración;
- distinción jurídica `cooperative / sat / company / other`;
- búsqueda pública;
- fecha de revisión;
- sugerencias opcionales en Nueva entrega;
- `cooperativeId` canónico cuando la selección coincide exactamente;
- entrada manual siempre disponible.

## Política de caché

### Permitido

`GET /api/v1/public/*`

- servidor: caché pública corta;
- PWA: `NetworkFirst` con namespace `magina-public-api-v1`.

### Prohibido por diseño V1

No hay runtime cache para:

- sesión;
- holdings;
- fincas/parcelas privadas;
- campañas;
- entregas;
- rendimientos;
- labores;
- documentos.

Estos endpoints continúan con `Cache-Control: no-store`.

## Alertas y lenguaje

Nunca mostrar:

> “Tu parcela tiene mosca del olivo”

si la única evidencia es RAIF regional.

Lenguaje válido:

> “RAIF registra actividad de mosca del olivo en el ámbito consultado. Revisa tu parcela y las recomendaciones oficiales.”

Las recomendaciones oficiales se enlazan/citan; Mágina Olivo no inventa tratamientos fitosanitarios.

## Próximas fases

1. validar códigos AEMET de los municipios piloto;
2. probar AEMET contra staging con una clave real server-side;
3. ejecutar `public.raif.inspect` en staging;
4. descargar un snapshot RAIF controlado y registrar hash;
5. inspeccionar estructura XML real;
6. diseñar parser V1 de Jaén/olivar;
7. agregar señales por municipio/semana sin convertir observación regional en diagnóstico individual;
8. añadir cards de Tiempo y RAIF a la composición final de la pestaña `Mágina`.
