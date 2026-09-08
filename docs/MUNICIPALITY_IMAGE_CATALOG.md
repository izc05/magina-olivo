# Catálogo maestro de imágenes municipales

Fecha: 2026-09-08
Estado: repositorio preparado y primera tanda con derechos verificados; recortes pendientes.

Este catálogo controla qué imagen puede publicarse en el hero de Mágina Olivo. Ningún municipio pasa a `ready` solo porque exista un archivo: deben constar fuente, autoría/licencia, recortes y revisión visual.

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
| Huelma | `huelma` | ⬜ | ⬜ | ⬜ | CC BY-SA 3.0 / GFDL 1.2+ | crop_review |
| Jimena | `jimena` | ⬜ | ⬜ | ⬜ | pendiente | sourcing |
| Jódar | `jodar` | ⬜ | ⬜ | ⬜ | CC BY-SA 4.0 | crop_review |
| Larva | `larva` | ⬜ | ⬜ | ⬜ | pendiente | sourcing |
| Mancha Real | `mancha-real` | ⬜ | ⬜ | ⬜ | CC BY-SA 4.0 | crop_review |
| Pegalajar | `pegalajar` | ⬜ | ⬜ | ⬜ | CC BY-SA 4.0 | crop_review |
| Torres | `torres` | ⬜ | ⬜ | ⬜ | CC BY-SA 4.0 | crop_review |

## Primera tanda — candidatos verificados

### Pegalajar

```text
municipality: Pegalajar
slug: pegalajar
photo_author: Veinticuatro de Jahén
photo_source_url: https://commons.wikimedia.org/wiki/File:Pegalajar,_en_Ja%C3%A9n_(Espa%C3%B1a).jpg
photo_license_label: CC BY-SA 4.0
photo_license_url: https://creativecommons.org/licenses/by-sa/4.0/
checked_at: 2026-09-08
source_resolution: 3506x1973
status: crop_review
notes: vista de La Charca; ya existe un recorte horizontal en Commons. Preparar recorte móvil conservando el elemento reconocible.
```

### Huelma

```text
municipality: Huelma
slug: huelma
photo_author: José Sánchez Rodríguez y Rafael Palomo López
photo_source_url: https://commons.wikimedia.org/wiki/File:Huelma,_en_Ja%C3%A9n_(Espa%C3%B1a).jpg
photo_license_label: CC BY-SA 3.0 / GFDL 1.2+
photo_license_url: https://creativecommons.org/licenses/by-sa/3.0/
checked_at: 2026-09-08
source_resolution: 2048x1152
status: crop_review
notes: vista del conjunto histórico de Huelma. Mantener atribución doble indicada en la fuente.
```

### Jódar

```text
municipality: Jódar
slug: jodar
photo_author: Montse Sánchez Navas
photo_source_url: https://commons.wikimedia.org/wiki/File:J%C3%B3dar,_en_Ja%C3%A9n_(Espa%C3%B1a).jpg
photo_license_label: CC BY-SA 4.0
photo_license_url: https://creativecommons.org/licenses/by-sa/4.0/
checked_at: 2026-09-08
source_resolution: 3192x1797
status: crop_review
notes: panorámica desde mirador; formato horizontal muy adecuado para hero. Revisar dónde cae el núcleo urbano en móvil.
```

### Torres

```text
municipality: Torres
slug: torres
photo_author: Veinticuatro de Jahén
photo_source_url: https://commons.wikimedia.org/wiki/File:Torres,_en_Ja%C3%A9n_(Espa%C3%B1a).jpg
photo_license_label: CC BY-SA 4.0
photo_license_url: https://creativecommons.org/licenses/by-sa/4.0/
checked_at: 2026-09-08
source_resolution: 2270x1277
status: crop_review
notes: vista general del pueblo. No confundir con Torres de Albanchez; la categoría y coordenadas corresponden a Torres, Sierra Mágina.
```

### Mancha Real

```text
municipality: Mancha Real
slug: mancha-real
photo_author: Veinticuatro de Jahén
photo_source_url: https://commons.wikimedia.org/wiki/File:Mancha_Real,_en_Ja%C3%A9n_(Espa%C3%B1a).jpg
photo_license_label: CC BY-SA 4.0
photo_license_url: https://creativecommons.org/licenses/by-sa/4.0/
checked_at: 2026-09-08
source_resolution: 2733x1537
status: crop_review
notes: vista general de Mancha Real; ya existe recorte panorámico en Commons. Preparar variante móvil y comprobar legibilidad de overlays.
```

## Estados

- `sourcing`: buscando candidatos.
- `rights_review`: imagen candidata localizada; falta revisar reutilización.
- `crop_review`: derechos válidos; preparando recortes desktop/mobile/thumb y comprobando overlays.
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
