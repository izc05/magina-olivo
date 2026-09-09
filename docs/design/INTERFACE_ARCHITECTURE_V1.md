# Arquitectura de interfaz V1 — Mágina Olivo

Fecha: 2026-09-09  
Estado: **autoridad de diseño para `feat/interface-redesign-clean-v1`; no implementar pantallas hasta cerrar esta documentación**

## 1. Propósito y autoridades

Mágina Olivo es el histórico privado y operativo del olivarero. La interfaz debe ayudar a consultar el estado del campo y registrar un hecho sin convertir el móvil en un ERP.

Este documento ordena la interfaz. No sustituye las reglas de negocio existentes.

| Tema | Fuente de verdad |
| --- | --- |
| Producto y jerarquía agrícola | `MASTER_PLAN.md` |
| Modelo, cálculos y trazabilidad | `docs/DATA_MODEL.md`, `docs/CALCULATION_RULES_V1.md` |
| Autorización, API, offline y documentos privados | `ARCHITECTURE.md`, `docs/API_CONTRACT_V1.md`, `docs/INTEGRATION_V2_MVP_V1.md` |
| Lenguaje visual | `docs/DESIGN_SYSTEM_V1.md` |
| Flujos y pantallas | este documento y `docs/design/MI_CAMPO_ARCHITECTURE_V1.md` |
| Color, tipo, iconos y fichas | `docs/design/VISUAL_SYSTEM_CLEAN_V1.md` |

Si una decisión visual exige un dato, permiso o cálculo que el núcleo no ofrece, se documenta como evolución. Nunca se simula como si estuviera disponible.

## 2. Principios de la interfaz

1. **Móvil primero y una mano.** La acción frecuente cabe en una sesión corta y los controles táctiles son claros.
2. **Consultar antes de registrar.** La pantalla explica dónde está el usuario y qué ha ocurrido antes de pedir datos.
3. **Un dato, una ficha, muchas vistas.** Un registro canónico se representa por una ficha reutilizable y se filtra o agrega; no se copia entre finca, parcela y campaña.
4. **Progresivo, no pobre.** El alta pide lo imprescindible. Los datos agrícolas y administrativos avanzados aparecen al necesitarlos.
5. **Contexto siempre visible.** Cualquier formulario indica explotación, finca y parcela elegidas, o explica que el registro es de finca completa o sin asignar.
6. **Privado y trazable.** Origen, fuente cartográfica, sincronización y documentos se muestran con honestidad; nunca se confunde una fuente oficial con propiedad verificada.
7. **El color acompaña al texto.** Los estados siempre llevan etiqueta, icono o estructura además de color.

## 3. Capas de la aplicación

La interfaz se compone de capas estables. Una pantalla puede combinar varias, pero no debe saltárselas ni duplicar su responsabilidad.

```text
0. Sistema seguro
   sesión · permisos · conexión · sincronización · errores
1. App shell
   cabecera · selector de explotación · navegación principal · avisos
2. Áreas de producto
   Inicio · Mi Campo · Campaña · Directorio/Mágina · Más
3. Contexto agrícola
   explotación -> finca -> parcela
4. Espacios de trabajo
   resumen · actividad · cosecha · mapa · datos · documentos
5. Registro y consulta
   formularios · fichas · filtros · detalle · edición
6. Evidencia y procedencia
   documento/foto · ticket · Catastro/SIGPAC · origen · estado de sync
```

### 3.1 Sistema seguro

No se rediseña ni se oculta por razones estéticas:

- puerta de autenticación y autorización por explotación;
- carga, vacío, error recuperable y sin conexión;
- cola offline por usuario e idempotencia de escrituras;
- permisos de cámara, ubicación y notificaciones solo por gesto explícito;
- documentos privados descargados con autorización.

### 3.2 App shell

El shell permanece idéntico al cambiar de área: marca, ayudas de accesibilidad, selector de explotación cuando exista más de una, avisos y navegación.

La navegación tiene como máximo cinco destinos persistentes. La decisión funcional V1 es:

| Destino | Responde a | Contenido principal |
| --- | --- | --- |
| Inicio | ¿Qué necesito mirar hoy? | campaña activa, avisos y actividad reciente |
| Mi Campo | ¿Dónde están mis olivos y qué ha pasado? | fincas y la mini app operativa de cada finca |
| Campaña | ¿Cómo va la cosecha? | entregas, rendimientos, documentos y comparativas |
| Mágina | ¿Qué información externa me sirve? | cooperativas, tiempo, RAIF, mercado y territorio |
| Más | ¿Qué no es una tarea diaria? | perfil, ajustes, importación, ayuda y recursos |

El disparador de registro rápido `+` es **contextual y no un sexto destino**. Es la única puerta para crear registros y parcelas; la excepción es `Nueva finca`, que está disponible directamente en la raíz de Mi Campo. En una subpantalla de finca, el `+` hereda tanto la finca como el módulo abierto: Trabajos propone trabajo, Tareas propone tarea y Campaña propone entrega. Su posición visual definitiva se valida junto a la maqueta móvil para que no tape ningún destino de la barra.

### 3.3 Áreas de producto

- **Inicio** resume; no duplica listas completas ni configura fincas.
- **Mi Campo** es el espacio operativo y territorial privado. Muestra las fincas; cada finca abre una mini app propia. Es la prioridad de este rediseño.
- **Campaña** global agrupa resultados de toda la explotación. La subpantalla `Campaña` dentro de una finca muestra exactamente los mismos tipos de registros, filtrados por esa finca; no crea una segunda campaña.
- **Mágina** separa explícitamente datos públicos externos de los datos privados del agricultor.
- **Más** contiene acciones poco frecuentes y preferencias; no se usa como cajón para acciones diarias de campo.

## 4. Patrón universal: formulario -> registro -> ficha -> agregación

```text
Formulario contextual
  -> validación y guardado una vez
  -> entidad canónica privada
  -> ficha de su tipo
  -> filtro/agregación en parcela, finca, campaña e Inicio
```

Ejemplo: una poda de una parcela genera **una** actividad. La misma `ActivityCard` se verá en la parcela, en la actividad de la finca y como actividad reciente de Mi Campo. No se crean tres copias.

Las fichas son la superficie de lectura; el formulario es una superficie breve de escritura. Ninguna pantalla conserva un formulario largo abierto junto a todo el histórico.

## 5. Sistema de superficies

| Superficie | Uso | Regla |
| --- | --- | --- |
| Página raíz | Inicio, Mi Campo, Campaña, Mágina, Más | un objetivo principal y lectura rápida |
| Ficha de entidad | finca, parcela, entrega, actividad, documento | resumen escaneable y navegación al detalle |
| Espacio de trabajo | mapa, actividad, cosecha, datos, documentos | foco en una tarea o conjunto homogéneo |
| Bottom sheet | selector, acciones rápidas, filtros, confirmación breve | no contiene formularios extensos |
| Pantalla de formulario | alta o edición con varios campos | conserva contexto y permite cancelar sin perder orientación |
| Detalle | un registro individual | muestra trazabilidad, evidencia y edición permitida |

## 6. Fichas compartidas

La nueva interfaz tendrá una única implementación de cada ficha, con variantes de densidad pero sin clones por pantalla.

| Componente | Entidad canónica | Se reutiliza en |
| --- | --- | --- |
| `MetricCard` | agregado calculado | Inicio, finca, parcela, campaña |
| `FarmCard` | finca | Mi Campo, selector, resultados de búsqueda |
| `PlotCard` | parcela | finca, selector, mapa, Mi Campo |
| `ActivityCard` | actividad | parcela, finca, Inicio, historial |
| `DeliveryCard` | entrega + resultado asociado | campaña, parcela/finca filtrada, Inicio |
| `TaskCard` | tarea | Inicio, parcela, finca, agenda |
| `DocumentCard` | documento + enlace | campaña, parcela, finca, biblioteca |
| `EvidenceCard` | foto/documento y procedencia | detalle de registro, galería, fuentes |
| `SourceCard` | Catastro, SIGPAC, perímetro u otra fuente | datos de parcela y mapa |
| `AlertCard` | aviso/estado | Inicio y contexto relacionado |

Todas las fichas navegables llevan affordance visible, pero no se usan flechas para controles que ya tienen botón propio. El título puede usar la familia editorial aprobada; importes, kilos, fechas y porcentajes usan números tabulares y tipografía de UI.

## 7. Estados obligatorios

Cada área y cada lista define los mismos estados:

1. cargando;
2. contenido con datos;
3. vacío orientado a la siguiente acción;
4. sin conexión con datos locales disponibles;
5. pendiente de sincronización;
6. error recuperable;
7. sin permiso o contexto no disponible;
8. archivado/histórico cuando aplique.

Un estado vacío no se resuelve con una pantalla en blanco ni con un formulario enorme. Debe decir qué falta, por qué importa y cuál es la única acción siguiente razonable.

## 8. Reglas de construcción

- Ningún dato demo llega a producción como fuente de verdad.
- La UI no recalcula kilos, rendimientos ni costes críticos que ya calcula el backend.
- Las rutas no inventan entidades nuevas: se construyen sobre los identificadores canónicos de explotación, finca, parcela, campaña y registro.
- Cada formulario especifica campos obligatorios, opcionales, validación, resultado y vistas afectadas antes de codificarse.
- Un cambio visual no modifica la semántica de una operación offline ni elimina accesibilidad existente.
- No se añade una nueva pantalla hasta que la anterior tenga estructura, estados, fichas y contrato documentados.

## 9. Orden de diseño e implementación

El rediseño sigue este orden; no se salta a iconos o colores antes de decidir la información.

1. Shell y navegación, sin implementar todavía la composición final.
2. Mi Campo: lista de fincas y estados vacíos.
3. Mini app de finca, sus módulos y agregaciones.
4. Parcelas como listado, filtro y datos agrícolas dentro de la finca.
5. Registro rápido y formularios superficiales de Mi Campo.
6. Fichas y timeline reutilizables.
7. Campaña conectada a los mismos registros.
8. Inicio, Mágina y Más.
9. Accesibilidad, offline y PWA en dispositivo real.

El detalle completo de los puntos 2 a 6 está en `docs/design/MI_CAMPO_ARCHITECTURE_V1.md`.
