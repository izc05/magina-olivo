# Sistema visual limpio V1 — Mágina Olivo

Fecha: 2026-09-09  
Estado: **dirección visual para `feat/interface-redesign-clean-v1`; se aplica después de aprobar la primera pantalla de referencia**

## 1. Decisión visual

La interfaz pasa de un fondo piedra dominante a una base **blanca, nítida y de alto contraste**. La sensación de campo no vendrá de teñir toda la aplicación de verde: vendrá de la información, las fotografías/evidencias pertinentes, el lenguaje y unos acentos controlados.

La intensidad se consigue con tinta oscura, jerarquía tipográfica y espacio; no con sombras, gradientes o iconos de colores compitiendo entre sí.

```text
Blanco para leer
Tinta para decidir
Verde para actuar
Color puntual para clasificar
```

## 2. Paleta de base

| Token | Valor | Uso |
| --- | --- | --- |
| `color.bg.canvas` | `#FFFFFF` | fondo de toda la aplicación |
| `color.bg.surface` | `#FFFFFF` | tarjetas, formularios y hojas; se separan con borde, no con otro fondo |
| `color.bg.subtle` | `#F5F7F3` | bloques secundarios, selección suave, área de icono |
| `color.border.default` | `#DDE3DB` | límites de fichas, inputs y divisores |
| `color.border.strong` | `#B8C4B7` | foco, selección y límites de mapa |
| `color.text.strong` | `#17211A` | títulos, cifras y acciones de lectura principal |
| `color.text.default` | `#2E3A32` | cuerpo de texto |
| `color.text.muted` | `#637066` | fecha, contexto y ayuda secundaria |
| `color.brand` | `#254B35` | acción primaria, navegación activa y enlaces importantes |
| `color.brand.hover` | `#193A27` | presión/foco de acción primaria |
| `color.accent.harvest` | `#A96F18` | recolección, rendimiento y énfasis positivo no crítico |
| `color.status.success` | `#2F6B48` | guardado/sincronizado, siempre con texto |
| `color.status.warning` | `#946312` | revisión o pendiente |
| `color.status.danger` | `#9A3D2F` | error, pérdida o acción destructiva |
| `color.status.info` | `#2E6680` | información de mapa/fuente |

El lienzo es blanco incluso en escritorio. Los tonos suaves se reservan a una región pequeña: una pastilla de icono, una fila seleccionada o un aviso. No se colocan tarjetas blancas sobre un gran fondo marfil porque se pierde contraste estructural.

## 3. Reglas de contraste e intensidad

1. Cifras, títulos y CTA usan `text.strong`; no se diluyen con gris.
2. El texto secundario sigue siendo legible a plena luz: nunca más claro que `text.muted`.
3. El verde de marca solo se usa en elementos interactivos, navegación activa y estados de éxito; no para párrafos enteros.
4. El dorado no lleva texto blanco pequeño. Se usa como icono, borde, punto de gráfico o fondo muy suave con texto oscuro.
5. Una pantalla normal usa blanco + tinta + verde. Los demás colores aparecen solo cuando el tipo de dato lo justifica.
6. Cada color de estado se acompaña de palabra y/o icono: `Pendiente`, `Sincronizado`, `Revisar`, `Error`.

## 4. Tipografía

### Principio

La intensidad tipográfica debe orientar la mirada en este orden: **qué pantalla es -> qué cifra importa -> qué ha ocurrido -> qué puede hacer ahora**.

| Nivel | Uso | Tamaño móvil / peso |
| --- | --- | --- |
| Display | un KPI o nombre de entidad destacado | 32–36 px / 700 |
| H1 | título de pantalla | 28–32 px / 700 |
| H2 | título de bloque o ficha importante | 20–22 px / 700 |
| H3 | título de ficha/lista | 16–18 px / 650–700 |
| Body | explicación y valor contextual | 15–16 px / 400–500 |
| Meta | fecha, origen, ayuda | 13–14 px / 500 |
| Label | etiqueta de input, chip o navegación | 12–13 px / 650, con tracking moderado |

- **UI y datos:** Inter/system stack con cifras tabulares.
- **Titulares editoriales:** la familia editorial existente solo en H1 o nombre de finca/parcela cuando mejore la identidad; nunca en inputs, tablas, cifras ni textos largos.
- Ningún dato operativo importante baja a 12 px.
- La diferencia entre título, dato y contexto se logra por peso, tamaño y color; no por mayúsculas continuas.

## 5. Escala de información

Cada pantalla sigue cuatro niveles, siempre en el mismo orden:

```text
1. Identidad     dónde estoy: finca, parcela o campaña
2. Señal         qué importa ahora: KPI, alerta o última actividad
3. Contenido     fichas ordenadas, filtros o segmentos
4. Acción        una acción principal y alternativas discretas
```

Reglas:

- máximo tres métricas al abrir una ficha;
- máximo una acción primaria por pantalla;
- las acciones que crean datos viven en `Registrar`, no se repiten como botones dentro de cada bloque;
- el resumen muestra tendencias y última actividad, no listas enteras;
- el detalle conserva la evidencia, el origen y la edición permitida;
- los segmentos reducen densidad: no apilar mapa, timeline, formulario y documentos en una sola página.

## 6. Sistema de fichas

### Anatomía común

```text
[icono o evidencia]  título / valor principal        [navegar]
                     contexto: finca · parcela · fecha
                     detalle opcional: unidad, ticket, coste, estado
```

- fondo blanco;
- borde fino `border.default`;
- radio de 16 px;
- padding de 16 px; 20 px cuando la ficha sea principal;
- sombra casi imperceptible o ninguna; el borde y el espacio hacen el trabajo;
- valor numérico alineado y con unidad siempre visible;
- `>` solo si toda la ficha abre algo; si hay un botón dentro, se elimina la falsa affordance.

### Jerarquía por tipo

| Ficha | Dato dominante | Contexto obligatorio |
| --- | --- | --- |
| Finca | nombre + superficie/parcelas | última actividad cuando exista |
| Parcela | nombre + superficie | olivos y riego cuando existan |
| Actividad | tipo + valor principal si existe | destino y fecha |
| Entrega | kilos | destino, fecha y ticket/rendimiento si existen |
| Tarea | título y estado | destino y vencimiento |
| Documento | nombre y tipo | entidad vinculada y fecha |
| Fuente | fuente + estado | identificador y fecha/procedencia |

Una ficha no contiene más de tres líneas de información antes de abrir el detalle. Si el dato requiere explicación, se lleva al detalle, no se reduce la letra.

## 7. Iconos

### Regla de significado

Los iconos son señales estables, nunca decoración intercambiable. Se usa una sola familia de líneas (la biblioteca existente) y un icono siempre se acompaña de texto cuando representa una acción o estado importante.

| Dominio | Icono semántico | Acento visual |
| --- | --- | --- |
| Finca/explotación | tractor o terreno | neutro/verde suave |
| Parcela/olivar | brote o árbol | verde suave |
| Trabajo/cuaderno | libreta/herramienta | neutro |
| Tratamiento | matraz | verde, no rojo |
| Riego | gota | azul informativo |
| Recolección/entrega | aceituna o caja | dorado controlado |
| Rendimiento | tendencia ascendente | dorado controlado |
| Tarea | calendario | azul informativo |
| Documento | archivo | neutro |
| Foto/evidencia | cámara | neutro |
| Fuente/mapa | mapa o marcador | azul informativo |
| Alerta | triángulo | amarillo/rojo según severidad |

Tamaños: 20 px dentro de texto o controles; 24 px en navegación y encabezados; 40–44 px solo en el área de icono de una ficha. No se introducen emojis, ilustraciones de CSS ni iconos diferentes para el mismo concepto.

## 8. Navegación y acción

- La barra inferior mantiene etiqueta bajo cada icono.
- El destino activo usa tinta/verde y marcador visible, no únicamente variación de color.
- `Registrar` / `+` es la única entrada de datos y de nueva parcela. `Nueva finca` es la única excepción y vive en la raíz de Mi Campo.
- Dentro de una finca, cada icono abre una subpantalla de la mini app; el `+` toma el contexto del icono abierto y propone la acción correspondiente.
- Cada grupo explica en una frase qué crea; no se mezclan crear finca/parcela con acciones de diario sin distinguirlo.
- Al seleccionar una acción, el formulario hereda y muestra el contexto. Cambiarlo debe ser deliberado.
- La acción destructiva nunca comparte estilo ni posición con `Guardar`.

## 9. Escalabilidad del diseño

La app puede crecer sin añadir ruido si cada nuevo módulo declara estas piezas antes de tener UI:

1. entidad canónica y propietario del dato;
2. contexto donde se crea;
3. `Card` reutilizable y su variante compacta;
4. valor principal, contexto y estado;
5. lugares donde aparece por filtro/agregación;
6. formulario mínimo y detalles progresivos;
7. vacíos, permisos, offline y error;
8. icono semántico y token de estado.

No se crea una nueva paleta, tipo de tarjeta ni ruta raíz para una variación pequeña. Se extiende el componente y el contrato existente. Gasto e incidencia, por ejemplo, no entran hasta que el modelo de datos y estas ocho decisiones estén cerradas.

## 10. Primeras pantallas de referencia

Antes de escribir componentes definitivos se diseñarán y revisarán, en este orden:

1. Mi Campo — lista de fincas con fondo blanco y estado vacío.
2. Mini app de finca — resumen y lista de parcelas.
3. Subpantallas Trabajos, Tareas y Campaña filtradas dentro de la finca.
4. Selector `Registrar` con contexto agrícola y formulario superficial.
5. Formulario de trabajo.

Una vez aprobadas, esas cinco superficies fijan tokens, espaciado, iconos, tipos y fichas para el resto de la aplicación.
