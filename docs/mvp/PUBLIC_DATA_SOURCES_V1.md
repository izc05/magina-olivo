# Mágina Olivo — Fuentes públicas V1

Estado: integración pública funcional en `feat/mvp-core-v1`, con validaciones externas todavía pendientes de staging.

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

## Superficies públicas

Preparadas actualmente:

- `/magina` — hub territorial;
- `/magina/tiempo` — predicción municipal AEMET;
- `/magina/directorio` — 23 cooperativas/almazaras/entidades auditadas.

El hub consulta además `GET /api/v1/public/sources` para mostrar procedencia y frescura sin revelar secretos ni errores internos completos.

## Registro de fuentes

Migración: `db/migrations/0006_public_data_sources.sql`.

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

## Municipios públicos verificados

Migración: `db/migrations/0007_public_municipalities.sql`.

Se almacenan 14 municipios canónicos usados por las entidades auditadas de Sierra Mágina, cada uno con:

- `slug` humano;
- nombre oficial;
- provincia;
- código AEMET verificado;
- aliases/núcleos;
- URL de fuente;
- fecha de comprobación.

Aliases relevantes:

- `Arbuniel -> Cambil`;
- `Solera -> Huelma`;
- `Bedmar / Garcíez -> Bedmar y Garcíez`;
- `Carchelejo / Cárchel -> Cárcheles`.

Los núcleos no reciben códigos AEMET inventados.

Endpoint:

`GET /api/v1/public/municipalities`

La interfaz trabaja con slugs y nombres; el código AEMET queda como detalle interno del backend.

## AEMET

Fuente: **AEMET OpenData**.

V1 implementa:

- adaptador server-side `aemet-weather-provider.ts`;
- endpoint `GET /api/v1/public/weather?municipality=huelma`;
- `AEMET_API_KEY` solo en backend;
- allowlist efectiva basada en filas activas de `public_municipalities`;
- caché backend de 30 minutos;
- caché PWA únicamente dentro del namespace público;
- parser probado con fixtures;
- pantalla `/magina/tiempo`.

Normalización V1 por día:

- fecha;
- probabilidad de precipitación;
- temperatura mínima;
- temperatura máxima;
- viento máximo disponible.

Si AEMET omite un valor, la API devuelve `null`; no se convierte en `0`.

La respuesta incluye atribución `AEMET` y recuerda que la predicción representa la capital del municipio y puede variar dentro del término por altitud/localización.

La página no formula recomendaciones agronómicas automáticas a partir del tiempo.

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

La inspección real del ZIP debe ejecutarse en staging. El entorno usado durante el desarrollo no pudo resolver directamente el host para descargar el binario, por lo que **no se afirma que el esquema XML haya sido inspeccionado todavía**.

### Deliberadamente NO implementado todavía

- descargar el ZIP completo automáticamente en producción;
- descomprimir;
- parsear XML;
- crear alertas por municipio;
- inferir riesgo para una parcela del usuario.

Antes hay que obtener un snapshot real, registrar hash e inspeccionar la estructura con tests.

## DOP Sierra Mágina

Fuente V1 del directorio de 23 entidades.

Implementado:

- entidades versionadas por migración;
- distinción jurídica `cooperative / sat / company / other`;
- búsqueda pública;
- fecha de revisión;
- pantalla `/magina/directorio`;
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

1. probar `/magina/tiempo` contra staging con una clave AEMET real server-side;
2. ejecutar `public.raif.inspect` en staging;
3. descargar un snapshot RAIF controlado y registrar hash;
4. inspeccionar estructura XML real;
5. diseñar parser V1 de Jaén/olivar;
6. agregar señales por municipio/semana sin convertir observación regional en diagnóstico individual;
7. sincronizar el hub público `/magina` con la composición final de la pestaña `Mágina` del hilo visual;
8. continuar después con mercado del aceite y noticias públicas versionadas.
