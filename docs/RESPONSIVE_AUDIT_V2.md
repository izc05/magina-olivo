# Mágina Olivo — Auditoría responsive V2.3

## Objetivo

Validar que la interfaz conserva la misma identidad, jerarquía y sensación de producto desde móvil pequeño hasta escritorio, sin convertirse en un dashboard administrativo diferente.

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
- En escritorio se amplía el lienzo, pero se conserva el mismo lenguaje visual de aplicación.
- La navegación móvil permanece fija; en escritorio pasa a flujo normal para no invadir gráficos, listas ni contenido principal.

## Correcciones aplicadas

### 320–390 px

- Se oculta el claim pequeño del logotipo para evitar compresión del topbar.
- Accesos rápidos pasan de cuatro columnas a una cuadrícula 2 × 2.
- Se reduce ligeramente la altura de los heroes sin perder fotografía protagonista.
- Barra inferior se compacta manteniendo el FAB contextual en 48 px.
- Parcelas pasan a una estructura de dos líneas: nombre/datos + estado.
- Detalle de parcela pasa a una columna.
- `Campo / Cuaderno / Campaña / Gestión`, `Noticias / Cooperativas / Mercado / Descubre / Más` y `Resumen / Guardados / Documentos / Ajustes` quedan visibles completos.
- Los tres KPI de Campaña y los tres KPI principales de Costes se mantienen en una fila compacta para evitar una pantalla excesivamente vertical.

### 680–1099 px

- El lienzo crece sin perder proporción de aplicación.
- Parcelas y noticias pueden usar dos columnas.
- Heroes ganan altura para recuperar presencia fotográfica.
- Se mantiene la misma arquitectura de navegación, sin introducir un sidebar administrativo.

### 900 px en adelante

- El mapa de Mi Campo aprovecha mejor la anchura disponible.
- Se mantiene la misma tarjeta y los mismos componentes; solo cambia su composición.

### 1100 px en adelante

- Mayor respiración lateral y vertical.
- Noticias, parcelas y cooperativas aprovechan dos columnas cuando ayuda a la lectura.
- La navegación principal deja de ser fija y se coloca después del contenido principal para no cruzar gráficos ni tarjetas.
- La versión de escritorio sigue pareciendo Mágina Olivo y no un ERP.

## Mapa de parcela V2.2

La vista de parcela conserva polígono, pin y datos, pero sustituye el fondo esquemático por una base fotográfica territorial del olivar. Se muestra explícitamente la etiqueta `Vista conceptual` para evitar confundir esta fase con cartografía o SIG real.

La futura conexión con cartografía real queda separada de esta capa visual.

## Accesibilidad y movimiento

- Se mantiene `focus-visible` con acento dorado.
- Se respeta `prefers-reduced-motion` para futuras transiciones y animaciones.
- Los botones principales se mantienen aptos para uso táctil.

## Validación visual automatizada

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

Esto produce **25 capturas principales**.

Además, en 360 × 800 y 1366 × 768 se capturan y validan 12 estados internos por viewport:

- Mi Campo · Cuaderno.
- Mi Campo · Campaña.
- Mi Campo · Costes.
- Mi Campo · Maquinaria.
- Mágina · Cooperativas.
- Mágina · Mercado.
- Mágina · Descubre.
- Mágina · Más.
- Perfil · Guardados.
- Perfil · Documentos.
- Perfil · Ajustes.
- Descubre · Detalle de ruta.

Resultado actual: **49 capturas reales por ejecución**.

## Contratos protegidos por CI

El smoke comprueba:

- exactamente 5 destinos en la navegación principal;
- objetivos táctiles mínimos de 44 px;
- FAB contextual solo donde corresponde;
- ausencia de overflow horizontal global;
- 4 pestañas visibles en Mi Campo;
- 5 pestañas visibles en Mágina;
- 4 pestañas visibles en Perfil;
- escala correcta del icono y minigráfico de mercado de Inicio;
- navegación móvil con `position: fixed` en 360 px;
- navegación de escritorio con `position: static` y situada después del contenido principal en 1366 px;
- generación y subida del artifact `responsive-captures`.

## Estado verificado

El run 24, asociado al commit `b71f855e31c96d1ba5229140191db3e9f0ceef5b`, terminó completamente en verde.

Pasaron correctamente:

- fotografía aprobada;
- TypeScript y build Vite;
- smoke responsive de 49 capturas;
- smoke específico de layout de navegación;
- subida del artifact de evidencias visuales.

## Regla para el cierre V2

La responsive se considera cerrada mientras se mantengan simultáneamente estas condiciones:

- compila el proyecto;
- no hay overflow horizontal accidental;
- los CTA principales son alcanzables con pulgar;
- las ramas principales de subnavegación permanecen visibles;
- no se rompe la jerarquía de las primeras referencias visuales;
- la versión de escritorio sigue pareciendo Mágina Olivo, no un ERP;
- móvil conserva navegación fija y escritorio no superpone navegación sobre contenido;
- las capturas reales y los smoke de Chromium terminan en verde.
