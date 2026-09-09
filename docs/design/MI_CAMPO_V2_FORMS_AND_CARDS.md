# Mágina Olivo — Mi Campo: formularios y fichas V2

Fecha: 2026-09-09  
Estado: especificación de evolución para implementación por fases  
Complementa: `docs/design/MI_CAMPO_SCREEN_CONTRACTS_V4_1.md`, `docs/DATA_MODEL.md` y `docs/V1_LABOR_CATALOG.md`

> Esta especificación convierte Mi Campo en un sistema consistente de **registro → ficha → agregación**. No sustituye la dirección visual Campo Claro V4.1 ni obliga a implementar todas las entidades en una sola entrega.

---

## 1. Decisión de producto

Cada dato se registra una vez, se representa mediante una ficha y se muestra en todos los niveles que correspondan.

```text
Formulario específico
        ↓ guardar
Registro canónico vinculado a parcela, finca o campaña
        ↓ representación
Ficha reutilizable
        ↓ agregación o filtro
Parcela · Finca · Campaña · Mi Campo
```

Reglas innegociables:

- No crear tres copias de una labor para verla en parcela, finca y Mi Campo.
- La parcela es el origen habitual; una actividad también puede pertenecer a toda una finca cuando no sea posible o conveniente repartirla.
- Los totales de finca y campaña se calculan a partir de registros canónicos. Se pueden cachear, pero siempre se reconstruyen desde el origen.
- Al volver de un formulario, se muestra una confirmación y la ficha queda disponible en su destino. No se abandona a la persona usuaria en una pantalla genérica.
- El contexto ya conocido se conserva: registrar desde `Estacas` preselecciona `Salinillas · Estacas`.
- No se usa un megaformulario. Cada acción abre solo los campos que necesita y ofrece `Más datos` para los opcionales.

---

## 2. Sistema único de fichas

La aplicación debe reutilizar una implementación de cada ficha, no recrear estilos y lógica por pantalla.

| Componente | Representa | Datos mínimos visibles | Se muestra en |
| --- | --- | --- | --- |
| `MetricCard` | Métrica agregada | valor, unidad, etiqueta, estado opcional | parcela, finca, campaña, Mi Campo |
| `FarmCard` | Finca | nombre, ha, parcelas, última actividad | Mi Campo, selector de destino |
| `PlotCard` | Parcela | nombre, ha, olivos, riego, variedad si existe | finca, mapa, selector |
| `ActivityCard` | Labor, tratamiento, riego o recolección | icono, tipo, destino, fecha, dato principal, coste opcional | actividad de parcela/finca y recientes |
| `DeliveryCard` | Entrega | kilos, destino, fecha, ticket y rendimiento si existe | campaña, parcela, finca |
| `TaskCard` | Tarea | título, destino, fecha/hora, prioridad y estado | tareas, resumen de parcela |
| `MediaCard` | Foto o documento | miniatura/tipo, título, destino y fecha | galería, documentos, registro relacionado |
| `AlertCard` | Incidencia o atención | severidad, título, destino, estado y fecha | parcela, finca, Inicio |
| `MapSourceCard` | Fuente territorial | Catastro/SIGPAC/perímetro, estado y acción | datos y mapa de parcela |

### Anatomía y estilo

- Fondo blanco, borde sutil y radio de 16 px; no anidar tarjetas sin necesidad.
- Icono en baldosa suave con color semántico, nunca como único portador de significado.
- Nombre/título en sans-serif para fichas operativas. La serif queda reservada para el nombre de finca o parcela en una cabecera de identidad.
- Línea secundaria breve: destino, fecha, superficie o estado.
- Flecha solo cuando tocar la ficha abre detalle. Una ficha puramente informativa no aparenta navegación.
- Estado con icono y texto, además de color.

Semántica de iconos y color:

| Dominio | Icono orientativo | Color |
| --- | --- | --- |
| Trabajo / poda / abonado | herramienta o libro de campo | verde Mágina |
| Tratamiento | hoja, pulverizador o matraz | verde hoja |
| Riego / mapa | gota o mapa | azul informativo |
| Entrega / campaña | aceituna o albarán | dorado aceite |
| Documento | archivo | gris/neutral |
| Aviso / incidencia | triángulo de alerta | dorado; rojo tierra solo si crítico |

---

## 3. Centro de acciones `+`

El Centro de acciones es el punto de entrada común. Mantiene el contexto actual visible y permite cambiarlo una sola vez.

```text
¿Qué quieres añadir?
Salinillas · Estacas                         [Cambiar]

REGISTRAR
Trabajo              Tratamiento
Riego                Recolección
Entrega              Tarea

ORGANIZAR
Foto                 Documento
Nueva finca          Nueva parcela
Maquinaria

Gasto e incidencia                         ← fases posteriores
```

Prioridad de implementación:

1. Trabajo, tratamiento, riego, entrega, tarea, finca y parcela.
2. Recolección, foto y documento vinculados a sus fichas.
3. Gasto e incidencia cuando exista un contrato canónico para ambos.

No se muestran acciones que parezcan guardar datos si aún no existe una ruta segura para persistirlos. En ese caso se marcan internamente como fase posterior, no como botón inerte.

La barra inferior privada mantiene cinco destinos estables:

```text
Inicio | Mi Campo | + | Campaña | Más
```

`Mágina` y `Descubre` se conservan dentro de `Más`, junto con el perfil y los ajustes. Así la campaña queda disponible siempre en el nivel principal.

---

## 4. Contratos de formularios

La etiqueta `*` indica el mínimo exigible para guardar. Los valores preseleccionados se pueden modificar. `Avanzados` empieza cerrado.

### 4.1 Nueva finca

Entrada preferida: `Mapa`, `Catastro`, `SIGPAC`, `Mi ubicación` o `Crear manualmente`.

Formulario manual:

| Campo | Estado | Regla |
| --- | --- | --- |
| Nombre | `*` | nombre reconocible de la finca |
| Municipio | opcional | heredado de explotación cuando exista |
| Descripción | opcional | texto breve |
| Foto de finca | opcional | foto de identidad, no requisito de alta |
| Superficie | derivada/previsualizada | se calcula desde parcelas cuando existan; puede faltar al inicio |

Al guardar: `FarmCard` con nombre, ha, número de parcelas y olivos agregados.

### 4.2 Nueva parcela

El flujo prioritario es territorial: seleccionar perímetro o fuente oficial y después completar datos agronómicos. El formulario manual sigue disponible.

| Campo | Estado | Regla |
| --- | --- | --- |
| Finca | `*` | preseleccionada si se conoce el contexto |
| Nombre | `*` | identificable en campo |
| Superficie | derivada u opcional manual | indicar siempre fuente cuando proceda |
| Olivos | opcional | entero no negativo |
| Riego | recomendado | secano, regadío, mixto o sin definir |
| Variedad | opcional | relación de variedades; no texto bloqueado a una sola variedad |
| SIGPAC | opcional | vinculación/mapa; no solo texto libre para una fuente verificada |
| Notas | opcional | visible en datos avanzados |

Datos avanzados, nunca obligatorios en el alta: sistema de cultivo, marco de plantación, año aproximado de plantación y pendiente.

Al guardar: `PlotCard` con ha, olivos, riego y variedad si existe.

### 4.3 Trabajo

Para poda, abonado, desbroce, laboreo, reposición, mantenimiento, muestreo y otro.

| Campo | Estado |
| --- | --- |
| Destino | `*` cuando no venga de contexto |
| Tipo | `*` |
| Fecha y hora | `*`, ahora por defecto |
| Alcance / superficie afectada | opcional; toda la parcela por defecto cuando aplique |
| Coste total | opcional |
| Nota | opcional |
| Foto o documento | opcional, fase de enlaces multimedia |

Al guardar: `ActivityCard`. Se reutiliza en actividad de parcela, actividad de finca y recientes de Mi Campo mediante filtros, nunca mediante copias.

### 4.4 Tratamiento

Es una actividad especializada; no se usa el formulario genérico de trabajo.

| Campo | Estado |
| --- | --- |
| Destino | `*` cuando no venga de contexto |
| Fecha y hora | `*`, ahora por defecto |
| Producto | `*` |
| Número de registro | recomendado, nunca inventado por la app |
| Cantidad y unidad | opcionales como pareja; ambos si se informa uno |
| Superficie tratada | opcional; se propone la de parcela |
| Motivo | opcional, fase de ampliación CUE |
| Coste y notas | opcionales |
| Foto/documento | opcionales |

Campos CUE futuros — aplicador, condiciones ambientales, equipo y plazo de seguridad — quedan fuera del mínimo hasta disponer de requisitos normativos y modelo validado. La app no afirma que un producto esté autorizado sin una fuente normativa adecuada.

### 4.5 Riego

| Campo | Estado |
| --- | --- |
| Destino | `*` cuando no venga de contexto |
| Fecha | `*`, hoy por defecto |
| Duración | opcional; persistir como minutos cuando se habilite |
| Cantidad de agua y unidad | opcionales como pareja |
| Superficie | opcional; toda la parcela por defecto |
| Coste y notas | opcionales |

Al guardar: `ActivityCard` con duración y volumen como dato principal si están disponibles.

### 4.6 Recolección

Recolección es una labor. No equivale a entrega a cooperativa ni suma kilos oficiales de campaña por sí sola.

| Campo | Estado |
| --- | --- |
| Parcela/finca | `*` |
| Fecha | `*` |
| Kilos estimados | opcional y claramente etiquetados como estimación |
| Jornada, método, personas y coste | opcionales |
| Notas | opcional |

Después de guardar se puede ofrecer `Registrar entrega`, sin crearla automáticamente.

### 4.7 Entrega

Se conserva el flujo compacto, con preselección de finca/parcela cuando se entra desde ellas.

| Campo | Estado |
| --- | --- |
| Kilos | `*` y mayor que cero |
| Almazara/cooperativa o destino manual | `*` |
| Fecha y hora | `*`, ahora por defecto |
| Finca/parcela | opcional para cargas mezcladas; preseleccionada en contexto |
| Número de ticket y variedad | opcionales |
| Foto/PDF y notas | opcionales |

Tras guardar: confirmación `Entrega guardada` con acciones `Añadir otra`, `Añadir rendimiento` y `Ver campaña`. `DeliveryCard` muestra rendimiento solo cuando exista un resultado asociado.

### 4.8 Rendimiento

Entrada desde una ficha de entrega, no desde un formulario aislado.

| Campo | Estado |
| --- | --- |
| Entrega | `*`, bloqueada a la ficha origen |
| Rendimiento porcentual | `*` |
| Fecha de análisis, documento y observación | opcionales |

Actualiza los agregados de parcela, finca y campaña mediante cálculo determinista ponderado por kilos. No sobrescribe la entrega.

### 4.9 Tarea

| Campo | Estado |
| --- | --- |
| Título | `*` |
| Destino | opcional; usa contexto actual |
| Fecha y hora | `*` fecha; hora opcional |
| Prioridad | normal por defecto |
| Recordatorio y notas | opcionales |

Completar una tarea no crea una labor automáticamente. La ficha completada ofrece `Registrar trabajo realizado`.

### 4.10 Foto y documento

Una foto es un documento con una experiencia de captura rápida. Ambos usan enlaces a entidades para no duplicar archivos.

| Registro | Mínimo | Opcional |
| --- | --- | --- |
| Foto | cámara o galería, destino | tipo, descripción, ubicación con consentimiento explícito |
| Documento | archivo, tipo, destino | campaña, fecha, notas |

La ubicación exige una acción explícita y nunca guarda recorridos. Se muestran con `MediaCard` en galería y en la entidad relacionada.

### 4.11 Gasto e incidencia — no implementar como actividad genérica

| Registro | Decisión V2 |
| --- | --- |
| Gasto | requiere entidad o desgloses de coste independientes. Hasta entonces, el coste de una labor sigue en `cost_amount` de esa actividad. |
| Incidencia | requiere entidad de estado y ciclo de resolución; una observación no debe presentarse como diagnóstico. Puede crear una tarea de seguimiento explícitamente. |

---

## 5. Pantallas agregadas

### Parcela

```text
Estacas
1,05 ha · 110 olivos · Regadío

Hoy en Estacas
clima · alerta relevante · última labor

[ Registrar ]

Resumen: campaña · actividad · costes
Actividad | Cosecha | Mapa | Datos | Documentos
```

La cabecera pertenece a la familia Identidad/Territorio. Los módulos y listas emplean la familia Gestión. Los datos oficiales se presentan mediante `MapSourceCard`, vinculados desde el mapa y no editados como texto libre.

### Finca

Usa los mismos `PlotCard`, `ActivityCard`, `DeliveryCard` y `MetricCard` de parcela, filtrando todas sus parcelas. No define un sistema paralelo de tarjetas.

### Campaña y Mi Campo

Muestran métricas y fichas agregadas. Toda cifra debe indicar su alcance y no mezclar kilos recolectados estimados con kilos entregados oficiales.

---

## 6. Mapa de entrega incremental

| Fase | Alcance | Resultado verificable |
| --- | --- | --- |
| A | Unificar anatomía de `FarmCard`, `PlotCard`, `ActivityCard`, `DeliveryCard` y `MetricCard` | mismas fichas en parcela, finca y Mi Campo |
| B | Afinar formularios existentes de trabajo, tratamiento, riego, entrega, tarea, finca y parcela | contexto persistente, mínimos cortos y confirmación posterior |
| C | Alta territorial de finca/parcela y `MapSourceCard` | superficie/fuente diferenciadas y vinculación validada por servidor |
| D | Recolección, foto y documento con fichas y enlaces | un único archivo visible desde sus relaciones |
| E | Entidades de gasto e incidencia, tras definir contrato y migración | totales y estados trazables sin sobrecargar actividades |

Antes de cada fase se debe contrastar este documento con `MASTER_PLAN.md`, el modelo de datos, la rama activa de Mi Campo y sus cambios reales. Cada modificación visual pasa comprobación móvil, teclado, foco de modal, contraste y estados offline.

---

## 7. Criterios de aceptación transversales

- Registrar una entrega normal requiere un solo paso y puede completarse en menos de 30 segundos.
- Una labor simple puede guardarse con tipo, destino y fecha; los campos adicionales no bloquean.
- Todo formulario con contexto conocido lo muestra y lo conserva.
- El usuario distingue visualmente entre datos estimados, verificados, pendientes y oficiales.
- Ninguna ficha se duplica para propagar información a finca o campaña.
- Estado, error, éxito y acciones destructivas son accesibles por texto, foco y no dependen solo del color.
- Offline: el registro indica claramente si queda en cola local y se actualiza cuando sincroniza.
- La misma entidad abre el mismo detalle con independencia de haber llegado desde parcela, finca o Mi Campo.
