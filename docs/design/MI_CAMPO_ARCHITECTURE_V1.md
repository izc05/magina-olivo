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
  └─ Finca                         contexto de gestión
      └─ Parcela                   unidad agrícola operativa
          ├─ Registros             hechos introducidos una vez
          ├─ Evidencias            fotos, documentos, fuentes
          └─ Insights              agregados calculados y alertas
```

| Capa | Qué contiene | Qué nunca debe hacer |
| --- | --- | --- |
| Explotación | selector y límites de autorización | mezclar datos de dos propietarios |
| Finca | parcelas, actividad agregada y resumen | copiar registros de sus parcelas |
| Parcela | ficha agrícola, mapa, historial y acciones | exigir que toda entrega tenga parcela |
| Registro | actividad, entrega, rendimiento, tarea o documento | duplicarse al aparecer en una agregación |
| Evidencia/fuente | ticket, foto, Catastro, SIGPAC, perímetro | afirmar propiedad o inventar verificación |
| Insight | métricas y alertas deterministas | reemplazar el registro fuente |

## 3. Mapa de pantallas

```text
Mi Campo
├─ Mis fincas
│  ├─ Crear primera finca
│  ├─ Crear finca
│  └─ Ficha de finca
│     ├─ Resumen
│     ├─ Parcelas
│     ├─ Actividad
│     ├─ Cosecha
│     ├─ Mapa
│     └─ Datos y documentos
└─ Ficha de parcela
   ├─ Resumen
   ├─ Actividad
   ├─ Cosecha
   ├─ Mapa
   ├─ Datos del olivar
   └─ Documentos y fotos
```

Los formularios no son nodos principales del árbol. Se abren desde un contexto y, al guardar, devuelven a la ficha creada o actualizada.

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
3. acciones contextuales: añadir parcela, registrar para toda la finca, abrir mapa;
4. segmentos de trabajo: `Resumen`, `Parcelas`, `Actividad`, `Cosecha`, `Mapa`, `Datos`;
5. contenido de un solo segmento por vez.

### Segmentos

| Segmento | Contenido | Fuente |
| --- | --- | --- |
| Resumen | última actividad, alertas, métricas y accesos | agregados/consultas reales |
| Parcelas | `PlotCard` de la finca | parcelas de la finca |
| Actividad | `ActivityCard`, `TaskCard`, evidencia relacionada | registros filtrados por finca y sus parcelas |
| Cosecha | entregas y rendimiento por parcela/sin asignar | campaña y entregas canónicas |
| Mapa | parcelas localizadas y fuentes | coordenadas/geometría autorizadas |
| Datos | descripción, notas y fuentes generales | finca + fuentes enlazadas |

Un registro creado para una parcela aparece en la actividad de finca con el nombre de la parcela. Un registro creado para toda la finca lo indica expresamente: `Toda la finca`.

## 7. Ficha de parcela

### Objetivo

Es el núcleo operativo. Debe ser breve de leer, contextual al trabajar y profunda solo si el usuario abre un espacio de trabajo.

### Cabecera

- volver a la finca;
- nombre de parcela;
- finca y municipio/localización cuando existan;
- superficie, número de olivos y riego como métricas legibles;
- estado de localización/fuente cuando exista;
- acción principal contextual `Registrar`.

### Secciones

| Sección | Pregunta que resuelve | Componentes |
| --- | --- | --- |
| Resumen | ¿Cómo está esta parcela hoy? | campaña, alertas, última labor, acceso a registro |
| Actividad | ¿Qué se ha hecho y observado? | timeline y filtros por tipo |
| Cosecha | ¿Qué se recogió/entregó y qué rendimiento llegó? | recolecciones, entregas, rendimientos y desglose honesto |
| Mapa | ¿Dónde está y de qué fuente procede el límite? | mapa, fuente, precisión y edición permitida |
| Datos | ¿Qué sé del olivar? | datos agrícolas y edición progresiva |
| Documentos | ¿Qué evidencia guardé? | documentos y fotos relacionados |

La ficha no muestra todos los segmentos a la vez. `Resumen` es la única portada; las demás son vistas focalizadas.

## 8. Datos del olivar y fuentes

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

## 9. Registros de Mi Campo

### 9.1 Contrato común de formulario

Todo alta debe definir:

1. contexto elegido: explotación, finca, parcela y campaña si aplica;
2. campos mínimos y opcionales;
3. validación local y servidor;
4. comportamiento offline;
5. ficha resultante;
6. vistas que la reciben por filtro/agregación;
7. edición, archivo y trazabilidad.

Al guardar se muestra confirmación concreta (`Riego guardado en Estacas`) y el usuario puede volver al contexto, añadir otro o abrir la ficha del registro cuando exista detalle.

### 9.2 Matriz de registros

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

### 9.3 Formularios específicos

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

## 10. Timeline, filtros y agregación

La timeline de parcela ordena por fecha descendente y usa icono, título, contexto, valor principal y detalle secundario.

```text
icono + tipo              valor principal
parcela/finca + fecha     detalle o evidencia
```

Filtros iniciales: `Todo`, `Labores`, `Entregas`, `Rendimientos`, `Documentos`. Los filtros no cambian ni copian datos; cambian la consulta o la presentación.

| Vista | Regla de agregación |
| --- | --- |
| Parcela | solo registros con `plot_id` de la parcela |
| Finca | registros de su `farm_id` y de sus parcelas, con etiqueta de origen |
| Campaña | entregas/resultados y actividades con `campaign_id`; nunca inferir una campaña sin regla explícita |
| Mi Campo | actividad reciente de las fincas permitidas; sin convertirla en historial completo |

Los kilos de campaña y el rendimiento ponderado proceden de los cálculos canónicos. Recolecciones y entregas se muestran como conceptos distintos para evitar doble conteo.

## 11. Estados y excepciones de Mi Campo

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

## 12. Accesibilidad y uso exterior

- Etiqueta de texto e icono en cada acción; no solo color.
- Objetivos táctiles mínimos de 44 px y espaciado que evite pulsaciones accidentales.
- Orden de foco: contexto -> contenido -> acción principal -> navegación.
- Formularios con etiqueta persistente, ayuda de formato y error junto al campo.
- Métricas con unidades explícitas: `kg`, `%`, `ha`, `m³`, `€`.
- Contraste válido sobre fondo piedra, superficies blancas y luz intensa; ningún dato relevante sobre fotografía sin capa legible.
- Los cambios de contexto de finca/parcela se anuncian y no borran un formulario sin aviso.

## 13. Definición de preparado antes de código

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

## 14. Orden de construcción posterior

1. `FarmCard`, `PlotCard`, `MetricCard` y estados base.
2. Raíz de Mi Campo y alta de primera finca.
3. Ficha de finca con segmentos y agregación real.
4. Ficha de parcela: resumen, actividad y datos.
5. `ActivityCard`, `DeliveryCard`, `DocumentCard` y timeline.
6. Formularios Trabajo, Tratamiento, Riego, Recolección, Entrega, Rendimiento y Tarea.
7. Mapa y procedencia de fuentes; solo sobre contratos ya aprobados.
8. Documento/foto y flujos de evidencia.
9. Validación manual en móvil: exterior, offline, teclado, PWA y vuelta atrás.

No se empezará el punto siguiente mientras el anterior no tenga documentación, pantalla de referencia aprobada y criterios de aceptación cubiertos.
