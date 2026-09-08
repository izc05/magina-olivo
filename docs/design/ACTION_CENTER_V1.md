# Mágina Olivo — Centro de acciones V1

Fecha: 2026-09-08  
Estado: dirección de producto y UX post-staging  
Documento padre: `docs/design/MI_CAMPO_UX_V4.md`

## 1. Decisión de producto

El botón central `+` de Mágina Olivo será un **Centro de acciones**.

No representará Campaña ni una única función concreta.

Regla mental:

```text
Mi Campo = consultar / entender / gestionar
+        = añadir / registrar algo nuevo
```

La barra inferior privada queda:

```text
[ Inicio ] [ Mi Campo ] [ + ] [ Campaña ] [ Más ]
```

Al pulsar `+`, abrir una pantalla o capa completa centrada en la pregunta:

```text
¿Qué quieres añadir?
Añade algo a tu campo
```

## 2. Por qué esta arquitectura es escalable

El Centro de acciones desacopla las funciones del menú principal.

Añadir una función futura no exige añadir otra pestaña a la barra inferior.

Ejemplos de futuras acciones posibles:

- análisis de suelo;
- incidencia;
- gasto;
- sensor;
- parte de cuadrilla;
- mantenimiento de riego;
- lectura de contador;
- visita técnica.

La navegación principal puede permanecer estable mientras crecen las capacidades.

## 3. Acciones V1

Máximo recomendado de 10 acciones visibles en primer nivel:

```text
Trabajo
Tarea
Riego
Tratamiento
Jornal
Maquinaria
Entrega
Observación / foto
Documento
Finca / parcela
```

### Trabajo

Subtipos ya definidos en `docs/V1_LABOR_CATALOG.md`:

- poda;
- desbroce;
- abonado;
- laboreo;
- recolección;
- mantenimiento;
- plantación/reposición;
- análisis/muestreo;
- otra.

`Tratamiento` y `Riego` pueden aparecer como accesos directos aunque conceptualmente sean actividades de campo, porque son acciones frecuentes y tienen flujos específicos.

## 4. Diseño de pantalla

Mobile first.

```text
< cerrar

¿Qué quieres añadir?
Añade algo a tu campo

[ Trabajo ]      [ Tarea ]
[ Riego ]        [ Tratamiento ]
[ Jornal ]       [ Maquinaria ]
[ Entrega ]      [ Observación ]
[ Documento ]    [ Finca/parcela ]
```

Características:

- iconos grandes;
- texto corto;
- target táctil amplio;
- una mano;
- sin formularios en esta pantalla;
- cierre seguro;
- mantener contexto de origen mientras permanezca válido.

## 5. Contexto inteligente

El Centro de acciones debe heredar el contexto desde donde se abre.

Contrato conceptual:

```ts
type ActionContext = {
  holdingId?: string;
  farmId?: string;
  plotId?: string;
  campaignId?: string;
  returnTo?: string;
};
```

### Desde Inicio

No hay finca/parcela concreta necesariamente.

Ejemplo:

```text
+ -> Riego
-> elegir finca
-> elegir parcela
-> completar datos
```

### Desde una finca

Preseleccionar la finca.

```text
+ -> Trabajo

Finca: Cortijo del Río

¿Dónde?
○ Toda la finca
● Elegir parcelas
```

### Desde una parcela

Preseleccionar finca y parcela.

```text
+ -> Riego

Parcela Norte · Cortijo del Río
```

No pedir otra vez el contexto salvo que el usuario quiera cambiarlo.

### Regla de seguridad

Nunca arrastrar un contexto antiguo accidentalmente a una nueva acción iniciada desde otro lugar.

## 6. Una acción = un formulario

No crear dos formularios distintos para la misma operación.

Ejemplo:

```text
Mi Campo -> Riegos -> + Registrar riego
```

y:

```text
+ -> Riego
```

usan exactamente el mismo formulario/componente y el mismo contrato API.

Lo mismo para Tareas, Jornales, Tratamientos, Entregas, etc.

## 7. Patrón común de cada módulo

Cada apartado de gestión debe repetir una estructura reconocible.

```text
TÍTULO
Resumen rápido

[ + AÑADIR / REGISTRAR ]

Pendiente / relevante

Últimos registros

[ Ver historial ]
```

El agricultor aprende una vez el patrón y luego puede usar cualquier módulo.

### Ejemplo Tareas

```text
TAREAS
3 pendientes · 1 para hoy

[ + Nueva tarea ]

Hoy
Revisar riego · Parcela Norte

Próximas
Revisar mosca · Las Erillas

Completadas recientemente
...
```

Una tarea puede pertenecer a:

- explotación;
- finca completa;
- una parcela;
- varias parcelas cuando el modelo lo soporte.

### Ejemplo Jornales y maquinaria

```text
JORNALES Y MAQUINARIA
Septiembre 2026
12 jornales · 86 h · 1.240 €

[ + Añadir jornal ]

Últimos registros
Juan · 7 h · Poda · Parcela Norte
Cuadrilla Antonio · Recolección · Las Erillas
Tractor + desbrozadora · 3 h · El Cerro

[ Ver todos ]
```

### Ejemplo Riegos

```text
RIEGOS
Próximo aviso
Sector 5 · Virgen de 4 · jueves 08:00

[ + Registrar riego ]

Esta semana
2 riegos registrados

Últimos
...
```

### Ejemplo Tratamientos

```text
TRATAMIENTOS
3 esta campaña
Último · 28 ago · Parcela Norte

[ + Registrar tratamiento ]

Histórico reciente
...
```

## 8. Cuaderno = cronología agregada

`Cuaderno` no debe crear un segundo sistema de registros.

Su misión es reunir cronológicamente los eventos ya guardados en módulos especializados.

Ejemplo:

```text
CUADERNO

[ Todos ] [ Trabajos ] [ Riegos ] [ Tratamientos ] [ Jornales ] [ Fotos ]

8 SEP · Jornal · Juan · 7 h · Parcela Norte
7 SEP · Riego · Sector 5 · Parcela Norte
5 SEP · Tratamiento · Las Erillas
3 SEP · Observación · Foto · El Cerro
```

No duplicar datos ni mantener timelines paralelos incompatibles.

## 9. Riego y avisos administrativos

Los datos de riego de parcela deben contemplar, cuando proceda:

- tipo de riego: secano / regadío / mixto / sin definir;
- sistema: goteo / aspersión / otro;
- comunidad/red/nombre del riego;
- sector;
- días habituales opcionales;
- notificaciones activadas/desactivadas.

Ejemplo:

```text
Comunidad/red: Virgen de 4
Sector: 5
Sistema: goteo
```

Esto permite al futuro Admin crear una alerta segmentada:

```text
Red: Virgen de 4
Sector: 5
Fecha: 12 sep 2026
Hora: 08:00
Mensaje: Se activa el riego del sector 5
```

Destinatarios automáticos:

```text
usuarios activos
-> parcelas con red = Virgen de 4
-> sector = 5
-> notificaciones de riego activadas
```

La alerta no debe modificar automáticamente un registro de riego realizado. Avisar y registrar son acciones distintas.

## 10. Arquitectura configurable

Evitar hardcodear una cadena de `if` en el shell principal.

Contrato conceptual:

```ts
type ActionDefinition = {
  id: string;
  label: string;
  icon: string;
  route: string;
  category: 'field' | 'planning' | 'campaign' | 'media' | 'structure';
  requiresWrite: boolean;
  supportsFarmContext: boolean;
  supportsPlotContext: boolean;
  supportsCampaignContext: boolean;
};
```

Ejemplo conceptual:

```ts
const actions: ActionDefinition[] = [
  { id: 'work', label: 'Trabajo', route: '/actions/work', ... },
  { id: 'task', label: 'Tarea', route: '/actions/task', ... },
  { id: 'irrigation', label: 'Riego', route: '/actions/irrigation', ... },
];
```

El Centro de acciones renderiza este registro y aplica permisos/contexto.

Añadir una acción futura debe consistir principalmente en:

1. registrar una nueva definición;
2. implementar/reutilizar su formulario;
3. añadir contratos/API si realmente son necesarios;
4. añadir tests.

No modificar el bottom nav.

## 11. Permisos

- viewer: puede ver módulos e históricos permitidos, pero no registrar;
- roles con escritura: muestran acciones compatibles;
- no ofrecer un botón que terminará inevitablemente en 403 cuando el permiso ya se conoce;
- si el permiso cambia durante la sesión, el backend sigue siendo autoridad.

## 12. Retorno después de guardar

Después de una acción guardada correctamente:

```text
Riego guardado
Parcela Norte · 4 h

[ Ver registro ]
[ Añadir otro ]
[ Volver ]
```

Al volver:

- refrescar resumen del módulo;
- refrescar cronología relevante;
- mantener posición/navegación razonable;
- no mandar siempre a Inicio.

## 13. Offline

Las acciones que ya soporten outbox deben mantenerlo.

El Centro de acciones no debe prometer offline a operaciones que necesiten red obligatoria, como verificación Catastro o subida de archivos si todavía no existe cola binaria segura.

Mostrar claramente el estado antes de que el usuario complete el formulario cuando sea posible.

## 14. Accesibilidad

- WCAG 2.2 AA;
- foco inicial coherente;
- botón cerrar accesible;
- orden de lectura igual al visual;
- targets amplios;
- icono siempre acompañado de texto;
- no depender del color;
- teclado y touch.

## 15. Invariantes

1. `+` siempre significa **añadir/registrar**.
2. `Mi Campo` siempre significa **consultar/gestionar**.
3. Una operación tiene un único formulario real.
4. Los módulos especializados muestran resumen + alta + histórico.
5. Cuaderno agrega; no duplica.
6. El contexto de finca/parcela se hereda cuando existe.
7. La barra inferior no crece al añadir nuevas capacidades.
8. Catastro/SIGPAC no se mezclan con este Centro de acciones salvo la acción estructural `Finca/parcela`.

## 16. Flujo mental final

```text
QUIERO SABER QUÉ PASA
-> Inicio / Mi Campo / módulo

QUIERO AÑADIR ALGO
-> +
-> elegir acción
-> contexto automático
-> formulario breve
-> guardar
-> resumen/histórico actualizado
```

Frase objetivo:

> `Miro mi campo donde toca; para apuntar algo, pulso +.`
