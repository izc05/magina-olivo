# Sistema de diseño V1 — Mágina Olivo

Fecha: 2026-09-02
Estado: dirección visual provisional para prototipo

## 1. Objetivo de marca

Mágina Olivo no debe parecer:
- un ERP gris;
- una app fintech;
- una tienda de aceite;
- una app rural decorada con hojas por todas partes.

Debe transmitir:
- campo real;
- confianza;
- claridad;
- proximidad;
- tecnología discreta;
- Sierra Mágina sin folclore excesivo.

Concepto:

> **El cuaderno del olivar llevado al móvil, con la precisión de una herramienta moderna.**

## 2. Personalidad visual

Palabras guía:
- natural;
- sobria;
- cálida;
- práctica;
- limpia;
- local;
- robusta.

Evitar:
- neón;
- gradientes tecnológicos intensos;
- exceso de glassmorphism;
- iconografía demasiado infantil;
- fotografías de stock genéricas de agricultores sonrientes;
- fondos visuales que dificulten leer datos en exterior.

## 3. Paleta propuesta

### Verde Mágina — principal

`#203D2A`

Uso:
- cabecera;
- botones primarios;
- navegación activa;
- marca.

Contraste aproximado:
- sobre blanco: 11.9:1
- sobre fondo piedra: 10.7:1

Adecuado para texto/controles con gran margen sobre AA.

### Piedra clara — fondo

`#F6F3E8`

Uso:
- fondo general cálido;
- separar la app de la estética blanca clínica.

### Tinta — texto principal

`#1A221C`

Sobre Piedra: contraste aproximado 14.7:1.

### Verde hoja — secundario

`#4E6A55`

Uso:
- información secundaria;
- iconos;
- tags activos.

Sobre blanco: ~6:1.

### Aceite / dorado — acento

`#B8892D`

Uso:
- rendimientos;
- elementos destacados;
- microacentos;
- gráficos.

No usar texto blanco pequeño encima: el contraste con blanco es insuficiente para AA normal.

Usar texto oscuro `#1A221C` sobre dorado (~5.2:1) cuando funcione como fondo de control.

### Rojo tierra — error/importante

`#9A3D2F`

Uso:
- error;
- aviso crítico;
- estado que requiere atención.

Sobre blanco: ~6.8:1.

### Superficie

`#FFFFFF`

Tarjetas y formularios sobre fondo Piedra.

### Verde pálido

`#DDE6DD`

Uso:
- éxito suave;
- fondo de tags;
- selected states con texto oscuro.

## 4. Tokens conceptuales

```text
color.bg.app          #F6F3E8
color.bg.surface      #FFFFFF
color.text.primary    #1A221C
color.text.secondary  #4E5B50
color.brand.primary   #203D2A
color.brand.secondary #4E6A55
color.accent.oil      #B8892D
color.status.danger   #9A3D2F
color.status.soft     #DDE6DD
```

Los valores definitivos deberán testearse en componentes reales y dark mode solo se añadirá si aporta valor; no es prioridad del piloto.

## 5. Tipografía

Prioridad V1:
- legibilidad;
- rendimiento;
- números claros;
- español completo;
- buen funcionamiento Android/iOS.

Propuesta inicial:

### UI

`Inter`, con fallback:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Si se quiere evitar una dependencia web inicial, usar system stack en el prototipo y evaluar tipografía de marca después.

### Números/KPIs

Usar cifras tabulares cuando sea posible:

```css
font-variant-numeric: tabular-nums;
```

Importante para:
- kilos;
- porcentajes;
- comparativas;
- tablas/listas.

## 6. Escala tipográfica orientativa

```text
Display KPI     32–36 / semibold
H1 móvil        28 / semibold
H2              22 / semibold
H3              18 / semibold
Body            16 / regular
Body small      14 / regular
Caption         12–13 / medium
Button          16 / semibold
```

No bajar datos importantes a 11 px para hacer caber más información.

## 7. Espaciado

Base 4 px.

Tokens:

```text
4   xs
8   sm
12  md-sm
16  md
24  lg
32  xl
48  2xl
```

Pantalla móvil:
- padding lateral normal: 16 px;
- tarjetas: 16–20 px;
- separación de bloques principales: 24 px.

## 8. Radios

Propuesta:
- input/button: 12 px;
- card: 16 px;
- modal/bottom sheet: 20–24 px arriba;
- chip: pill solo cuando semánticamente sea chip/tag.

Evitar que absolutamente todo sea una píldora.

## 9. Elevación

Muy sutil.

Preferir:
- borde fino;
- diferencia de superficie;
- espacio.

En vez de sombras grandes tipo marketplace.

## 10. Botones

### Primario

Fondo Verde Mágina.
Texto blanco.
Altura objetivo: 48–52 px.

Ejemplos:
- Guardar entrega
- Guardar labor
- Confirmar importación

### Secundario

Superficie clara + borde verde.

### Terciario

Texto/icono sin caja fuerte.

### Peligro

Rojo tierra, reservado a:
- eliminar;
- desvincular;
- descartar cambios críticos.

No usar rojo para avisos meteorológicos normales si no son críticos.

## 11. Inputs

Objetivo de campo:
- altura ~48 px;
- label visible arriba;
- placeholder no sustituye al label;
- error debajo;
- teclado apropiado.

### Kilos

Input numérico destacado:
- tamaño de número grande;
- sufijo `kg` visible;
- aceptar decimales solo si realmente son necesarios.

### Rendimiento

- teclado decimal;
- `%` fijo visible;
- no usar slider.

Un porcentaje de rendimiento requiere precisión, no una interacción aproximada.

## 12. Tarjetas KPI

No saturar el Inicio con seis tarjetas iguales.

Jerarquía:

```text
18.420 kg
Entregados
```

junto a:

```text
21,4 %
Rendimiento medio
```

El valor domina; la explicación es secundaria.

## 13. Gráficos

V1 debe usar pocos gráficos, claramente interpretables.

Recomendados:
- línea de kilos acumulados por fecha;
- línea/barras de rendimiento por entrega;
- barras por finca/destino;
- comparación de campañas.

Reglas:
- siempre acompañar con cifras/texto;
- no usar 3D;
- no depender de color único para distinguir series;
- tooltip accesible o detalle equivalente;
- evitar donuts para demasiadas categorías.

## 14. Iconografía

Estilo:
- línea simple;
- 1.75–2 px aprox;
- esquinas suaves;
- consistente.

Conceptos prioritarios:
- inicio;
- parcela/mapa;
- campaña;
- almazara;
- entrega;
- kilos;
- rendimiento;
- tratamiento;
- abonado;
- poda;
- riego;
- recolección;
- documento;
- clima;
- aviso.

No usar emoji como iconografía final del producto; los wireframes pueden usarlos solo como marcador conceptual.

## 15. Fotografía

Cuando la marca necesite imágenes:
- olivares reales de Sierra Mágina;
- detalle de tronco/hoja/fruto;
- sierra y topografía;
- almazara real cuando haya permiso;
- luz natural;
- evitar saturación verde extrema.

Dentro de la app, la fotografía debe estar al servicio del dato:
- foto de parcela;
- ticket;
- evidencia/observación.

No decorar dashboards con grandes fotos que quiten espacio al trabajo.

## 16. Logo — dirección futura

No cerrar logo todavía.

Explorar una marca que pueda funcionar como icono PWA:
- `M` / montaña + hoja/olivo de forma abstracta;
- curva de Sierra Mágina + fruto;
- monograma limpio.

Evitar el cliché:
- círculo verde + rama de olivo detallada + tipografía manuscrita.

El icono debe leerse a 48 px.

## 17. Navegación inferior

5 destinos máximo:
- Inicio
- Campo
- Campaña
- Almazaras
- Más

Icono + label siempre visible.

No usar solo iconos ambiguos.

## 18. Botón flotante

No colocar un `+` flotante genérico en todas las pantallas si no está claro qué crea.

En Inicio puede abrir acciones rápidas.

En contexto de campaña, puede priorizar `Entrega`.

En parcela, puede abrir:
- Labor
- Observación
- Documento
- Tarea
- Entrega

## 19. Bottom sheets

Muy apropiados para móvil:
- seleccionar finca/parcela;
- acciones rápidas;
- filtros;
- añadir detalle opcional.

No usar un bottom sheet para formularios larguísimos que deberían ser pantalla completa.

## 20. Estados

Cada estado debe tener:
- texto;
- icono/forma cuando ayude;
- color como apoyo, no como único significado.

Ejemplos:
- `Pendiente de rendimiento`
- `Importado`
- `Necesita revisión`
- `Verificado`
- `Sin conexión`

## 21. Feedback

Después de una acción:
- mensaje claro;
- cifra/entidad principal;
- siguiente acción opcional;
- salida rápida.

Ejemplo:

```text
✓ Entrega guardada
1.842 kg · San Sebastián
Total campaña: 18.420 kg
```

## 22. Uso exterior

Diseñar pensando en:
- sol;
- guantes/manos sucias ocasionales;
- prisa en patio de almazara;
- mala cobertura;
- usuarios no tecnológicos.

Por eso:
- contraste alto;
- targets grandes;
- números grandes;
- formularios cortos;
- no esconder acciones críticas en gestos;
- mensajes offline explícitos.

## 23. Accesibilidad

Objetivo WCAG 2.2 AA.

Mínimos de proyecto:
- contraste AA;
- focus visible;
- labels reales;
- zoom/reflow;
- tamaños táctiles cómodos;
- no depender de dragging;
- status messages anunciables;
- autenticación accesible;
- errores comprensibles.

Referencia:
- https://www.w3.org/TR/WCAG22/

## 24. Dirección para primer prototipo

Primeras pantallas a llevar a alta fidelidad:
1. Inicio
2. Nueva entrega
3. Campaña
4. Parcela/timeline
5. Nueva labor
6. Ficha almazara

Si estas seis pantallas funcionan visualmente, se extiende el sistema al resto.

## 25. Qué debe sentirse al abrir Mágina Olivo

No:
> “Tengo que aprender un programa agrícola.”

Sí:
> “Aquí veo mi campaña y puedo apuntar lo que acabo de hacer.”
