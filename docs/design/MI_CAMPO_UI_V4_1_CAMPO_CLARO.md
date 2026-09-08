# Mágina Olivo — UI V4.1 «Campo Claro»

Fecha: 2026-09-08  
Estado: dirección visual obligatoria para `Mi Campo V4` post-staging  
Documento funcional padre: `docs/design/MI_CAMPO_UX_V4.md`  
Sistema base: `docs/DESIGN_SYSTEM_V1.md`

> V4.1 no cambia la arquitectura funcional de Mi Campo V4. La afina visualmente para que la aplicación sea más clara, consistente, usable en exterior y fácil de extender.

---

## 1. Idea central

Mágina Olivo debe sentirse como:

> **Un cuaderno de campo moderno, claro y útil, no como una revista agrícola ni como un ERP.**

La dirección «Campo Claro» conserva:

- naturaleza;
- identidad local;
- calidez;
- fotografía real de Sierra Mágina;
- verde Mágina;
- fondo piedra;
- sensación premium pero discreta.

Y reduce:

- decoración vegetal repetida;
- cabeceras fotográficas innecesarias;
- cajas dentro de cajas;
- sombras decorativas;
- exceso de serif;
- variaciones de navegación entre pantallas;
- iconografía inconsistente.

---

## 2. Tres familias visuales de pantalla

Toda pantalla de Mi Campo debe pertenecer a una de estas familias. Codex no debe improvisar un cuarto patrón sin justificarlo.

### A. Identidad / territorio

Para:

- Finca;
- Parcela.

Características:

- foto real como elemento de identidad;
- nombre de finca/parcela protagonista;
- ubicación y datos clave;
- acceso claro a mapa;
- resumen operativo debajo.

La fotografía aquí sí tiene valor: ayuda al usuario a reconocer el lugar.

### B. Gestión / trabajo

Para:

- Tareas;
- Riegos;
- Tratamientos;
- Jornales;
- Maquinaria;
- Cuaderno;
- Documentos;
- formularios de registro.

Características:

- cabecera compacta;
- contexto actual visible;
- resumen;
- una acción primaria;
- últimos registros;
- historial/filtros.

No repetir grandes fotos decorativas en cada módulo.

### C. Territorio / GIS

Para:

- Mapa y lindes;
- vincular Catastro;
- seleccionar parcela;
- comparar/consultar SIGPAC cuando proceda.

Características:

- mapa como protagonista;
- controles flotantes mínimos;
- bottom sheet de selección/detalle;
- capas secundarias;
- lista accesible equivalente.

---

## 3. Jerarquía tipográfica

### Serif

La serif de marca se reserva para:

- nombre de finca;
- nombre de parcela;
- títulos editoriales de máximo una línea;
- títulos de identidad puntuales.

No usar serif en:

- formularios;
- labels;
- filtros;
- botones;
- tablas/listas;
- estados;
- navegación inferior;
- texto secundario;
- datos técnicos.

### UI

Usar `Inter` / system stack del `DESIGN_SYSTEM_V1.md` para todo el trabajo operativo.

Regla:

```text
Identidad = puede usar serif
Operación = siempre sans-serif
```

### Escala objetivo móvil

```text
H1 identidad        30–34 px / semibold
H1 gestión          28 px / semibold
H2                  21–22 px / semibold
H3                  18 px / semibold
Body                16 px
Body small          14 px
Caption             12–13 px
Button              16 px / semibold
KPI principal       28–34 px / semibold
```

No reducir texto importante para hacer caber más contenido.

---

## 4. Color semántico único

Mantener los tokens base:

```text
Verde Mágina       #203D2A
Piedra             #F6F3E8
Tinta              #1A221C
Verde hoja         #4E6A55
Dorado aceite      #B8892D
Rojo tierra        #9A3D2F
Blanco             #FFFFFF
Verde pálido       #DDE6DD
```

Añadir semántica estricta:

```text
verde  = acción principal / normal / verificado / activo
azul   = agua / mapa / información espacial
amarillo-dorado = atención / campaña / pendiente no crítico
rojo tierra = error / crítico / bloqueo real
gris   = inactivo / histórico / secundario
```

No usar colores solo por estética.

Estados deben llevar icono + texto, nunca solo color.

---

## 5. Fotografía

### Sí usar foto grande

- resumen de finca;
- resumen de parcela;
- onboarding local cuando aporte identidad.

### No usar foto grande

- Tareas;
- Riegos;
- Tratamientos;
- Jornales;
- Maquinaria;
- formularios;
- listas de históricos;
- administración.

En módulos de gestión, usar como máximo una miniatura contextual cuando sea útil.

### Foto de finca/parcela

- ratio recomendado 16:9 o 3:2;
- `object-fit: cover`;
- overlay solo si hace falta para contraste;
- nunca colocar texto pequeño encima de zonas visualmente complejas;
- permitir cambiar/eliminar cover con acción secundaria.

---

## 6. Tarjetas y superficies

V4.1 reduce el aspecto de «tarjeta sobre tarjeta».

Regla:

- fondo app Piedra;
- tarjeta blanca cuando agrupa una unidad real;
- borde sutil;
- sombra mínima o ninguna;
- usar espacio antes que elevación.

### Radios

```text
Input/button:      12 px
Card:              16 px
Bottom sheet:      24 px superior
Chip:              pill solo cuando sea tag/estado
```

### Evitar

- cards anidadas tres niveles;
- sombras grandes;
- borde + sombra + fondo coloreado a la vez;
- todas las acciones en forma de píldora.

---

## 7. Un solo CTA primario por pantalla

Cada pantalla debe tener **una acción visual primaria**.

Ejemplos:

```text
Tareas       -> Nueva tarea
Riegos       -> Registrar riego
Jornales     -> Añadir jornal
Tratamientos -> Registrar tratamiento
Parcela      -> Registrar
Finca        -> Registrar trabajo
Catastro     -> Confirmar parcela
```

Acciones secundarias deben ser outline/terciarias.

No colocar dos botones verdes con el mismo peso visual salvo confirmación explícita del diseño.

---

## 8. Contexto permanente

Toda acción de trabajo debe saber dónde se está ejecutando.

Formato visual recomendado:

```text
Contexto
Cortijo del Río · Parcela Norte
[Cambiar]
```

Si el usuario entra desde una parcela, contexto preseleccionado.

Si entra desde una finca, permitir:

- toda la finca;
- una parcela;
- varias parcelas cuando el tipo lo admita.

Si entra desde Inicio o desde el Centro `+`, pedir contexto solo cuando no se conoce.

No preguntar otra vez lo que la navegación ya sabe.

---

## 9. Patrón universal de módulos de gestión

Tareas, Riegos, Tratamientos y Jornales deben usar el mismo esqueleto:

```text
Cabecera compacta
Título + subtítulo

Contexto / filtros

Resumen rápido

[ CTA PRIMARIO ]

Bloque relevante / pendiente

Últimos registros

[Ver historial]
```

La familiaridad es una función de producto: aprender un módulo debe enseñar los demás.

---

## 10. Barra inferior — contrato único

En todo el área privada:

```text
[ Inicio ] [ Mi Campo ] [ + ] [ Campaña ] [ Más ]
```

No alternar con:

- Descubre;
- Perfil;
- Mágina;
- Cooperativas;
- otros destinos de prototipos anteriores.

Esos contenidos viven donde corresponda según la arquitectura V4, pero la barra privada debe ser estable.

### `+`

- círculo Verde Mágina;
- accesible con una mano;
- label accesible `Añadir`;
- abre `Centro de acciones`;
- no representa una acción específica.

---

## 11. Centro de acciones — lenguaje visual

El Centro `+` es una pantalla/capa de productividad.

No necesita foto de fondo ni ornamentación.

Cabecera:

```text
¿Qué quieres añadir?
Añade algo a tu campo.
```

Primera versión:

```text
Trabajo
Tarea
Riego
Tratamiento
Jornal
Maquinaria
Entrega
Observación
Documento
Finca/parcela
```

Reglas:

- icono consistente;
- label corto;
- descripción de una línea como máximo;
- orden configurable por producto, no por usuario todavía;
- mantener máximo 10 acciones de primer nivel;
- nuevas funciones futuras pueden añadirse sin modificar la navegación inferior.

---

## 12. Iconografía

Usar una sola familia de iconos lineales.

Objetivo aproximado:

```text
stroke: 1.75–2 px
cap/join suaves
24 px estándar
28–32 px en tiles de acción
```

No mezclar:

- emoji;
- iconos filled;
- line art irregular;
- pictogramas 3D;
- iconos de diferentes bibliotecas sin normalización.

Definir wrappers reutilizables:

```text
AppIcon
ActionTileIcon
StatusIcon
NavIcon
```

---

## 13. Diseño para exterior

Requisitos de campo:

- contraste alto;
- targets 48 px mínimo, preferencia 52–56 px en acciones frecuentes;
- no esconder acciones importantes en swipe/long-press;
- evitar textos secundarios excesivamente claros;
- mantener datos esenciales visibles con brillo alto y sol;
- no depender de hover;
- feedback inmediato;
- mensajes offline explícitos.

---

## 14. Estados y feedback

Estados compactos:

```text
✓ Catastro vinculado
● Activa
! Revisar
Sin avisos
Offline
Sincronizando
Pendiente
```

Tras guardar:

```text
✓ Riego guardado
Parcela Norte · Sector 5
[Ver registro]
```

No usar toast genérico `Guardado correctamente` cuando se puede confirmar entidad y contexto.

---

## 15. Densidad y scroll

Mi Campo no debe convertirse otra vez en una página interminable.

Regla de contenido visible:

- resumen;
- máximo 3–5 registros recientes;
- botón `Ver todos`;
- detalles completos en pantalla propia.

No insertar formularios completos dentro del dashboard.

---

## 16. Mapa

En pantallas GIS:

- mapa ocupa la mayor parte de la altura útil;
- controles laterales agrupados;
- búsqueda arriba;
- selección abajo mediante bottom sheet;
- evitar paneles técnicos simultáneos Catastro + SIGPAC + comparación + formulario.

Capas visibles:

```text
Base / ortofoto
Mis parcelas
Catastro
SIGPAC
```

pero solo bajo acción explícita.

---

## 17. Motion

Animación discreta y funcional.

Permitido:

- 150–220 ms para sheet/modal;
- selected state;
- expansión de finca;
- feedback de guardado;
- mapa/polígono seleccionado.

Evitar:

- entradas largas;
- parallax;
- rebotes decorativos;
- animaciones que retrasen registro.

Respetar `prefers-reduced-motion`.

---

## 18. Responsive

Mobile-first.

### 320–480 px

Diseño principal.

### Tablet

- mantener jerarquía;
- permitir split view mapa/lista cuando haya espacio;
- no estirar tarjetas a anchuras ilegibles.

### Desktop

- máximo de contenido operativo centrado;
- layouts de 2 columnas solo si reducen navegación;
- no convertir la aplicación en un dashboard empresarial denso.

---

## 19. Accesibilidad

WCAG 2.2 AA obligatoria.

Especialmente:

- foco visible;
- labels reales;
- iconos con nombre accesible;
- reflow a 320 px;
- zoom;
- color no exclusivo;
- target grande;
- lista equivalente a mapa;
- estados anunciables;
- navegación atrás consistente.

---

## 20. Orden visual de prioridad

Cuando una pantalla tenga demasiada información, priorizar así:

```text
1. Contexto
2. Estado / resumen
3. Acción primaria
4. Pendiente / relevante
5. Últimos registros
6. Datos secundarios
7. Configuración
```

Configuración nunca debe competir visualmente con el trabajo diario.

---

## 21. Qué NO debe hacer Codex

- no copiar literalmente todas las imágenes conceptuales;
- no introducir serif en formularios por imitar un mockup;
- no repetir hero fotográfico en módulos de gestión;
- no añadir hojas decorativas a cada card;
- no crear navegación distinta por módulo;
- no duplicar formularios para `+` y para cada módulo;
- no crear nuevos colores sin token;
- no usar emojis como iconos finales;
- no meter un megaformulario debajo de Mi Campo;
- no sacrificar accesibilidad por parecerse a una imagen.

Las imágenes son **referencia de composición y jerarquía**, no especificación pixel-perfect.

---

## 22. Definición de éxito visual

Una persona nueva debe percibir:

```text
Aquí está mi finca.
Aquí está mi parcela.
Aquí veo qué pasa.
Aquí añado lo que hago.
```

No debe percibir:

```text
¿En cuál de estas veinte tarjetas tengo que entrar?
```

La frase de control V4.1 es:

> **Más campo. Menos interfaz.**
