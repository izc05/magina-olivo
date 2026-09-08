# Codex Brief — Mágina Olivo UX V3

Fecha: 2026-09-08
Estado: **brief de ejecución post-staging**
Base funcional analizada: `staging/candidate-v11-2026-09-05` @ `063767560fe824c3415f200e0314dc5b2e8f4122`

---

## 1. Propósito

Este documento indica a Codex cómo evolucionar la interfaz de Mágina Olivo hacia la arquitectura UX V3 sin perder funcionalidad, sin romper contratos existentes y sin contaminar el candidato de staging V11.

No ejecutar cambios de producción de UX V3 mientras el proceso de aceptación de staging vigente siga abierto, salvo trabajo explícitamente autorizado en una rama separada.

---

## 2. Documentos obligatorios antes de modificar código

Leer en este orden:

1. `AGENTS.md`
2. `MASTER_PLAN.md`
3. `docs/design/UX_INFORMATION_ARCHITECTURE_V3.md`
4. `docs/design/UX_V3_MIGRATION_MAP.md`
5. `docs/design/PARCEL_MAP_FIRST_V1.md`
6. `docs/OFFLINE_SYNC_SPEC.md`
7. `docs/DESIGN_SYSTEM_V1.md`
8. `docs/mvp/ACCESSIBILITY_GATE_V1.md`
9. documentación específica del módulo afectado.

`docs/V1_SCREEN_MAP.md` y `docs/V1_WIREFRAMES.md` siguen siendo referencia funcional/histórica, pero la navegación post-staging debe seguir V3.

---

## 3. Invariantes que Codex NO puede romper

### Release/staging

- V11 es referencia congelada para aceptación.
- No reescribir ni mover `staging/candidate-v11-2026-09-05`.
- No utilizar una ref V3 como sustituto silencioso del candidato.
- No fusionar una serie V3 sobre una rama de aceptación hasta que se autorice expresamente.

### Seguridad/privacidad

- aislamiento por usuario/holding en backend;
- no exponer documentos privados;
- no introducir secretos/tokens;
- no registrar URLs sensibles de recuperación;
- no confiar en frontend como autoridad de geometría oficial;
- no presentar Catastro/SIGPAC como prueba de propiedad.

### Offline/PWA

- conservar outbox y sincronización;
- no perder operaciones privadas pendientes;
- respetar política de actualización PWA existente;
- evitar duplicados en reintentos.

### Negocio

- una entrega puede no tener parcela;
- el rendimiento puede llegar después;
- conservar trazabilidad de importaciones/documentos;
- cálculos críticos deterministas;
- RAIF no es diagnóstico de parcela;
- IA no sustituye reglas de negocio.

### Accesibilidad

- WCAG 2.2 AA como objetivo;
- teclado y foco;
- target táctil amplio;
- no usar solo color;
- mapa siempre con alternativa accesible en lista.

---

## 4. Objetivo UX resumido

Transformar la experiencia privada desde:

```text
Inicio | Mi Campo | + Campaña | Mágina | Mi Mágina
```

a:

```text
Inicio | Mi Campo | + | Campaña | Más
```

El botón central `+` debe ser global y contextual:

```text
Trabajo
Entrega
Observación/incidencia
Tarea
Documento/foto
```

`Mi Campo` se convierte en centro de parcela.

La parte pública de Mágina permanece abierta sin cuenta.

---

## 5. Modelo mental obligatorio

No diseñar según módulos internos.

El flujo del agricultor es:

```text
VER
  -> ENTENDER
      -> DECIDIR
          -> ACTUAR
              -> REGISTRAR
                  -> APRENDER
```

El flujo de una parcela es:

```text
Mi Campo
  -> Parcela
      -> Resumen
      -> + Registrar
      -> Actividad
      -> Cosecha
      -> Datos
      -> Documentos
```

---

## 6. Prioridades de implementación

### P0 — preservar comportamiento

Antes de cambiar UX:

- tests actuales verdes;
- identificar rutas/callbacks que ya funcionan;
- no duplicar API calls sin necesidad;
- registrar baseline de navegación móvil.

### P1 — shell V3

Crear:

- navegación inferior V3;
- Quick Action Sheet;
- contexto activo;
- deep-link/estado si ya existe mecanismo compatible.

No migrar aún todos los contenidos.

### P2 — Mi Campo

Crear/recomponer:

- mapa/lista;
- `ParcelCard`;
- estado de parcela;
- abrir parcela;
- añadir parcela Map First.

### P3 — Parcela

Crear pantalla con:

- cabecera/contexto;
- mapa/ortofoto;
- tiempo resumido;
- RAIF resumido;
- campaña resumida;
- recomendación/atención;
- `+ Registrar`;
- actividad reciente;
- tabs/segmentos: Actividad, Cosecha, Datos, Documentos.

### P4 — Quick Actions

Unificar captura para:

- labor;
- entrega;
- observación;
- tarea;
- documento.

### P5 — Inicio

Convertir en panel accionable de hoy.

### P6 — Campaña

Reorganizar KPIs, entregas, rendimientos, origen y documentos.

### P7 — Más

Converger utilidades secundarias.

### P8 — retirar duplicidades

Solo después de pruebas:

- eliminar tab privado Mágina si ya no es necesario;
- eliminar componentes/estilos huérfanos;
- renombrar estructura si aporta claridad.

---

## 7. Estrategia de ramas y PRs

No trabajar directamente sobre `main` ni sobre un candidate de staging.

Cuando se autorice implementación, crear una rama funcional dedicada desde la base aprobada del momento, por ejemplo:

```text
feat/ux-v3-shell
feat/ux-v3-field-hub
feat/ux-v3-parcel
feat/ux-v3-quick-actions
feat/ux-v3-home
feat/ux-v3-campaign
```

Evitar una única rama gigante `feat/ux-v3-all`.

Cada PR debe ser revisable y reversible.

---

## 8. Estructura de componentes recomendada

No es obligatorio mover todo inmediatamente, pero la dirección es:

```text
apps/web/src/
  app/
    AppShell.tsx
    PrivateNavigation.tsx

  components/
    StatusCard.tsx
    MetricTile.tsx
    AlertCard.tsx
    SourceBadge.tsx
    OfflineBadge.tsx
    ContextHeader.tsx

  features/
    home/
    field/
    parcel/
    quick-action/
    campaign/
    tasks/
    documents/
    notices/
    public-magina/
```

No crear abstracciones genéricas prematuras.

Extraer primero componentes que aparezcan realmente en dos o más contextos.

---

## 9. Contrato conceptual del contexto

El botón `+` y los resúmenes deben poder conocer el contexto actual.

Ejemplo conceptual, no prescriptivo:

```ts
type WorkContext = {
  holdingId?: string;
  farmId?: string;
  plotId?: string;
  campaignId?: string;
  cooperativeId?: string;
};
```

Reglas:

- preseleccionar, no bloquear;
- permitir cambiar contexto cuando sea válido;
- no persistir contexto accidentalmente fuera del dato guardado;
- evitar prop drilling excesivo si la arquitectura actual ofrece un mecanismo más sencillo.

---

## 10. Quick Action Sheet — contrato UX

Al abrir `+`:

```text
¿Qué quieres registrar?

Trabajo
Entrega
Observación
Tarea
Documento
```

Si existe contexto:

```text
En Parcela Norte
```

Cada opción abre un formulario específico.

No usar un megaformulario dinámico con decenas de campos.

---

## 11. Formularios progresivos

Patrón:

```text
Campos necesarios
[Guardar]

Detalles opcionales v
```

No esconder un campo obligatorio en una sección plegada.

Recordar valores cuando beneficie claramente:

- última cooperativa;
- campaña activa;
- fecha/hora actual;
- parcela actual.

No recordar silenciosamente valores peligrosos como:

- dosis de tratamiento;
- productos químicos;
- decisiones agronómicas.

---

## 12. Parcel Map First

La implementación de alta debe seguir:

`docs/design/PARCEL_MAP_FIRST_V1.md`.

No volver a un flujo que obligue a:

```text
crear parcela vacía
-> introducir coordenadas
-> editar mapa
```

Preferir:

```text
buscar
-> seleccionar geometría oficial
-> validar en servidor
-> completar datos agrícolas
-> guardar
```

La lista accesible de parcelas visibles/seleccionadas es obligatoria.

---

## 13. Inicio — criterio de ranking

No construir un motor de IA para ordenar Inicio.

Prioridad determinista inicial:

1. alertas urgentes;
2. tareas vencidas;
3. tareas de hoy;
4. lluvia/helada/viento relevante;
5. RAIF relevante;
6. campaña con pendientes;
7. actividad reciente;
8. noticias/mercado como contenido secundario.

Si existen varias alertas, mostrar máximo tres inicialmente y `Ver todas`.

---

## 14. Parcela — fuentes y recomendación

Una recomendación debe poder explicar su origen.

Ejemplo:

```text
Revisar mosca del olivo

Basado en:
- RAIF: aviso de zona, actualizado X
- tiempo: condiciones Y
- última observación registrada Z
```

No generar automáticamente un tratamiento.

Acciones permitidas:

```text
Ver fuente
Crear tarea
Registrar observación
Consultar técnico
```

---

## 15. Errores y estados vacíos

Toda nueva pantalla debe incluir estados:

### Vacío

Ejemplo:

```text
Todavía no has añadido parcelas.
[Buscar mis parcelas]
```

### Error externo

```text
Catastro no responde ahora.
Tus parcelas guardadas siguen disponibles.
[Reintentar]
```

### Offline

```text
Estás sin conexión.
Mostramos los datos guardados en este dispositivo.
```

### Dato antiguo

Mostrar fecha real de actualización.

No inventar un estado `Todo correcto` cuando faltan fuentes.

---

## 16. Testing mínimo por PR

Cada PR UX debe incluir, según alcance:

### Unit/source tests

- navegación;
- ranking de avisos;
- contexto de quick action;
- transformaciones/view-models;
- validación de formulario.

### E2E/manual

- Android/mobile narrow;
- 320 px;
- teclado;
- touch;
- back navigation;
- offline cuando aplique;
- error de API;
- loading;
- empty state.

### Regresión

Ejecutar gates existentes relevantes.

No aceptar como evidencia únicamente una captura bonita.

---

## 17. Definición de terminado de cada PR

Un PR V3 está terminado cuando:

- cumple un único objetivo;
- no rompe flujo anterior no migrado;
- tiene estado loading/empty/error;
- funciona en móvil;
- tiene foco/teclado correctos;
- conserva offline si aplica;
- no duplica lógica de negocio;
- tests pasan;
- documentación queda coherente.

---

## 18. Prohibiciones específicas para Codex

No hacer durante esta evolución salvo instrucción explícita:

- modificar un candidate de staging;
- fusionar automáticamente;
- cambiar esquema DB para acomodar un layout;
- sustituir APIs estables sin migración;
- borrar módulos porque dejen de verse en navegación;
- crear una segunda API para una función ya existente;
- instalar una librería UI grande sin justificarla;
- convertir todos los estilos a otro framework en la misma PR;
- hacer recomendaciones agronómicas concluyentes;
- inventar datos de Catastro/SIGPAC;
- romper el modo offline;
- introducir IA como dependencia obligatoria.

---

## 19. Secuencia de validación completa

Al final de la convergencia V3, probar de extremo a extremo:

```text
PUBLICO
Abrir -> Tiempo -> Noticias/mercado -> Entrar

PRIVADO
Inicio
 -> Mi Campo
 -> Añadir parcela Map First
 -> abrir parcela
 -> + Trabajo
 -> crear tarea
 -> + Entrega
 -> añadir rendimiento
 -> Campaña
 -> Documentos
 -> informe/exportación
 -> offline/sync
```

El recorrido debe ser entendible sin explicar al usuario qué módulos internos existen.

---

## 20. Señal de éxito

La V3 no será mejor por tener menos pantallas, sino cuando el agricultor pueda pensar:

> “Abro Mágina, veo qué pasa en mi olivar, entro en la parcela, registro lo que he hecho y sigo.”

Si una función existente sigue disponible pero cuesta más encontrarla, la migración no está terminada.
