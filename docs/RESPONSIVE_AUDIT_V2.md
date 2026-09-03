# Mágina Olivo — Auditoría responsive V2.8

## Estado

**Cerrada y validada para revisión.**

La capa responsive conserva la misma identidad, jerarquía y sensación de producto desde móvil pequeño hasta escritorio, sin convertirse en un dashboard administrativo diferente.

Última validación técnica de la fase:

- workflow: `Visual V2 build`.
- run: **38**.
- commit: `7d1e7828dff4e63e1bea7dac8d592c8262c53ae4`.
- resultado: **success**.
- build TypeScript + Vite: OK.
- responsive smoke: OK.
- navigation layout smoke: OK.
- artifact de capturas: OK.

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

## Comportamiento aprobado

### 320–390 px

- claim pequeño de marca ocultable para proteger el topbar.
- accesos rápidos en cuadrícula 2 × 2.
- heroes más compactos sin perder fotografía protagonista.
- barra inferior compacta con FAB contextual separado.
- parcelas en estructura multilínea para evitar colisiones.
- detalle de parcela a una columna.
- `Campo / Cuaderno / Campaña / Gestión` visible completo.
- `Noticias / Cooperativas / Mercado / Descubre / Más` visible completo.
- `Resumen / Guardados / Documentos / Ajustes` visible completo.
- KPI de Campaña y Costes contenidos para evitar verticalidad excesiva.
- Cuaderno conserva el estado visible también en móvil.
- la etiqueta `Cooperativas` se mantiene completa en 360 px sin rebajar el mínimo táctil.

### 430–820 px

- mayor respiración sin alterar navegación.
- fotografía gana presencia cuando el ancho lo permite.
- tarjetas siguen siendo táctiles y legibles.
- no se introduce una arquitectura específica de tablet distinta de la app.

### 900–1099 px

- mapa y bloques principales aprovechan mejor la anchura.
- listas pueden pasar a dos columnas cuando mejora la lectura.
- se conservan componentes y jerarquía de móvil.

### 1100–1440 px

- mayor respiración lateral y vertical.
- noticias, parcelas, cooperativas y Cuaderno aprovechan composiciones multicolumna cuando aportan claridad.
- navegación principal deja de ser fija y entra en flujo normal.
- no existe sidebar administrativo.
- la experiencia sigue pareciendo Mágina Olivo, no un ERP.

## Mapa de parcela

La vista de parcela conserva polígono, pin y datos sobre una base fotográfica territorial.

Se muestra explícitamente la etiqueta `Vista conceptual` para evitar confundir esta fase con cartografía o SIG real.

La futura integración cartográfica queda separada de la capa responsive/visual.

## Accesibilidad y movimiento

- `focus-visible` mantiene acento dorado.
- se respeta `prefers-reduced-motion`.
- botones y destinos principales mantienen tamaño táctil suficiente.
- estados importantes no dependen solo del color.

## Validación automatizada

El workflow `Visual V2 build` valida capturas reales con Chromium en:

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

Además, en 360 × 800 y 1366 × 768 se capturan 12 estados internos por viewport:

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

Resultado: **49 capturas reales por ejecución**.

## Contratos protegidos por CI

El smoke comprueba:

- exactamente 5 destinos en navegación principal.
- objetivos táctiles mínimos de 44 px.
- FAB contextual solo donde corresponde.
- ausencia de overflow horizontal global.
- 4 pestañas visibles en Mi Campo.
- 5 pestañas visibles en Mágina.
- 4 pestañas visibles en Perfil.
- escala correcta del icono y minigráfico de mercado de Inicio.
- navegación móvil con `position: fixed` en 360 px.
- navegación de escritorio con `position: static` y situada después del contenido principal en 1366 px.
- generación y subida del artifact `responsive-captures`.

## Auditoría manual final

La revisión conjunta de las capturas finales en móvil y escritorio confirma que no hay problemas estructurales nuevos en:

- Inicio.
- Mi Campo.
- Cuaderno.
- Campaña.
- Costes.
- Maquinaria.
- Mágina / Noticias.
- Cooperativas.
- Mercado.
- Descubre.
- Perfil / Ajustes.

Las correcciones finales de Noticias preservan simultáneamente:

- nombre completo de las pestañas.
- altura mínima útil.
- ausencia de overflow horizontal.
- legibilidad del hero editorial.

## Regla para futuras fases

La responsive de V2 se considera contrato visual. Nuevas pantallas deben reutilizar los mismos breakpoints, objetivos táctiles, comportamiento de navegación y densidad antes de introducir excepciones.

Cambios de backend, datos reales o cartografía no deben reabrir esta arquitectura salvo necesidad funcional demostrada.
