# Mágina Olivo — Auditoría responsive V2.1

## Objetivo

Validar que la interfaz conserva la misma identidad y jerarquía desde móvil pequeño hasta escritorio, sin convertirse en un dashboard administrativo diferente.

## Matriz de referencia

- 320 px: móvil mínimo soportado.
- 360–390 px: móvil principal de trabajo.
- 430 px: móvil grande.
- 680–820 px: tablet vertical / plegable.
- 900–1099 px: tablet horizontal / escritorio compacto.
- 1100–1440 px: escritorio.

## Criterios fijados

- Controles principales con objetivo táctil mínimo de 44 px.
- Barra inferior persistente y legible en móvil.
- El botón central `+` conserva un mínimo de 48 px en móvil pequeño.
- El nombre de marca tiene prioridad sobre el claim cuando el ancho es limitado.
- Ningún bloque esencial debe depender de hover.
- Pestañas largas pueden desplazarse horizontalmente, pero las ramas principales deben ser pocas.
- La información secundaria puede compactarse; estado, acción y contexto principal no deben desaparecer.
- En escritorio se amplía el lienzo y se aprovecha mejor la anchura, pero se conserva el lenguaje de app.

## Correcciones aplicadas

### 320–390 px

- Se oculta el claim pequeño del logotipo para evitar compresión del topbar.
- Accesos rápidos pasan de cuatro columnas a una cuadrícula 2 × 2.
- Se reduce ligeramente la altura de los heroes sin perder fotografía protagonista.
- Barra inferior se compacta manteniendo el FAB central en 48 px.
- Parcelas pasan a una estructura de dos líneas: nombre/datos + estado, evitando que la etiqueta de estado compita con el título.
- Detalle de parcela pasa a una columna.
- Resumen semanal pasa a una columna para mantener lectura real en exterior.
- Mercado pasa a filas completas en vez de tres tarjetas muy estrechas.
- Titulares editoriales reducen tamaño solo en móvil estrecho.

### 680–1099 px

- El lienzo crece hasta 820 px sin perder proporción de aplicación.
- Parcelas y noticias pueden usar dos columnas.
- Heroes ganan altura para recuperar presencia fotográfica.
- Barra inferior se mantiene centrada y no se sustituye por una navegación completamente distinta.

### 900 px en adelante

- El mapa de Mi Campo aprovecha anchura real: mapa a la izquierda y datos/estado a la derecha.
- Se mantiene la misma tarjeta y los mismos componentes, solo cambia su composición.

### 1100 px en adelante

- Lienzo máximo aproximado de 980 px.
- Mayor respiración lateral y vertical.
- Noticias, parcelas y cooperativas aprovechan dos columnas cuando ayuda a la lectura.
- La navegación sigue siendo la misma; no se introduce sidebar administrativo.

## Accesibilidad y movimiento

- Se mantiene `focus-visible` con acento dorado.
- Se añade tratamiento `prefers-reduced-motion` para futuras transiciones/animaciones.
- Los botones principales se mantienen aptos para uso táctil.

## Pendiente de comprobación visual real

La auditoría estructural está aplicada en CSS, pero antes de merge deben hacerse capturas o pruebas reales en al menos:

1. 360 × 800.
2. 390 × 844.
3. 430 × 932.
4. 768 × 1024.
5. 1366 × 768.

Especial atención a:

- Inicio: relación hero / accesos rápidos / primer scroll.
- Mi Campo: tabs, parcelas, mapa y Gestión.
- Mágina: tabs principales + bloque Más Mágina.
- Comunidad: detalle y caja de respuesta.
- Mi Mágina: preview de documento.
- Estados técnicos: teclado móvil, formularios y mensajes largos.

## Regla para el cierre V2

La responsive se considera cerrada cuando:

- compila el proyecto;
- no hay overflow horizontal accidental;
- todos los CTA principales son alcanzables con pulgar;
- no se rompe la jerarquía de las primeras referencias visuales;
- la versión de escritorio sigue pareciendo Mágina Olivo, no un ERP.
