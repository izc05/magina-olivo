# Antigravity Implementation Brief — Mágina Olivo · Mi Campo V4/V4.1

Fecha: 2026-09-08
Estado: implementación post-staging
Rama documental de referencia: `docs/mi-campo-ux-v4-2026-09-08`

## 1. Misión

Implementar la nueva experiencia `Mi Campo` respetando dos capas de especificación:

- **V4 = arquitectura funcional y flujo**
- **V4.1 Campo Claro = lenguaje visual y contratos de pantalla**

La meta no es rehacer el producto desde cero. La meta es reorganizar y reutilizar las capacidades existentes para que una persona pueda:

```text
entrar -> ver sus fincas/parcelas -> abrir una parcela -> consultar mapa/Catastro -> registrar algo -> verlo en histórico
```

sin enfrentarse a paneles técnicos ni formularios gigantes.

## 2. Lectura obligatoria antes de tocar código

Leer, en este orden:

1. `AGENTS.md`
2. `MASTER_PLAN.md`
3. `docs/design/MI_CAMPO_UX_V4.md`
4. `docs/design/MI_CAMPO_UI_V4_1_CAMPO_CLARO.md`
5. `docs/design/MI_CAMPO_SCREEN_CONTRACTS_V4_1.md`
6. `docs/design/ACTION_CENTER_V1.md`
7. `docs/design/CATASTRO_LINK_EXISTING_PLOT_V1.md`
8. `docs/design/PARCEL_MAP_FIRST_V1.md`
9. `docs/CODEX_MI_CAMPO_UX_V4_BRIEF.md`
10. `docs/CODEX_MI_CAMPO_UI_V4_1_BRIEF.md`
11. `docs/OFFLINE_SYNC_SPEC.md`
12. `docs/DESIGN_SYSTEM_V1.md`
13. `docs/V1_LABOR_CATALOG.md`
14. documentación GIS/Catastro/SIGPAC vigente

Si una maqueta visual contradice estos documentos, manda la documentación.

## 3. Reglas de producto no negociables

### Navegación privada

```text
[ Inicio ] [ Mi Campo ] [ + ] [ Campaña ] [ Más ]
```

No introducir variantes tipo `Descubre`, `Perfil` o `Mágina` dentro de esta barra.

### Modelo de datos

```text
Holding / explotación
  -> Finca
      -> Parcela
```

Pero no convertir esa jerarquía en una navegación obligatoria.

Accesos válidos:

```text
Mi Campo -> Parcela
Mi Campo -> Finca -> Parcela
Inicio -> aviso -> Parcela
Tarea -> Parcela
```

### Centro de acciones

El botón `+` abre un centro de acciones configurable.

Acciones iniciales:

- Trabajo
- Tarea
- Riego
- Tratamiento
- Jornal
- Maquinaria
- Entrega
- Observación
- Documento
- Finca/parcela

Cada acción reutiliza un único formulario. Ejemplo:

```text
Mi Campo -> Riegos -> Registrar
+
  -> Riego
```

deben terminar en el mismo componente/formulario.

### Contexto

Si el usuario abre el `+` desde una parcela, preseleccionar finca/parcela.

Si lo abre desde una finca, permitir finca completa o selección múltiple de parcelas.

Si lo abre sin contexto, pedir finca/parcela cuando sea necesario.

## 4. Arquitectura visual V4.1 Campo Claro

Principio:

> Más campo. Menos interfaz.

### Tres familias de pantalla

1. **Identidad** — Finca / Parcela
   - foto real protagonista
   - resumen territorial
   - acciones claras

2. **Gestión** — Tareas / Riegos / Tratamientos / Jornales
   - sin fotografía hero grande
   - resumen
   - una CTA principal
   - relevante ahora
   - últimos registros
   - historial

3. **Territorio** — Mapa / Catastro / SIGPAC
   - mapa protagonista
   - controles mínimos
   - panel inferior contextual

### Tipografía

- Titulares editoriales solo donde aporten identidad.
- UI operativa siempre con Inter/system stack.
- KPIs con cifras tabulares.

### Color

- Verde: acción/normal
- Azul: agua/mapa/información
- Dorado: campaña/atención
- Rojo tierra: error/alerta real

No usar color solo como decoración.

### Tarjetas

Reducir cajas anidadas.
Preferir espacio, bordes finos y superficies limpias.
Sombras muy sutiles.

### Fotografía

Usar foto grande solo en Finca/Parcela o cuando la identidad territorial lo justifique.
No decorar Tareas/Riegos/Jornales con headers fotográficos repetidos.

## 5. Pantallas a implementar

### A. Mi Campo

- resumen: fincas, parcelas, superficie
- acceso principal `Fincas y parcelas`
- acceso `Mapa y lindes`
- accesos gestión: Cuaderno, Tareas, Riegos, Tratamientos, Jornales y maquinaria
- Campaña
- barra inferior fija

No convertir la portada en una lista infinita de KPIs.

### B. Fincas y parcelas

- búsqueda
- resumen agregado
- grupos por finca
- foto de finca
- parcelas desplegables
- estado breve
- Catastro vinculado
- fotos
- `Añadir parcelas`

### C. Finca

- foto principal
- nombre/localización
- superficie/parcelas/olivos/campaña
- parcelas
- actividad reciente
- estado general
- resumen campaña
- CTA contextual

### D. Parcela

- foto principal
- ver mapa
- vincular Catastro si procede
- superficie/olivos/variedad/riego
- bloque de riego si aplica
- recomendación contextual
- tabs: Actividad / Cosecha / Datos / Documentos
- CTA `Registrar`

### E. Mapa y lindes

- búsqueda por municipio / referencia / polígono-parcela
- entradas: Mapa / GPS / Ref. catastral / Polígono-parcela
- capas Catastro / SIGPAC / ortofoto
- selección de geometría
- panel inferior de parcela
- validación server-side antes de persistir

### F. Centro de acciones

- pantalla/capa clara
- iconos grandes
- contexto actual visible
- capacidad de cambiar contexto
- máximo 10 acciones principales en V1

### G. Tareas

Patrón:

```text
Resumen
Nueva tarea
Hoy
Próximas
Completadas recientemente
Historial
```

### H. Riegos

Patrón:

```text
Sistema/red/sector activo
Próximo riego
Registrar riego
Últimos riegos
Configuración
Avisos
```

Datos mínimos de riego:

- tipo de riego
- comunidad/red
- sector
- días habituales
- avisos activados

### I. Tratamientos

- resumen
- registrar tratamiento
- pendientes / seguridad cuando proceda
- últimos tratamientos
- histórico

No inventar autorizaciones de producto.

### J. Jornales y maquinaria

- resumen mensual
- añadir jornal
- registrar maquinaria
- últimos registros
- equipos recientes
- QR cuando exista soporte real

### K. Cuaderno

No duplicar formularios.
Debe ser timeline unificado de:

- trabajos
- riegos
- tratamientos
- jornales
- observaciones
- entregas/documentos vinculados cuando proceda

### L. Campaña

- kilos
- entregas
- rendimiento
- origen
- documentos
- histórico/comparación

## 6. Catastro — parcela existente

Desde `Parcela > Vincular con Catastro` ofrecer:

1. `Estoy en la finca` → GPS
2. `Buscar manualmente` → referencia / polígono-parcela / mover mapa

Nunca usar GPS como prueba de propiedad.
Nunca afirmar titularidad.

Si la superficie declarada y Catastro difieren, mostrar ambas y pedir confirmación antes de sustituir.

## 7. Alta Map First

No crear primero una parcela vacía.

Flujo:

```text
Añadir parcelas
-> localizar/buscar
-> seleccionar geometría oficial
-> validar servidor
-> asignar/crear finca
-> foto recomendada
-> datos agrícolas mínimos
-> guardar
```

## 8. Riego y futuras alertas de administración

Preparar el modelo UI para una futura capa Admin:

```text
Red/comunidad -> sector -> fecha/hora -> destinatarios coincidentes -> push
```

No emparejar destinatarios por texto libre si se puede evitar.
Preparar un modelo con IDs estables para red/comunidad y sector.

No implementar envíos masivos sin permisos, auditoría y confirmación explícita.

## 9. Reutilización obligatoria

Antes de crear código nuevo, inspeccionar y reutilizar:

- `PlotMapEditor.tsx`
- `PlotMapPanel.tsx`
- `CatastroParcelPanel.tsx`
- `SigpacRecintoPanel.tsx`
- `ParcelSourceComparisonPanel.tsx`
- `FieldNotebook.tsx`
- APIs de documentos
- almacenamiento privado
- outbox/offline
- timeline existente
- entregas/campañas existentes

No duplicar providers, endpoints ni timelines sin justificarlo.

## 10. Estrategia de ramas / PR

No hacer un mega-PR.

Sugerencia:

```text
feat/mi-campo-v4-shell
feat/mi-campo-v4-field-hub
feat/mi-campo-v4-farm-hub
feat/mi-campo-v4-parcel-hub
feat/mi-campo-v4-action-center
feat/mi-campo-v4-management-modules
feat/mi-campo-v4-map-first
feat/mi-campo-v4-media
feat/mi-campo-v4-irrigation-admin-foundation
```

Cada PR debe:

- explicar alcance
- listar reutilización
- incluir screenshots
- incluir tests
- declarar deuda restante

## 11. Estados obligatorios

Toda pantalla debe contemplar:

- loading
- vacío
- error
- offline
- permisos
- dato antiguo
- fuente externa caída
- acción pendiente de sincronización

## 12. Accesibilidad

Objetivo WCAG 2.2 AA.

- targets grandes
- foco visible
- labels reales
- contraste
- no depender solo de color
- teclado
- reflow 320 px
- lista equivalente al mapa

## 13. Gates mínimos

Antes de abrir PR:

- lint
- typecheck
- tests unitarios relevantes
- tests de integración existentes
- no regresión Catastro/SIGPAC
- no regresión offline
- no regresión documentos
- no regresión campañas/entregas
- smoke mobile 320/360/390/430 px

## 14. Definición de terminado

Una persona nueva debe poder completar sin ayuda:

```text
Entrar
-> Mi Campo
-> abrir Fincas y parcelas
-> abrir Parcela Norte
-> ver mapa
-> vincular con Catastro o consultar perímetro
-> pulsar +
-> registrar riego/tarea/trabajo
-> guardar
-> ver el registro en el módulo y en Cuaderno
```

## 15. Entrega a Codex

Antigravity no debe dar el trabajo por aceptado.

Al terminar cada PR:

1. ejecutar tests
2. adjuntar screenshots
3. resumir decisiones
4. declarar riesgos
5. dejar el PR listo para revisión independiente por Codex

Codex será el gate de aceptación técnica/UX antes de integrar.
