# Catálogo maestro de imágenes municipales

Fecha: 2026-09-08
Estado inicial: repositorio preparado, fotografías municipales pendientes de selección y verificación.

Este catálogo controla qué imagen puede publicarse en el hero de Mágina Olivo. Ningún municipio pasa a `ready` solo porque exista un archivo: deben constar fuente, autoría/licencia y revisión visual.

| Municipio | Slug | Hero | Mobile | Thumb | Derechos | Estado |
|---|---|---:|---:|---:|---|---|
| Albanchez de Mágina | `albanchez-de-magina` | ⬜ | ⬜ | ⬜ | pendiente | sourcing |
| Bedmar y Garcíez | `bedmar-y-garciez` | ⬜ | ⬜ | ⬜ | pendiente | sourcing |
| Bélmez de la Moraleda | `belmez-de-la-moraleda` | ⬜ | ⬜ | ⬜ | pendiente | sourcing |
| Cabra del Santo Cristo | `cabra-del-santo-cristo` | ⬜ | ⬜ | ⬜ | pendiente | sourcing |
| Cambil | `cambil` | ⬜ | ⬜ | ⬜ | pendiente | sourcing |
| Campillo de Arenas | `campillo-de-arenas` | ⬜ | ⬜ | ⬜ | pendiente | sourcing |
| Cárcheles | `carcheles` | ⬜ | ⬜ | ⬜ | pendiente | sourcing |
| La Guardia de Jaén | `guardia-de-jaen` | ⬜ | ⬜ | ⬜ | pendiente | sourcing |
| Huelma | `huelma` | ⬜ | ⬜ | ⬜ | pendiente | sourcing |
| Jimena | `jimena` | ⬜ | ⬜ | ⬜ | pendiente | sourcing |
| Jódar | `jodar` | ⬜ | ⬜ | ⬜ | pendiente | sourcing |
| Larva | `larva` | ⬜ | ⬜ | ⬜ | pendiente | sourcing |
| Mancha Real | `mancha-real` | ⬜ | ⬜ | ⬜ | pendiente | sourcing |
| Pegalajar | `pegalajar` | ⬜ | ⬜ | ⬜ | pendiente | sourcing |
| Torres | `torres` | ⬜ | ⬜ | ⬜ | pendiente | sourcing |

## Estados

- `sourcing`: buscando candidatos.
- `rights_review`: imagen candidata localizada; falta revisar reutilización.
- `crop_review`: derechos válidos; preparando recortes desktop/mobile/thumb.
- `ready`: activos incorporados, metadatos completos y revisión visual superada.
- `blocked`: no existe todavía una imagen reutilizable adecuada; se mantiene el fallback comarcal.

## Ficha que debe completarse por imagen aprobada

```text
municipality:
slug:
photo_author:
photo_source_url:
photo_license_label:
photo_license_url:
permission_evidence:       # si procede
checked_at:
hero_object_position:
mobile_object_position:
notes:
```

## Criterios visuales

1. El núcleo urbano debe ser reconocible; evitar imágenes genéricas de olivar que podrían pertenecer a cualquier municipio.
2. Priorizar una lectura horizontal limpia para hero de escritorio.
3. El recorte móvil debe conservar el elemento identificativo principal.
4. Evitar texto incrustado, logotipos y marcas de agua.
5. Mantener una línea fotográfica coherente: paisaje natural, luz realista y color no excesivamente procesado.
6. Comprobar contraste con tarjeta meteorológica, selector y caption.
7. No convertir una pedanía/localidad en municipio independiente: Arbuniel queda bajo Cambil; Solera bajo Huelma; Garcíez bajo Bedmar y Garcíez; Carchelejo/Cárchel bajo Cárcheles.

## Orden recomendado de incorporación

Primera tanda para validar variedad de encuadres y comportamiento responsive:

1. Pegalajar
2. Huelma
3. Jódar
4. Torres
5. Mancha Real

Segunda tanda:

6. Bedmar y Garcíez
7. Albanchez de Mágina
8. Bélmez de la Moraleda
9. Cambil
10. Jimena

Tercera tanda:

11. Cabra del Santo Cristo
12. Campillo de Arenas
13. Cárcheles
14. La Guardia de Jaén
15. Larva

El orden es operativo, no una prioridad territorial.