# Mágina Olivo — Mapa de migración UX V11 -> V3

Fecha: 2026-09-08
Estado: **plan de convergencia post-staging**
Base congelada analizada: `063767560fe824c3415f200e0314dc5b2e8f4122` (V11)

> Objetivo: indicar a Codex qué piezas existentes deben conservarse, converger, reubicarse o envolverse dentro de la arquitectura V3, evitando reescrituras innecesarias.

---

## 1. Regla general

No interpretar V3 como “tirar V11 y empezar de cero”.

La estrategia es:

```text
V11 estable
  -> conservar lógica y contratos
  -> extraer/reutilizar componentes
  -> converger navegación
  -> introducir contexto de parcela
  -> simplificar flujos
  -> añadir tests
```

Preferir refactor incremental a reescritura masiva.

---

## 2. Estado actual relevante de V11

La aplicación privada usa conceptualmente:

```text
home | field | campaign | magina | more
```

La barra actual dispone de:

```text
Inicio | Mi Campo | + (Campaña) | Mágina | Mi Mágina
```

V3 propone:

```text
Inicio | Mi Campo | + global/contextual | Campaña | Más
```

La lógica pública de Mágina no desaparece; deja de competir como destino principal dentro del espacio privado.

---

## 3. Tabla maestra de convergencia

| Pieza V11 | Función actual | Destino V3 | Acción recomendada |
|---|---|---|---|
| `App.tsx` | shell, sesión, tabs, carga core | shell V3 | refactor incremental; separar routing/state por dominio |
| `HomeTab` dentro de `App.tsx` | dashboard privado | `Inicio` | rehacer jerarquía visual, conservar datos y callbacks |
| `FieldTab` dentro de `App.tsx` | fincas/parcelas | `Mi Campo` | convertir en hub mapa/lista + selección de parcela |
| `CampaignTab` dentro de `App.tsx` | campaña/entregas | `Campaña` | conservar, reorganizar métricas/acciones |
| `MaginaPrivateHub.tsx` | acceso privado a Mágina pública | fuera de nav privada / accesos contextuales | desmontar como tab principal; reutilizar enlaces/contenido |
| `MoreTab` dentro de `App.tsx` | cuenta/secundarios | `Más` | ampliar como hub secundario estructurado |
| `PlotMapEditor.tsx` | mapa/edición/parcelas | `Mi Campo` y alta Map First | reutilizar lógica; separar modo consulta vs alta/edición |
| `PlotMapPanel.tsx` | contenedor mapa | parcela/Mi Campo | reutilizar como primitive visual |
| `CatastroParcelPanel.tsx` | consulta Catastro | `Añadir parcelas` / `Datos` | dejar de ser módulo visible aislado cuando sea posible |
| `SigpacRecintoPanel.tsx` | consulta SIGPAC | `Añadir parcelas` / `Datos` | integrar como capa/contexto |
| `ParcelSourceComparisonPanel.tsx` | comparar fuentes | `Datos de parcela` avanzado | conservar trazabilidad, ocultar del primer nivel |
| `FieldNotebook.tsx` | cuaderno/labores | `Actividad` + `+ Trabajo` | reutilizar lógica; dividir consulta vs captura rápida |
| `DeliveryEntryCard.tsx` | entrega | `+ Entrega` y `Campaña` | convertir en formulario contextual reutilizable |
| `CampaignDocuments.tsx` | documentos campaña | `Campaña > Documentos` | conservar y adaptar estilo/navegación |
| `CalendarPage.tsx` | calendario/tareas | `Más > Calendario`, Inicio y parcela | mantener página completa y crear vistas compactas contextuales |
| `NoticeCenter.tsx` | avisos | Inicio + `Más > Centro de avisos` | convertir en fuente común de tarjetas priorizadas |
| `PilotAlerts.tsx` | alertas piloto | motor/soporte de Inicio | revisar duplicidad con NoticeCenter antes de exponer UI |
| `MaginaFieldAlertsPage.tsx` | alertas públicas/campo | Mágina pública + contexto de parcela | mantener público; extraer resumen contextual privado |
| `MaginaWeatherPage.tsx` | tiempo público/detallado | público `Tiempo` | mantener página detallada; no duplicarla dentro de parcela |
| `WeatherRainAlertSummary.tsx` | lluvia resumida | Inicio/parcela | excelente candidato a tarjeta contextual |
| `MaginaMarketPage.tsx` | mercado | Mágina pública | mantener público; resumen opcional en Inicio sin dominar |
| `MaginaNewsPage.tsx` | noticias | Mágina pública | mantener público |
| `MaginaDirectoryPage.tsx` | directorio | Mágina pública | mantener público |
| `AccountPage.tsx` | cuenta/preferencias | `Más > Mi cuenta` | conservar |
| `ConnectivityStatus.tsx` | estado conexión | global | conservar siempre visible cuando sea relevante |
| `OfflineColdStart.tsx` | arranque offline | global/PWA | conservar |
| `PwaUpdatePrompt.tsx` | actualización PWA | global | conservar política de outbox |
| `OnboardingPage.tsx` | alta inicial | onboarding V3 | simplificar y conectar con Map First |
| `RegisterPage.tsx` | registro | acceso/registro de cuenta | no confundir con botón global `+ Registrar` |

---

## 4. Reorganización recomendada de `App.tsx`

V11 concentra demasiada responsabilidad en `App.tsx`.

V3 debería tender gradualmente a:

```text
apps/web/src/
  app/
    AppShell.tsx
    PrivateNavigation.tsx
    PublicNavigation.tsx
    routes.ts

  features/
    home/
    field/
    parcel/
    quick-action/
    campaign/
    tasks/
    documents/
    notices/
    weather/
    raif/
    public-magina/
    account/
```

No realizar este movimiento completo en un solo PR.

Orden seguro:

1. extraer componentes visuales sin cambiar comportamiento;
2. introducir nueva navegación;
3. migrar cada tab a feature;
4. eliminar código muerto al final.

---

## 5. `Inicio` V11 -> V3

### Conservar

- explotación activa;
- campaña activa;
- resumen de campaña;
- mecanismos de carga existentes;
- errores y estados de sesión;
- conectividad/offline.

### Reorganizar

Pasar de resumen general a prioridad diaria:

```text
1. recomendación principal
2. alertas relevantes
3. tareas próximas
4. campaña resumida
5. actividad reciente
```

### No duplicar

No implementar una segunda fuente de:

- alertas;
- tareas;
- clima;
- campaña.

Crear adaptadores/view-models que compongan datos existentes.

---

## 6. `Mi Campo` V11 -> V3

### Objetivo

Transformar `FieldTab` en una vista espacial y contextual.

### Primer nivel

```text
Mi Campo
[Mapa] [Lista]

parcelas con estado
+ Añadir parcela
```

### Segundo nivel

```text
Parcela
  Resumen
  Actividad
  Cosecha
  Datos
  Documentos
```

### Jerarquía de datos

El modelo `Holding -> Farm -> Plot` se conserva.

La navegación no tiene por qué exigir atravesar los tres niveles.

Se puede resolver selección con:

- explotación activa global;
- finca como agrupación/filtro;
- parcela como unidad de trabajo principal.

---

## 7. Catastro/SIGPAC V11 -> V3

### Backend existente a preservar

Conservar contratos y validaciones existentes alrededor de:

- Catastro client/routes;
- SIGPAC client/routes;
- geometría de parcelas;
- procedencia de perímetro;
- referencias catastrales;
- aislamiento por holding.

### UI

No mostrar al agricultor un “módulo Catastro” y otro “módulo SIGPAC” como flujo normal.

Convergencia:

```text
Añadir parcela
  -> Buscar
  -> Mapa
  -> capas Catastro/SIGPAC
  -> seleccionar
  -> validar
  -> completar datos
```

En una parcela ya creada:

```text
Datos
  -> Referencias y fuentes
  -> Catastro
  -> SIGPAC
  -> procedencia
```

---

## 8. `FieldNotebook` V11 -> `Actividad` + `+ Trabajo`

Separar dos intenciones actualmente cercanas:

### Consulta

`Parcela > Actividad`

- timeline;
- filtros;
- detalle;
- edición/corrección.

### Captura

`+ > Trabajo`

- tipo;
- parcela/contexto;
- fecha;
- esenciales;
- detalles opcionales.

Ambas deben reutilizar el mismo modelo/API de actividad.

No crear una segunda entidad “trabajo V3”.

---

## 9. `DeliveryEntryCard` V11 -> `+ Entrega`

Mantener semántica actual:

- kilos;
- fecha;
- cooperativa;
- origen opcional;
- ticket;
- rendimiento posterior.

Cambiar envoltorio UX:

```text
+ Registrar
 -> Entrega
 -> formulario rápido
 -> guardar
 -> opciones posteriores
```

En Campaña, permitir botón prominente `Nueva entrega` que abra exactamente el mismo flujo.

No mantener dos formularios independientes.

---

## 10. Campaña V11 -> V3

### Conservar

- campaign API;
- summary API;
- deliveries;
- results;
- exportación;
- documentos.

### Reordenar UI

Primer viewport:

- kilos;
- rendimiento;
- entregas;
- pendientes;
- acción nueva entrega.

Segundo nivel:

- entregas;
- rendimiento;
- origen;
- costes;
- documentos;
- informe.

---

## 11. `MaginaPrivateHub` V11 -> convergencia pública/privada

No eliminar el contenido público.

Eliminar únicamente la necesidad de una pestaña privada dedicada si la misma información está disponible en la parte pública.

Patrón V3:

```text
Público
  Tiempo
  Mercado
  Noticias
  RAIF
  Directorio

Privado
  Inicio recibe resúmenes relevantes
  Parcela recibe contexto relevante
  Más enlaza a vistas detalladas cuando haga falta
```

Evitar copiar la página pública completa dentro de la zona privada.

---

## 12. Avisos V11 -> centro común

Revisar solapamiento funcional entre:

- `NoticeCenter.tsx`;
- `PilotAlerts.tsx`;
- `MaginaFieldAlertsPage.tsx`;
- `WeatherRainAlertSummary.tsx`;
- alertas de worker/backend.

Objetivo técnico:

crear una capa/view-model de presentación común, no necesariamente una nueva tabla.

Contrato conceptual UI:

```ts
type UiNotice = {
  id: string;
  category: 'weather' | 'field' | 'campaign' | 'cooperative' | 'raif' | 'system';
  severity: 'info' | 'important' | 'urgent';
  title: string;
  message: string;
  plotId?: string;
  dueAt?: string;
  sourceLabel?: string;
  sourceDate?: string;
  action?: ...;
};
```

No persistir esta forma si basta con adaptarla desde modelos existentes.

---

## 13. Calendario V11 -> uso contextual

`CalendarPage.tsx` se conserva como vista completa.

Añadir componentes resumidos reutilizables:

- `UpcomingTasksCard` para Inicio;
- `ParcelTasks` para parcela;
- `QuickTaskForm` para `+`.

Todos consumen las mismas task routes.

---

## 14. Documentos V11 -> captura contextual

Conservar APIs y almacenamiento privado.

La UI debe permitir añadir documento desde:

- parcela;
- actividad;
- entrega;
- campaña;
- botón `+`.

La biblioteca global sigue existiendo en `Más`.

No duplicar archivos físicos para cada relación.

---

## 15. CSS V11 -> design system V3

V11 tiene múltiples hojas de estilo por módulo y por convergencias previas.

No realizar una limpieza total de CSS antes de que V3 funcione.

Estrategia:

### Fase A

Crear tokens/primitives nuevos compatibles con V11.

### Fase B

Migrar pantallas V3 a componentes comunes.

### Fase C

Detectar CSS huérfano con búsqueda/tests.

### Fase D

Eliminar únicamente reglas verificadas como no usadas.

Evitar una PR que combine:

- nueva navegación;
- cambio visual completo;
- renombrado de archivos;
- eliminación masiva de CSS.

---

## 16. APIs que V3 NO debe romper por defecto

La reorganización es inicialmente frontend/UX.

Preservar, salvo justificación explícita:

- auth/session;
- holdings;
- farms;
- plots;
- activities;
- tasks;
- campaigns;
- deliveries/results;
- documents;
- weather;
- rain alerts;
- public news/market/directory/RAIF;
- Catastro/SIGPAC;
- account export/preferences.

Si una pantalla V3 necesita composición de datos, preferir:

1. llamadas existentes en paralelo;
2. view-model frontend;
3. endpoint de agregación nuevo solo si existe beneficio medible.

---

## 17. Modelo de datos

No cambiar por estética.

Conservar:

```text
Holding
  -> Farm
      -> Plot

Campaign
  -> Delivery
      -> Result

Activity
Task
Document
```

V3 puede cambiar el modelo mental del usuario sin cambiar el modelo relacional.

---

## 18. Offline

Puntos a no romper durante migración:

- outbox;
- operaciones pendientes;
- sincronización idempotente;
- cold start offline;
- bloqueo seguro de actualización PWA cuando corresponde;
- feedback de guardado pendiente.

Todo nuevo Quick Action debe documentar explícitamente si:

- funciona offline;
- queda en outbox;
- necesita red;
- puede reintentarse sin duplicar.

---

## 19. Accesibilidad

Antes de retirar una UI vieja, comprobar que la nueva mantiene:

- orden de foco;
- `aria-current` en navegación;
- labels de inputs;
- feedback de errores;
- teclado;
- target táctil;
- no depender solo de mapas;
- alternativa en lista;
- actualización PWA accesible.

No considerar “más visual” sinónimo de “solo iconos”.

---

## 20. Ruta de implementación por PRs

### UX3-0 — documentación y contratos

- documentos V3;
- sin código de producción;
- definir tests de aceptación.

### UX3-1 — shell y navegación

- nueva barra privada;
- mantener tabs/páginas existentes detrás;
- `+` abre Quick Action Sheet;
- sin migrar aún lógica compleja.

### UX3-2 — Mi Campo hub

- mapa/lista;
- ParcelCard;
- selección de parcela;
- reutilizar PlotMap.

### UX3-3 — Parcela V3

- resumen;
- actividad;
- cosecha;
- datos;
- documentos;
- contexto clima/RAIF.

### UX3-4 — Quick Actions

- trabajo;
- entrega;
- observación;
- tarea;
- documento.

### UX3-5 — Inicio accionable

- alertas priorizadas;
- tareas;
- clima;
- campaña;
- actividad reciente.

### UX3-6 — Campaña V3

- KPIs;
- entregas;
- rendimientos;
- origen;
- documentos;
- informe.

### UX3-7 — Más / convergencia secundaria

- calendario;
- documentos;
- cooperativas;
- avisos;
- cuenta;
- imports;
- informes.

### UX3-8 — público/privado

- retirar `Mágina` como tab privado;
- mantener páginas públicas;
- deep links/contexto.

### UX3-9 — limpieza controlada

- código muerto;
- CSS huérfano;
- duplicidades;
- documentación final.

---

## 21. Reglas de cada PR

Cada PR debe:

- declarar alcance único;
- no mezclar backend si no es necesario;
- mantener tests existentes;
- añadir tests de la nueva navegación/flujo;
- incluir capturas o evidencia visual cuando cambie UI;
- comprobar 320 px móvil;
- comprobar teclado;
- comprobar offline si afecta escritura;
- actualizar documentación si cambia una decisión.

No fusionar una serie incompleta solo porque “se ve mejor”.

---

## 22. Criterios de aceptación por bloque

### Shell

- cinco destinos privados;
- `+` accesible;
- navegación por teclado;
- estado activo claro;
- sesión/offline intactos.

### Mi Campo

- mapa y lista muestran mismas parcelas;
- abrir parcela <= 2 toques;
- añadir parcela visible;
- no obliga a atravesar finca.

### Parcela

- muestra estado/contexto;
- puede registrar acción;
- permite acceder a actividad/cosecha/datos/documentos;
- fuentes oficiales identificables.

### Quick Action

- una sola implementación por tipo;
- contexto preseleccionado;
- campos opcionales plegados;
- feedback de guardado;
- offline documentado.

### Inicio

- no más de tres alertas prioritarias iniciales;
- tarea principal entendible;
- campaña resumida;
- no dominado por noticias/mercado.

### Campaña

- kilos/rendimiento/entregas visibles;
- nueva entrega rápida;
- pendientes claros;
- informe accesible.

---

## 23. Señales de que la migración va mal

Parar y revisar si ocurre cualquiera de estas:

- aparecen más de cinco destinos principales;
- se duplica un formulario de entrega/labor;
- Catastro y SIGPAC vuelven a ser menús principales aislados;
- el usuario necesita saber qué es `holding` o una relación interna;
- Inicio exige navegar para descubrir un aviso urgente;
- la parcela pierde contexto de clima/RAIF;
- un refactor visual obliga a migrar base de datos sin razón funcional;
- se rompe offline;
- una nueva UI solo funciona con ratón;
- se elimina una capacidad existente sin sustitución/documentación.

---

## 24. Archivos que Codex debe leer antes de tocar UX V3

Orden mínimo:

1. `AGENTS.md`
2. `MASTER_PLAN.md`
3. `docs/design/UX_INFORMATION_ARCHITECTURE_V3.md`
4. `docs/design/UX_V3_MIGRATION_MAP.md`
5. `docs/CODEX_UX_V3_BRIEF.md`
6. `docs/design/PARCEL_MAP_FIRST_V1.md`
7. `docs/OFFLINE_SYNC_SPEC.md`
8. `docs/DESIGN_SYSTEM_V1.md`
9. `docs/mvp/ACCESSIBILITY_GATE_V1.md`
10. código del área concreta a modificar.

No implementar UX V3 leyendo únicamente `V1_SCREEN_MAP.md`; queda como base funcional/histórica.
