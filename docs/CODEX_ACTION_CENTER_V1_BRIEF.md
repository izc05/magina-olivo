# Codex Brief — Centro de acciones V1

Fecha: 2026-09-08  
Estado: brief de ejecución post-staging  
Documento de producto obligatorio: `docs/design/ACTION_CENTER_V1.md`

## 1. Objetivo

Implementar el botón central `+` como Centro de acciones escalable de Mágina Olivo.

No usar `+` como alias de Campaña ni como acceso directo fijo a una sola función.

Regla de producto:

```text
Mi Campo = consultar / gestionar
+        = añadir / registrar
```

## 2. Lectura obligatoria

1. `AGENTS.md`
2. `docs/design/MI_CAMPO_UX_V4.md`
3. `docs/design/ACTION_CENTER_V1.md`
4. `docs/CODEX_MI_CAMPO_UX_V4_BRIEF.md`
5. `docs/V1_LABOR_CATALOG.md`
6. `docs/OFFLINE_SYNC_SPEC.md`
7. `docs/DESIGN_SYSTEM_V1.md`
8. documentación específica del módulo que se esté conectando.

## 3. No tocar V11 directamente

Referencia congelada:

```text
staging/candidate-v11-2026-09-05
063767560fe824c3415f200e0314dc5b2e8f4122
```

Crear rama funcional dedicada cuando se autorice código, por ejemplo:

```text
feat/action-center-v1
```

No mezclar en la misma PR cambios de Catastro, media, riego admin o esquema de campaña salvo dependencia mínima demostrada.

## 4. Shell objetivo

La barra inferior debe evolucionar hacia:

```text
Inicio | Mi Campo | + | Campaña | Más
```

El botón `+` abre una pantalla/modal full-screen accesible con un grid de acciones.

Primer nivel V1:

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

No meter subtipos de labor como 20 iconos de primer nivel.

## 5. Registry de acciones

Implementar una definición declarativa, no una cascada de condicionales en `App.tsx`.

Contrato orientativo:

```ts
type ActionDefinition = {
  id: string;
  label: string;
  icon: ReactNode | string;
  route: string;
  category: 'field' | 'planning' | 'campaign' | 'media' | 'structure';
  requiresWrite: boolean;
  supportsFarmContext: boolean;
  supportsPlotContext: boolean;
  supportsCampaignContext: boolean;
};
```

El registro debe ser fácil de ampliar sin modificar la navegación inferior.

## 6. Contexto

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

Reglas:

- desde parcela: preseleccionar `farmId + plotId`;
- desde finca: preseleccionar `farmId` y permitir toda la finca o parcelas;
- desde Inicio: pedir contexto solo cuando la acción lo necesite;
- limpiar contexto obsoleto al cambiar de entidad;
- backend sigue siendo autoridad de permisos y pertenencia.

## 7. Una acción, un formulario

No crear formularios paralelos.

Ejemplo obligatorio:

```text
Mi Campo -> Riegos -> + Registrar riego
```

Y:

```text
+ -> Riego
```

renderizan/reutilizan el mismo formulario real.

Lo mismo para Tareas, Jornales, Tratamientos, Entregas, etc.

Extraer lógica existente cuando sea necesario en lugar de copiar componentes.

## 8. Módulos especializados

Cada módulo debe converger al patrón:

```text
Header
Summary
PrimaryAddAction
RelevantOrPending
RecentRecords
HistoryLink / filters
```

No hacer páginas largas con formulario permanente arriba y resumen debajo.

## 9. Cuaderno

`Cuaderno` debe consumir/agregar los registros existentes.

No crear otra tabla de eventos duplicada solo para construir una cronología.

Reutilizar timeline/contratos existentes y ampliarlos de forma compatible cuando haga falta.

## 10. Riego

El Centro de acciones solo conecta la acción `Riego`.

Los datos de configuración de parcela/red/sector y el futuro Admin de alertas son trabajo relacionado pero separable.

Preparar el formulario para recibir contexto:

- holding;
- finca;
- parcela;
- configuración de red/sector si existe.

No registrar automáticamente un riego porque llegue una notificación administrativa.

## 11. Permisos

El registry puede filtrar/deshabilitar acciones según permiso conocido en cliente para mejorar UX.

El backend siempre vuelve a validar.

Viewer no debe tener acciones de escritura operativas.

## 12. Navegación y retorno

Guardar `returnTo` razonable.

Después de guardar:

- mostrar confirmación;
- permitir `Ver registro`;
- permitir `Añadir otro` cuando tenga sentido;
- volver al módulo/finca/parcela de origen;
- refrescar datos afectados.

No redirigir sistemáticamente a Inicio.

## 13. Offline

Reutilizar `outbox` donde ya exista soporte.

No fingir soporte offline en:

- verificación Catastro;
- operaciones que el backend actual requiera online;
- archivos binarios si no hay una cola segura implementada.

Mostrar estado claro.

## 14. Accesibilidad

- WCAG 2.2 AA;
- grid navegable por teclado;
- icono + label textual;
- foco al abrir/cerrar;
- escape/back coherente;
- targets táctiles grandes;
- 320 px y Android como gates mínimos.

## 15. Estrategia recomendada de PR

### PR A — Action Center shell

- reemplazar comportamiento actual de `+`;
- registry;
- overlay/ruta;
- contexto y retorno;
- permisos básicos;
- sin cambiar APIs.

### PR B — Conectar acciones existentes

Conectar una por una y verificar que se reutiliza el mismo formulario:

- Entrega;
- Tarea;
- Trabajo;
- Observación/documento según estado real del repositorio.

### PR C — Módulos nuevos/refactor

- Riego;
- Tratamiento;
- Jornal;
- Maquinaria;

Solo cuando sus contratos de datos estén definidos y probados.

No crear pantallas de mentira sin persistencia real.

## 16. Tests mínimos

- abrir/cerrar `+`;
- 320 px;
- teclado/touch;
- viewer vs writer;
- contexto desde Inicio;
- contexto desde finca;
- contexto desde parcela;
- cambiar contexto manualmente;
- guardar y volver;
- no reutilizar contexto obsoleto;
- misma acción desde módulo y desde `+` llega al mismo formulario;
- offline compatible con cada acción;
- no romper bottom nav;
- no romper deep links.

## 17. Definición de terminado

Una persona debe poder hacer:

```text
Parcela Norte
-> +
-> Riego
-> parcela ya seleccionada
-> completar
-> guardar
-> volver a Parcela Norte
-> ver el nuevo registro
```

Y también:

```text
Inicio
-> +
-> Tarea
-> elegir finca/parcela
-> guardar
-> abrir Tareas
-> verla en el resumen/histórico
```

sin duplicación de formularios ni navegación confusa.

Frase objetivo:

> `Para añadir cualquier cosa a mi campo, pulso +.`
