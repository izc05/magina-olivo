# Mi Campo — Arquitectura funcional y de interfaz V1

Fecha: 2026-09-09  
Estado: **especificación previa a implementación para `feat/interface-redesign-clean-v1`**

## 1. Misión

Mi Campo permite al olivarero responder, desde el móvil y sin navegar por formularios interminables:

1. ¿Qué fincas y parcelas gestiono?
2. ¿Qué ha ocurrido en una parcela concreta?
3. ¿Qué debo registrar ahora?
4. ¿Cómo se refleja ese hecho en mi finca y mi campaña?

No es un panel genérico de agricultura ni una copia visual de un ERP. Es el cuaderno territorial del olivarero.

## 2. Modelo mental y capas de Mi Campo

```text
Explotación
  └─ Finca                         mini app operativa
      ├─ Resumen                   visión de la finca
      ├─ Parcelas                  listado, selección y datos agrícolas
      ├─ Trabajos / Riegos / Tratamientos / Tareas
      │                             registros filtrados por finca/parcela
      ├─ Campaña                   registros productivos de esa finca
      ├─ Mapa / Documentos / Datos contexto, evidencia y fuentes
      └─ Parcela                   ámbito opcional, nunca una mini app paralela
```

| Capa | Qué contiene | Qué nunca debe hacer |
| --- | --- | --- |
| Explotación | selector y límites de autorización | mezclar datos de dos propietarios |
| Finca | mini app, parcelas, actividad agregada y resumen | copiar registros de sus parcelas |
| Parcela | ámbito agrícola, filtro y datos propios dentro de la finca | comportarse como una segunda app o exigirla en toda entrega |
| Registro | actividad, entrega, rendimiento, tarea o documento | duplicarse al aparecer en una agregación |
| Evidencia/fuente | ticket, foto, Catastro, SIGPAC, perímetro | afirmar propiedad o inventar verificación |
| Insight | métricas y alertas deterministas | reemplazar el registro fuente |

## 3. Mapa de pantallas

```text
Mi Campo
├─ Mis fincas
│  ├─ Crear primera finca / Nueva finca  [única alta directa]
│  └─ Mini app de finca
│     ├─ Resumen
│     ├─ Parcelas
│     ├─ Trabajos
│     ├─ Riegos
│     ├─ Tratamientos
│     ├─ Tareas
│     ├─ Campaña
│     ├─ Mapa
│     ├─ Documentos
│     └─ Datos
└─ Registro rápido (+)
   └─ abre una subpantalla superficial y vuelve al módulo que lo originó
```

Los formularios no son nodos principales del árbol. Se abren mediante `+` desde una subpantalla de la finca y, al guardar, devuelven al mismo módulo con la ficha nueva visible.

## 4. Pantalla raíz: Mis fincas

### Objetivo

Elegir una finca o crear la primera sin mezclar información de parcela, mapa, tareas y formularios en una sola pantalla.

### Composición

1. cabecera: `Mi Campo`, explotación activa y selector si aplica;
2. resumen compacto: número de fincas, parcelas y superficie declarada/agregada;
3. lista de `FarmCard`;
4. acción de alta visible;
5. estados de carga, vacío y sin conexión.

### `FarmCard`

Contenido mínimo:

- imagen solo si hay evidencia apropiada; nunca como decoración obligatoria;
- nombre;
- superficie (declarada o agregada, etiquetada correctamente);
- número de parcelas;
- última actividad cuando exista;
- acceso a la ficha de finca.

No muestra todos los KPIs de campaña ni un formulario incrustado.

### Estado vacío

`Aún no has añadido ninguna finca.`  
Explica que podrá añadir parcelas, localizar en el mapa y guardar actividades después. Ofrece una acción primaria: `Crear mi primera finca`.

## 5. Alta de finca

### Decisión de flujo

La finca es un contenedor de gestión. El flujo principal de alta propone primero relacionar o crear parcelas desde el mapa; la creación manual sigue disponible y no bloquea el uso inicial.

```text
Nueva finca
  -> elegir método
     -> buscar parcelas en mapa / Catastro / SIGPAC / ubicación
     -> crear manualmente
  -> completar datos mínimos
  -> crear finca
  -> asignar o continuar con parcelas
```

### Datos

| Campo | V1 | Regla |
| --- | --- | --- |
| Nombre | obligatorio | nombre de trabajo del agricultor |
| Municipio | opcional | ayuda de localización, no sustituye coordenadas |
| Descripción/notas | opcional | contexto libre breve |
| Foto | evolución | se guarda como evidencia privada, no como URL decorativa |
| Superficie manual | opcional | no sobrescribe la suma ni una fuente oficial; se etiqueta como declarada |

La superficie derivada de parcelas o perímetro se muestra con su procedencia. Una finca sin parcela es válida durante la configuración inicial.

## 6. Ficha de finca

### Objetivo

Ver una finca completa sin crear otro sistema distinto al de parcela. La finca filtra y agrega los mismos componentes de sus parcelas.

### Estructura

1. identidad: nombre, municipio/localización disponible y foto/evidencia opcional;
2. tres métricas de contexto: superficie, parcelas y campaña activa;
3. lanzador `+` y selector de contexto de parcela cuando haga falta; no hay botones dispersos de alta;
4. iconos/subpantallas de trabajo: `Resumen`, `Parcelas`, `Trabajos`, `Riegos`, `Tratamientos`, `Tareas`, `Campaña`, `Mapa`, `Documentos`, `Datos`;
5. contenido de un solo módulo por vez, manteniendo siempre visible el nombre de la finca y el retorno a `Resumen`.

### Segmentos

| Segmento | Contenido | Fuente |
| --- | --- | --- |
| Resumen | última actividad, alertas, métricas y accesos | agregados/consultas reales |
| Parcelas | `PlotCard`, selección de parcela y datos agrícolas | parcelas de la finca |
| Trabajos | `ActivityCard` y filtros por tipo/parcela | actividades de finca y parcelas |
| Riegos | `ActivityCard` filtrada a `irrigation` | riegos de finca y parcelas |
| Tratamientos | `ActivityCard` filtrada a `treatment` | tratamientos de finca y parcelas |
| Tareas | `TaskCard` por estado y parcela opcional | tareas de la finca y parcelas |
| Campaña | recolecciones, entregas, rendimientos y documentos | registros de la campaña filtrados por finca |
| Mapa | parcelas localizadas y fuentes | coordenadas/geometría autorizadas |
| Documentos | `DocumentCard` y evidencia relacionada | documentos enlazados a la finca, sus parcelas o campaña |
| Datos | descripción, notas y fuentes generales | finca + fuentes enlazadas |

Un registro creado para una parcela aparece en el módulo de finca con el nombre de la parcela. Un registro creado para toda la finca lo indica expresamente: `Toda la finca`.

## 7. Parcelas: listado, filtro y datos dentro de la finca

Parcelas no abre una jerarquía nueva de pantallas. Su icono abre una subpantalla de la mini app que permite ver, localizar y elegir las parcelas de la finca.

Al tocar una parcela, el usuario puede:

1. consultar sus datos agrícolas y fuentes;
2. establecerla como filtro activo para `Trabajos`, `Tareas`, `Campaña`, `Mapa` y `Documentos`;
3. abrir `+` con finca y parcela ya preseleccionadas.

El filtro siempre se muestra como un chip claro, por ejemplo `Estacas ×`, y se puede volver a `Todas las parcelas`. No se crea una barra de navegación independiente para cada parcela.

### Datos del olivar y fuentes

### Datos editables del agricultor

| Dato | Estado V1 |
| --- | --- |
| nombre de parcela | real |
| superficie declarada | real |
| número de olivos | real |
| riego: secano, regadío, mixto, sin definir | real |
| notas | real |
| variedad o variedades | modelo preparado; exponer solo con contrato de escritura completo |
| sistema de cultivo, marco, año de plantación, pendiente | evolución, no simular |

### Fuentes oficiales y mapa

Catastro, SIGPAC y perímetro no se editan como texto libre. La interfaz muestra para cada fuente:

- estado: vinculada, disponible, pendiente o error temporal;
- identificador legible cuando exista;
- fecha/procedencia;
- acción: `Abrir mapa`, `Vincular` o `Revisar` según permiso y soporte real.

Nunca se afirma que una referencia catastral pruebe propiedad. El usuario declara que gestiona la parcela; el servidor verifica la fuente antes de convertirla en dato privado cuando el flujo map-first esté disponible.

## 8. Registro rápido y subpantallas superficiales

### Regla de creación

| Lugar actual | Qué muestra | Acción inicial del `+` |
| --- | --- | --- |
| Mi Campo | fincas | elegir finca o continuar con contexto pendiente; `Nueva finca` permanece fuera del `+` |
| Finca · Resumen | lectura general | selector completo de registros |
| Finca · Parcelas | lista y filtro | `Nueva parcela` o registro con parcela elegida |
| Finca · Trabajos | actividades filtradas | `Trabajo` |
| Finca · Riegos | riegos filtrados | `Riego` |
| Finca · Tratamientos | tratamientos filtrados | `Tratamiento` |
| Finca · Tareas | tareas filtradas | `Tarea` |
| Finca · Campaña | registros productivos de la finca | `Entrega` |
| Finca · Documentos | evidencia filtrada | `Documento` / `Foto` |

El `+` **solo crea**: nunca abre una vista de consulta ni navega a datos. El primer toque abre una selección breve; el segundo abre una **subpantalla superficial** de formulario. La subpantalla tiene contexto, campos mínimos, guardar y volver. Tras guardar, devuelve al módulo de origen y coloca la ficha recién creada al principio o la resalta. No deja el formulario abierto junto a las listas. Los iconos de módulo son los que abren datos; las acciones `Editar` solo modifican un dato existente y no se esconden dentro de `+`.

### 8.1 Contrato común de formulario

Todo alta debe definir:

1. contexto elegido: explotación, finca, parcela y campaña si aplica;
2. campos mínimos y opcionales;
3. validación local y servidor;
4. comportamiento offline;
5. ficha resultante;
6. vistas que la reciben por filtro/agregación;
7. edición, archivo y trazabilidad.

Al guardar se muestra confirmación concreta (`Riego guardado en Estacas`) y el usuario puede volver al contexto, añadir otro o abrir la ficha del registro cuando exista detalle.

### 8.2 Matriz de registros

| Registro | Entidad V1 | Mínimo | Datos progresivos | Ficha | Aparece en |
| --- | --- | --- | --- | --- | --- |
| Trabajo | actividad | tipo, fecha, destino | superficie, coste, notas, evidencia | `ActivityCard` | parcela, finca, Inicio |
| Tratamiento | actividad `treatment` | producto, fecha, destino | nº registro, cantidad/unidad, área, motivo*, coste, evidencia | `ActivityCard` | parcela, finca, cuaderno |
| Riego | actividad `irrigation` | fecha, destino | agua/cantidad, unidad, área, coste; duración* | `ActivityCard` | parcela, finca, cuaderno |
| Recolección | actividad `harvest` | fecha, destino | kg recogidos, área, jornada*, coste, notas | `ActivityCard` | parcela, finca, cosecha |
| Entrega | entrega | kg, fecha, destino/cooperativa | finca/parcela opcional, ticket, variedad, evidencia, notas | `DeliveryCard` | campaña, parcela/finca cuando esté asignada |
| Rendimiento | resultado de entrega | porcentaje | fecha, evidencia, notas | variante de `DeliveryCard` | entrega, campaña y agregados |
| Tarea | tarea | título, fecha, destino opcional | prioridad, recordatorio, notas | `TaskCard` | Inicio, parcela/finca, agenda |
| Documento/foto | documento + enlace | archivo, tipo, contexto | fecha, notas, origen | `DocumentCard`/`EvidenceCard` | detalle y biblioteca |
| Gasto independiente | **evolución** | no crear UI todavía | requiere entidad y agregación aprobadas | futura `ExpenseCard` | parcela/finca/campaña |
| Incidencia | **evolución** | no crear UI todavía | requiere ciclo de resolución y tarea vinculada | futura `IncidentCard` | parcela/finca/Inicio |

`*` significa que el campo está diseñado pero no se presenta hasta que exista contrato de datos y validación de servidor. En particular, recolección **no es** entrega: la primera registra trabajo/cosecha; la segunda registra una carga entregada a una almazara.

### 8.3 Formularios específicos

#### Trabajo

`Tipo`, `fecha`, `destino` y nota corta son el mínimo. Los tipos deben usar el catálogo canónico: poda, abonado, desbroce, laboreo, riego, recolección, mantenimiento, plantación/reposición, muestreo, observación y otro. Producto, cantidad, coste y evidencia son detalles opcionales.

#### Tratamiento

El formulario específico evita que un tratamiento parezca una nota libre. Pide producto, fecha y destino; ofrece número de registro, cantidad/unidad, superficie y coste. Motivo, aplicador, condiciones y equipo quedan fuera hasta tener campos validados.

#### Riego

Mínimo: fecha y destino. Si se conoce, cantidad de agua y unidad. La duración solo se añade cuando exista `durationMinutes` canónico; no se codifica dentro de notas si luego se espera analizarla.

#### Recolección

Mínimo: fecha y parcela/finca. Los kilos son de trabajo recolectado, nunca se suman como kilos oficialmente entregados de campaña. Una entrega posterior puede estar vinculada a la misma parcela, pero no se deduce automáticamente una correspondencia.

#### Entrega y rendimiento

Una entrega normal se completa en menos de 30 segundos: kilos destacados, destino recordable, fecha/hora y ticket opcional. Finca y parcela son opcionales porque una carga puede mezclar origen. El rendimiento se añade desde la entrega y conserva su propio origen y fecha.

#### Documento/foto

Documento y foto comparten evidencia privada: tipo, archivo, fecha, notas y enlaces con entidad. El archivo original se conserva de forma privada; una foto no se convierte en una actividad automáticamente.

## 9. Timeline, filtros y agregación

La timeline de parcela ordena por fecha descendente y usa icono, título, contexto, valor principal y detalle secundario.

```text
icono + tipo              valor principal
parcela/finca + fecha     detalle o evidencia
```

Cada subpantalla trae su propio filtro simple: Trabajos filtra tipos de actividad; Riegos y Tratamientos aplican un tipo fijo y solo ofrecen filtros secundarios; Tareas filtra estado; Campaña filtra recolecciones, entregas, rendimientos y documentos. En cualquier módulo, la parcela activa limita los resultados si existe. Los filtros no cambian ni copian datos; cambian la consulta o la presentación.

| Vista | Regla de agregación |
| --- | --- |
| Finca · todas las parcelas | registros de su `farm_id` y de sus parcelas, con etiqueta de origen |
| Finca · parcela filtrada | solo registros con el `plot_id` elegido dentro de esa finca |
| Finca · Campaña | entregas/resultados y actividades con `campaign_id`, filtrados por finca y parcela si aplica; nunca inferir una campaña sin regla explícita |
| Mi Campo | actividad reciente de las fincas permitidas; sin convertirla en historial completo |

Los kilos de campaña y el rendimiento ponderado proceden de los cálculos canónicos. Recolecciones y entregas se muestran como conceptos distintos para evitar doble conteo.

## 10. Estados y excepciones de Mi Campo

| Situación | Respuesta de interfaz |
| --- | --- |
| Sin fincas | explicación + crear primera finca |
| Finca sin parcelas | explicar siguiente paso + añadir/localizar parcela |
| Parcela sin ubicación | `Ubicación pendiente` + abrir mapa; no bloquear cuaderno |
| Sin campaña activa | permitir actividad; explicar que entrega requiere campaña |
| Entrega sin parcela | válida, marcada `Sin asignar` en desgloses |
| Rendimiento pendiente | estado explícito desde la entrega; acción `Añadir rendimiento` |
| Offline | permitir solo acciones soportadas por outbox y decir que quedan pendientes |
| Error de fuente cartográfica | conservar datos privados y ofrecer reintento; no borrar vínculo |
| Sin permiso | explicación y retorno seguro; nunca una ficha parcialmente editable |

## 11. Accesibilidad y uso exterior

- Etiqueta de texto e icono en cada acción; no solo color.
- Objetivos táctiles mínimos de 44 px y espaciado que evite pulsaciones accidentales.
- Orden de foco: contexto -> contenido -> acción principal -> navegación.
- Formularios con etiqueta persistente, ayuda de formato y error junto al campo.
- Métricas con unidades explícitas: `kg`, `%`, `ha`, `m³`, `€`.
- Contraste válido sobre fondo piedra, superficies blancas y luz intensa; ningún dato relevante sobre fotografía sin capa legible.
- Los cambios de contexto de finca/parcela se anuncian y no borran un formulario sin aviso.

## 12. Definición de preparado antes de código

Una pantalla de Mi Campo solo pasa a implementación cuando tiene:

- objetivo y pregunta principal;
- ruta y contexto de entrada/salida;
- datos canónicos que lee y escribe;
- fichas reutilizadas;
- estado con datos, vacío, carga, error y offline;
- acción principal y acciones secundarias;
- comportamiento en móvil y teclado;
- criterios de aceptación verificables;
- decisión sobre qué queda explícitamente fuera de V1.

## 13. Orden de construcción posterior

1. `FarmCard`, `PlotCard`, `MetricCard` y estados base.
2. Raíz de Mi Campo y alta de primera finca.
3. Mini app de finca con segmentos y agregación real.
4. Parcelas como listado, filtro y datos dentro de la finca.
5. `ActivityCard`, `DeliveryCard`, `DocumentCard` y timeline por subpantalla.
6. Formularios superficiales de Trabajo, Tratamiento, Riego, Recolección, Entrega, Rendimiento y Tarea desde `+`.
7. Mapa y procedencia de fuentes; solo sobre contratos ya aprobados.
8. Documento/foto y flujos de evidencia.
9. Validación manual en móvil: exterior, offline, teclado, PWA y vuelta atrás.

No se empezará el punto siguiente mientras el anterior no tenga documentación, pantalla de referencia aprobada y criterios de aceptación cubiertos.
