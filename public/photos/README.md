# Mágina Olivo — assets fotográficos

Este directorio está reservado para las fotografías territoriales optimizadas usadas por la interfaz.

## Generación reproducible

Los WebP P0 no dependen de hotlinking. Se generan localmente con:

```bash
npm run photos:sync
```

El script `scripts/fetch-approved-photos.mjs` consulta la API oficial de Wikimedia Commons, obtiene una versión adecuada al ancho objetivo y genera adaptaciones WebP con `sharp`.

En CI, la secuencia es:

1. `npm install`
2. `npm run photos:sync`
3. `npm run build`

La ejecución validada generó los cuatro assets y compiló correctamente.

## Archivos P0

- `home-sierra-magina.webp`
- `field-olivares-magina.webp`
- `discover-sierra-magina.webp`
- `discover-jimena.webp`

No se debe añadir ni sustituir una fotografía sin registrar autor, origen y licencia.

## Créditos

### `home-sierra-magina.webp`

Adaptación de **Paisaje de olivar 24J 05.jpg**.

- Autor: Veinticuatro de Jahén
- Origen: Wikimedia Commons
- Página: https://commons.wikimedia.org/wiki/File:Paisaje_de_olivar_24J_05.jpg
- Licencia: CC BY-SA 4.0
- Licencia: https://creativecommons.org/licenses/by-sa/4.0/
- Adaptación: recorte y optimización WebP para interfaz.

### `field-olivares-magina.webp`

Adaptación de **Olivares Sierra Mágina.jpg**.

- Autor: Veinticuatro de Jahén
- Origen: Wikimedia Commons
- Página: https://commons.wikimedia.org/wiki/File:Olivares_Sierra_M%C3%A1gina.jpg
- Licencia: CC BY-SA 4.0
- Licencia: https://creativecommons.org/licenses/by-sa/4.0/
- Adaptación: recorte y optimización WebP para interfaz.

### `discover-sierra-magina.webp`

Adaptación de **SIERRA MÁGINA.jpg**.

- Autor: Manuel Francisco Parrilla Cabezas
- Origen: Wikimedia Commons
- Página: https://commons.wikimedia.org/wiki/File:SIERRA_M%C3%81GINA.jpg
- Licencia: CC BY-SA 4.0
- Licencia: https://creativecommons.org/licenses/by-sa/4.0/
- Adaptación: recorte y optimización WebP para interfaz.

### `discover-jimena.webp`

Adaptación de **Jimena Jaén01.jpg**.

- Autor: Veinticuatro de Jahén
- Origen: Wikimedia Commons
- Página: https://commons.wikimedia.org/wiki/File:Jimena_Ja%C3%A9n01.jpg
- Licencia: CC BY-SA 4.0
- Licencia: https://creativecommons.org/licenses/by-sa/4.0/
- Adaptación: recorte y optimización WebP para interfaz.

## Resultado de la ejecución CI validada

- Home: ~224 KB
- Mi Campo: ~375 KB
- Descubre Sierra Mágina: ~254 KB
- Jimena: ~319 KB

Los tamaños pueden variar ligeramente si Wikimedia regenera miniaturas o cambia la versión fuente, por lo que el criterio importante es conservar calidad visual, atribución y control de peso.

## Regla de publicación

Las adaptaciones deben conservar la atribución y las obligaciones de CC BY-SA 4.0. El uso de una fotografía no implica respaldo o patrocinio de sus autores hacia Mágina Olivo.
