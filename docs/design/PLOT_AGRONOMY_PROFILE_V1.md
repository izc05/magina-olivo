# Mágina Olivo — Plot Agronomy Profile V1

Estado: trabajo **post-staging**. No forma parte de `staging/candidate-v5-2026-09-03`.

## Objetivo

Mantener por parcela una ficha agrícola privada, editable y separada de las fuentes cartográficas oficiales.

Campos V1:

- `oliveTreeCount`: número de olivos, entero >= 0 o sin informar;
- `irrigationType`: secano / regadío / mixto / sin definir;
- `oliveVariety`: variedad principal o mezcla declarada por el usuario;
- densidad `olivos/ha`: cálculo derivado, no persistido como autoridad.

## Reglas de confianza

1. Catastro y SIGPAC no rellenan automáticamente olivos, variedad ni riego.
2. `0` olivos es un valor válido y distinto de `null` / sin informar.
3. Picual se ofrece como acceso rápido, pero nunca se autoselecciona por ubicación.
4. La variedad admite texto libre de hasta 80 caracteres para no perder variedades locales o mezclas.
5. La densidad usa primero `boundary_area_ha` y, si no existe, `area_ha` declarada.
6. La densidad es informativa y se recalcula; no sustituye superficies administrativas.

## API

Lectura por finca:

```http
GET /api/v1/farms/:farmId/plots/agronomy
```

Actualización atómica por parcela:

```http
PATCH /api/v1/plots/:plotId/agronomy
```

Body:

```json
{
  "oliveTreeCount": 236,
  "irrigationType": "dryland",
  "oliveVariety": "Picual"
}
```

La actualización exige sesión, acceso a la finca y rol con `canWrite`.

## Persistencia

`olive_tree_count` e `irrigation_type` ya existían en `plots`.

La migración `0018_plot_agronomy_profile.sql` añade:

```text
olive_variety text null
```

con longitud útil máxima de 80 caracteres.

## UX

En `Mi Campo` la ficha mantiene una parcela seleccionada y muestra:

- olivos;
- variedad;
- riego;
- superficie usada como referencia;
- densidad calculada;
- total de olivos de las parcelas informadas.

El guardado agronómico es una sola operación para no dejar olivos/riego/variedad parcialmente actualizados.

## Integración con Map-First

Cuando se implemente #44–#46, la pantalla posterior a seleccionar parcelas Catastro reutilizará este mismo contrato:

```text
Parcela oficial verificada
  -> nombre de trabajo
  -> olivos
  -> variedad
  -> riego
  -> guardar
```

La geometría oficial y la ficha agrícola seguirán siendo dominios separados.

## Portabilidad

La exportación estructurada conserva los datos agrícolas de la parcela:

- `oliveTreeCount` desde el exportador base;
- `irrigationType` desde el exportador base;
- `oliveVariety` se añade durante la fase de augmentación/finalización del export.

La augmentación vuelve a calcular bytes y SHA-256 antes de marcar el artefacto como `ready`, de modo que la variedad queda incluida en el fichero final descargable.
