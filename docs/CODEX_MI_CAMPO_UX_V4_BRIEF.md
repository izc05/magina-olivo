# Codex Brief — Mi Campo UX V4

Fecha: 2026-09-08  
Estado: **brief de ejecución post-staging**  
Documento de producto obligatorio: `docs/design/MI_CAMPO_UX_V4.md`

---

## 1. Objetivo

Reorganizar `Mi Campo` para convertirlo en el centro espacial y operativo de Mágina Olivo, sin perder ninguna capacidad ya disponible.

La experiencia final debe permitir:

```text
ver campo -> abrir finca/parcela -> entender estado -> registrar -> consultar histórico
```

No construir un ERP ni exponer la arquitectura técnica al agricultor.

---

## 2. Base y seguridad de ramas

Referencia funcional congelada:

```text
staging/candidate-v11-2026-09-05
063767560fe824c3415f200e0314dc5b2e8f4122
```

### Prohibido

- modificar esa rama;
- reescribirla;
- usarla como rama de trabajo;
- mezclar toda V4 en una sola PR.

Cuando se autorice código, partir de la base aprobada del momento y crear ramas pequeñas, por ejemplo:

```text
feat/mi-campo-v4-shell
feat/mi-campo-v4-parcel
feat/mi-campo-v4-farm
feat/mi-campo-v4-quick-actions
feat/mi-campo-v4-map-first
feat/mi-campo-v4-media
```

---

## 3. Lectura obligatoria antes de tocar código

En este orden:

1. `AGENTS.md`
2. `MASTER_PLAN.md`
3. `docs/design/MI_CAMPO_UX_V4.md`
4. `docs/design/UX_INFORMATION_ARCHITECTURE_V3.md`
5. `docs/design/PARCEL_MAP_FIRST_V1.md`
6. `docs/CODEX_UX_V3_BRIEF.md`
7. `docs/OFFLINE_SYNC_SPEC.md`
8. `docs/DESIGN_SYSTEM_V1.md`
9. `docs/V1_LABOR_CATALOG.md`
10. `docs/mvp/ACCESSIBILITY_GATE_V1.md`
11. documentación específica de Catastro/SIGPAC/mapa afectada.

Si existe contradicción de navegación entre V1 y V4, V4 manda para la evolución post-staging, pero los invariantes funcionales/seguridad de V1 siguen vigentes.

---

## 4. Diagnóstico del código actual

La implementación actual de `FieldTab` concentra demasiadas responsabilidades en una sola ruta visual:

```text
Fincas
+ Crear finca
Parcelas
+ Crear parcela
FieldNotebook
  -> mapa
  -> comparación de fuentes
  -> SIGPAC
  -> Catastro
  -> formulario de labor
  -> KPIs
  -> timeline
```

No borrar esas capacidades. **Separarlas por intención del usuario.**

`PlotMapPanel` actualmente encadena varias herramientas GIS. No conservar ese patrón en el flujo diario V4.

---

## 5. Arquitectura de pantalla objetivo

### Navegación privada

```text
Inicio | Mi Campo | + | Campaña | Más
```

### Mi Campo

Componentes mínimos:

```text
FieldHubPage
  ContextHeader
  Map/List segmented control
  FieldMap
  FieldList
    FarmGroup
      ParcelCard
  AddParcelsAction
```

No montar formularios completos de finca/parcela/labor directamente debajo.

### Finca

```text
FarmPage
  CoverPhoto
  FarmSummary
  FarmMap
  ParcelList
  RecentActivity
  MultiParcelWorkAction
```

### Parcela

```text
ParcelPage
  ParcelHeader
  CoverPhoto / map access
  TodaySummary
    Weather
    RAIF
    Campaign
  AttentionCard
  + Register
  RecentActivity
  Activity | Harvest | Data | Documents
```

---

## 6. Regla de jerarquía

Datos:

```text
Holding -> Farm -> Plot
```

UX:

```text
Mi Campo -> Plot
Mi Campo -> Farm -> Plot
Inicio/Task/Alert -> Plot
```

No introducir `Holding -> Farm -> Plot` como recorrido obligatorio.

Ocultar el término técnico `holding` al usuario salvo que un nombre equivalente de producto sea necesario para elegir entre varias explotaciones.

---

## 7. Quick Action Sheet

Crear una acción central contextual:

```text
¿Qué quieres registrar?

Trabajo
Entrega
Observación
Tarea
Foto / documento
```

Contrato de contexto conceptual:

```ts
type WorkContext = {
  holdingId?: string;
  farmId?: string;
  plotId?: string;
  campaignId?: string;
};
```

Reglas:

- preseleccionar contexto conocido;
- permitir cambiarlo cuando sea válido;
- no persistir accidentalmente un contexto en otro registro;
- no crear un megaformulario condicional único;
- cada acción usa su formulario específico.

---

## 8. Formularios de trabajo

Mantener catálogo existente y formulario progresivo.

Primer nivel:

- tipo;
- finca/parcela;
- fecha/hora;
- descripción corta si procede.

Segundo nivel plegable:

```text
Más detalles
```

Producto, dosis/cantidad, superficie, coste, maquinaria, fotos, notas, etc. según tipo.

No recordar silenciosamente valores peligrosos como dosis o productos fitosanitarios.

Objetivo: labor simple <= 30-45 s.

---

## 9. Map First — implementación obligatoria para nuevas parcelas

No volver a:

```text
crear parcela vacía
-> meter coordenadas
-> abrir mapa
-> buscar Catastro alrededor
```

Implementar:

```text
Mi Campo
-> Añadir parcelas
-> localizar/buscar
-> seleccionar geometría oficial
-> validar servidor
-> asignar/crear finca
-> datos agrícolas mínimos
-> guardar
```

Entradas:

- mapa;
- GPS;
- referencia catastral;
- municipio + polígono + parcela.

### Reutilización

Inspeccionar antes de crear código nuevo:

- `PlotMapEditor.tsx`;
- `CatastroParcelPanel.tsx`;
- `SigpacRecintoPanel.tsx`;
- `ParcelSourceComparisonPanel.tsx`;
- Catastro API/client actual;
- SIGPAC API/client actual;
- validación de geometría actual.

Extraer la lógica útil hacia un selector Map First si es necesario; no duplicar providers ni endpoints sin comprobar qué existe.

### Autoridad

El navegador nunca es autoridad sobre geometría oficial.

El servidor debe volver a validar antes de persistir.

---

## 10. Catastro y SIGPAC en V4

### Mi Campo diario

No mostrar paneles técnicos completos.

### Parcela > Datos

Mostrar resumen:

```text
Perímetro: Catastro
Referencia: ...
Verificado: fecha
SIGPAC: N recintos
[Ver fuentes]
```

### Añadir parcelas

Aquí sí usar el GIS completo.

Mantener:

- Catastro y SIGPAC independientes;
- una parcela de trabajo puede tener N recintos SIGPAC;
- no acreditar propiedad;
- procedencia visible;
- anti-duplicado.

---

## 11. Foto principal de finca/parcela

No crear otro almacenamiento.

Mágina ya tiene:

- documentos privados;
- `documentType = photo`;
- private storage;
- `document_links`.

Antes de cambiar esquema, revisar migraciones y usos reales.

Objetivo de producto:

```text
Farm -> cover photo + gallery
Plot -> cover photo + gallery
Activity/Observation -> evidence photos
```

La evolución puede requerir ampliar relaciones genéricas y/o introducir semántica de vínculo (`cover`, `attachment`, `evidence`). Si requiere migración DB, aislarla en una PR funcional de media, no mezclarla con layout.

### No fingir offline

El upload actual necesita red. Hasta que exista una cola de archivos segura:

- permitir omitir foto;
- indicar claramente que necesita conexión;
- no mostrar `subida` hasta recibir confirmación real del servidor.

---

## 12. Finca

No eliminar entidad `farm`.

Debe permitir:

- agrupar parcelas;
- foto principal;
- mapa conjunto;
- superficie/resumen;
- actividad reciente;
- trabajo multiparcela;
- documentos relacionados.

Pero no ser paso obligatorio para abrir una parcela desde `Mi Campo`.

---

## 13. Actividad / timeline

Reutilizar el timeline existente de parcela.

Mover su presentación hacia `ParcelPage > Activity`.

Debe reunir según contratos existentes:

- labores;
- observaciones;
- entregas asociadas cuando proceda;
- rendimientos;
- tareas/hitos cuando se integren.

No duplicar los mismos datos en una segunda cronología independiente.

---

## 14. Estados obligatorios

Toda pantalla/refactor V4 necesita:

- loading;
- vacío;
- error;
- offline;
- dato antiguo cuando proceda;
- permisos;
- duplicado de parcela;
- fuente externa caída.

Ejemplo Catastro:

```text
Catastro no responde ahora.
Tus parcelas guardadas siguen disponibles.
[Reintentar]
```

No bloquear `Mi Campo` porque una fuente oficial externa falle.

---

## 15. Accesibilidad

Objetivo WCAG 2.2 AA.

Obligatorio:

- 320 px;
- Android/touch;
- teclado;
- foco visible;
- target táctil amplio;
- labels reales;
- no depender solo de color;
- lista equivalente al mapa;
- navegación atrás coherente;
- mensajes de estado anunciables.

---

## 16. Offline

Conservar `outbox` y políticas existentes.

No degradar:

- creación de operaciones ya soportadas offline;
- sincronización;
- detección de pendientes al cerrar sesión;
- protección de datos privados locales.

Map First necesita red para verificar fuentes oficiales.

Parcelas ya guardadas sí deben poder consultarse desde datos cacheados según la política vigente.

---

## 17. Estrategia de PRs

### PR 1 — Field Hub

Objetivo único:

- reemplazar visualmente la página larga de `Mi Campo` por mapa/lista;
- conservar llamadas existentes;
- abrir entidades por navegación interna/deep-link compatible.

No modificar DB.

### PR 2 — Parcel Hub

- ficha parcela;
- resumen;
- actividad;
- cosecha;
- datos;
- documentos;
- extraer/reutilizar timeline.

No implementar Map First todavía.

### PR 3 — Farm Hub

- resumen finca;
- sus parcelas;
- mapa conjunto;
- trabajo multiparcela usando contratos existentes o evolución mínima bien probada.

### PR 4 — Quick Actions

- sheet contextual;
- formularios separados;
- contexto preseleccionado.

### PR 5 — Map First

- selector GIS;
- multiselección;
- validación server-side;
- asignación posterior a finca;
- anti-duplicado;
- accesibilidad mapa/lista.

### PR 6 — Media

- foto de finca/parcela;
- vínculo privado;
- cover/gallery;
- permisos y errores.

### PR 7 — Convergencia

- retirar componentes/paneles de la ruta diaria solo después de demostrar que sus funciones están accesibles en las nuevas rutas;
- limpiar estilos huérfanos;
- regresión completa.

---

## 18. Pruebas mínimas por fase

### Field Hub

- 0/1/N fincas;
- 0/1/N parcelas;
- mapa/lista sincronizados;
- abrir parcela desde mapa;
- abrir parcela desde lista;
- varias explotaciones.

### Parcel Hub

- timeline;
- campaña inexistente/activa;
- sin RAIF/weather;
- offline;
- fuente antigua.

### Map First

- RC 14/18/20;
- búsqueda polígono/parcela;
- GPS denegado;
- Catastro 0/1/N;
- selección múltiple;
- duplicado;
- SIGPAC 1:N;
- PNOA caído;
- servidor no verifica;
- volver atrás sin perder selección local razonable.

### Media

- JPG/PNG/WEBP;
- límite de tamaño;
- permiso viewer;
- fallo storage;
- desconexión;
- cambiar cover;
- acceso cruzado entre holdings prohibido.

---

## 19. Gates de regresión

Ejecutar todos los gates existentes relevantes del repositorio.

No aceptar una pantalla bonita si rompe:

- aislamiento de usuario/holding;
- offline;
- campañas/entregas;
- timeline;
- Catastro/SIGPAC;
- documentos;
- accesibilidad;
- PWA.

---

## 20. Definición de terminado

La convergencia de `Mi Campo` termina cuando una persona que no conoce el sistema puede completar:

```text
Entrar
-> Mi Campo
-> localizar parcela en Catastro
-> seleccionarla
-> crear/asignar finca
-> guardar
-> ver parcela en mapa
-> abrir parcela
-> + Registrar trabajo
-> guardar
-> ver trabajo en actividad
```

sin ayuda y sin pasar por paneles técnicos.

La frase objetivo es:

> `Veo mi campo, pulso mi parcela y apunto lo que he hecho.`
