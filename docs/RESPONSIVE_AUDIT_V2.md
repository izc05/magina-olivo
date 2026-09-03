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
- El botón contextual `+` conserva un mínimo de 48 px en móvil pequeño.
- El nombre de marca tiene prioridad sobre el claim cuando el ancho es limitado.
- Ningún bloque esencial depende de hover.
- Las ramas principales de navegación secundaria deben ser visibles sin quedar ocultas fuera del viewport en 360–430 px.
- La información secundaria puede compactarse; estado, acción y contexto principal no deben desaparecer.
- En escritorio se amplía el lienzo y se aprovecha mejor la anchura, pero se conserva el lenguaje de app.

## Correcciones aplicadas

### 320–390 px

- Se oculta el claim pequeño del logotipo para evitar compresión del topbar.
- Accesos rápidos pasan de cuatro columnas a una cuadrícula 2 × 2.
- Se reduce ligeramente la altura de los heroes sin perder fotografía protagonista.
- Barra inferior se compacta manteniendo el FAB contextual en 48 px.
- Parcelas pasan a una estructura de dos líneas: nombre/datos + estado.
- Detalle de parcela pasa a una columna.
- Resumen semanal pasa a una columna para mantener lectura real en exterior.
- Mercado pasa a filas completas en vez de tres tarjetas muy estrechas.
- Titulares editoriales reducen tamaño solo en móvil estrecho.
- `Campo / Cuaderno / Campaña / Gestión`, `Noticias / Cooperativas / Mercado / Descubre / Más` y `Resumen / Guardados / Documentos / Ajustes` quedan visibles completos en 360–430 px.

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

## Validación visual real ejecutada

El workflow `Visual V2 build` genera y valida capturas reales con Chromium en:

1. 360 × 800.
2. 390 × 844.
3. 430 × 932.
4. 768 × 1024.
5. 1366 × 768.

Cada ejecución recorre las cinco secciones principales:

- Inicio.
- Mi Campo.
- Mágina.
- Descubre.
- Perfil.

Resultado: **25 capturas por ejecución**.

El run 17 (`f1f4072574b94b6cc6d9c091eeb6b35db95198e5`) terminó correctamente y validó:

- exactamente 5 destinos en la navegación principal;
- objetivos táctiles mínimos de 44 px;
- FAB contextual solo donde corresponde;
- ausencia de overflow horizontal global;
- 4 pestañas visibles en Mi Campo;
- 5 pestañas visibles en Mágina;
- 4 pestañas visibles en Perfil;
- generación y subida del artifact `responsive-captures`.

Además, la pasada visual detectó un fallo que no era geométrico: el icono pequeño de tendencia del mercado de Inicio heredaba el tamaño del SVG principal y se expandía en escritorio. Se corrige la selección CSS y se añade una aserción específica al smoke para impedir su regreso.

## Regla para el cierre V2

La responsive se considera cerrada cuando:

- compila el proyecto;
- no hay overflow horizontal accidental;
- todos los CTA principales son alcanzables con pulgar;
- las ramas principales de subnavegación permanecen visibles;
- no se rompe la jerarquía de las primeras referencias visuales;
- la versión de escritorio sigue pareciendo Mágina Olivo, no un ERP;
- las capturas reales y el smoke de Chromium terminan en verde.
