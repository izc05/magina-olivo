# Codex Brief — Mi Campo UX V4

Fecha: 2026-09-08  
Estado: **brief de ejecución post-staging**  
Documento de producto obligatorio: `docs/design/MI_CAMPO_UX_V4.md`

> **ACTUALIZACIÓN VISUAL OBLIGATORIA V4.1 — CAMPO CLARO**  
> Antes de tocar UI, Codex debe leer `docs/design/MI_CAMPO_UI_V4_1_CAMPO_CLARO.md`, `docs/design/MI_CAMPO_SCREEN_CONTRACTS_V4_1.md` y `docs/CODEX_MI_CAMPO_UI_V4_1_BRIEF.md`.  
> V4 sigue mandando en arquitectura funcional. V4.1 manda en presentación visual, patrón de pantallas, barra inferior, tipografía, densidad, iconografía y consistencia. Las imágenes generadas son referencia conceptual, nunca especificación pixel-perfect.

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
4. `docs/design/MI_CAMPO_UI_V4_1_CAMPO_CLARO.md`
5. `docs/design/MI_CAMPO_SCREEN_CONTRACTS_V4_1.md`
6. `docs/CODEX_MI_CAMPO_UI_V4_1_BRIEF.md`
7. `docs/design/ACTION_CENTER_V1.md`
8. `docs/design/CATASTRO_LINK_EXISTING_PLOT_V1.md`
9. `docs/design/UX_INFORMATION_ARCHITECTURE_V3.md`
10. `docs/design/PARCEL_MAP_FIRST_V1.md`
11. `docs/CODEX_UX_V3_BRIEF.md`
12. `docs/OFFLINE_SYNC_SPEC.md`
13. `docs/DESIGN_SYSTEM_V1.md`
14. `docs/V1_LABOR_CATALOG.md`
15. `docs/mvp/ACCESSIBILITY_GATE_V1.md`
16. documentación específica de Catastro/SIGPAC/mapa afectada.

Si existe contradicción de navegación entre V1/V3 y V4, V4 manda para la evolución post-staging, pero los invariantes funcionales/seguridad de V1 siguen vigentes.

Si existe contradicción visual entre mockups previos y V4.1, **V4.1 manda**.

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

Esta barra es única en V4.1. No alternar con variantes `Mágina`, `Descubre`, `Perfil` o `Cooperativas` de prototipos anteriores.

### Mi Campo

Debe evolucionar hacia un índice operativo claro, no una página larga de formularios. Consultar `MI_CAMPO_SCREEN_CONTRACTS_V4_1.md` para el orden exacto de módulos.

### Finca

```text
FarmPage
  IdentityHero / CoverPhoto
  FarmSummary
  ParcelList
  RecentActivity
  Status/Attention
  CampaignSummary
  MultiParcelWorkAction
```

### Parcela

```text
ParcelPage
  IdentityHero / CoverPhoto
  Map/Catastro access
  ParcelSummary
  IrrigationSummary
  AttentionCard
  + Register
  Activity | Harvest | Data | Documents
```

### Módulos de gestión

Tareas, Riegos, Tratamientos y Jornales siguen el mismo patrón:

```text
cabecera compacta
-> contexto
-> resumen
-> CTA primario
-> relevante/pendiente
-> últimos registros
-> historial
```

No repetir una gran fotografía decorativa en esos módulos.

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

## 7. Centro de acciones `+`

El `+` central es un **Centro de acciones**, no Campaña ni una única acción.

Primera versión:

```text
Trabajo
Tarea
Riego
Tratamiento
Jornal
Maquinaria
Entrega
Observación
Documento
Finca/parcela
```

Contrato de contexto conceptual:

```ts
type ActionContext = {
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
- cada acción usa su formulario específico;
- una acción abierta desde su módulo y desde `+` debe usar el mismo componente/formulario.

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

V4.1 exige una sola acción primaria visible por formulario.

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

Para parcelas ya creadas, soportar `Vincular con Catastro` sin recrearlas, según `CATASTRO_LINK_EXISTING_PLOT_V1.md`.

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

### Añadir/vincular parcelas

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

V4.1: foto grande solo en **Finca/Parcela**, no como hero repetido en Tareas/Riegos/Jornales/Tratamientos.

### No fingir offline

El upload actual necesita red. Hasta que exista una cola de archivos segura:

- permitir omitir foto;
- indicar claramente que necesita conexión;
- no mostrar `subida` hasta recibir confirmación real del servidor.

---

## 12. Riego y alertas segmentadas

La ficha de parcela debe poder almacenar, tras inspección del esquema real:

```text
riego sí/no
tipo de riego
red/comunidad de riego
sector
días habituales
preferencia de avisos
```

La solución futura de Admin debe poder enviar una alerta a usuarios/parcelas que coincidan por `red/comunidad + sector`, respetando preferencias y permisos.

Evitar matching frágil por texto libre si se pretende automatizar destinatarios. Estudiar catálogo con IDs estables para red y sector antes de migrar DB.

---

## 13. Actividad / Cuaderno

Reutilizar el timeline existente y evolucionarlo hacia historia unificada.

Debe reunir, según contratos reales:

- labores;
- observaciones;
- tratamientos;
- riegos;
- tareas completadas;
- jornales relacionados;
- entregas asociadas cuando proceda.

No crear cronologías paralelas con datos duplicados.

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

## 15. Visual V4.1 obligatorio

Cumplir `MI_CAMPO_UI_V4_1_CAMPO_CLARO.md`:

- menos decoración vegetal;
- menos cards anidadas;
- fotografía solo cuando identifica territorio;
- UI operativa en Inter/system;
- una sola familia de iconos lineales;
- un CTA primario por pantalla;
- semántica de color estable;
- contexto visible;
- máximo 3–5 registros recientes antes de `Ver todos`;
- botones/targets grandes para exterior;
- no copiar mockups pixel-perfect si dañan accesibilidad o consistencia.

Frase de control:

> **Más campo. Menos interfaz.**

---

## 16. Accesibilidad

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
- mensajes de estado anunciables;
- reduced motion.

---

## 17. Offline

Conservar `outbox` y políticas existentes.

No degradar:

- creación de operaciones ya soportadas offline;
- sincronización;
- detección de pendientes al cerrar sesión;
- protección de datos privados locales.

Map First necesita red para verificar fuentes oficiales.

Parcelas ya guardadas sí deben poder consultarse desde datos cacheados según la política vigente.

---

## 18. Estrategia de PRs

Seguir `CODEX_MI_CAMPO_UI_V4_1_BRIEF.md` para la secuencia visual detallada.

En términos funcionales, mantener PRs pequeñas y separadas para:

1. foundation/shell;
2. Mi Campo + Fincas/Parcelas;
3. Finca + Parcela;
4. Centro de acciones;
5. Tareas/Riegos/Tratamientos;
6. Jornales/Maquinaria/Cuaderno;
7. Map First/Catastro;
8. media/fotos;
9. Admin alertas de riego;
10. convergencia y limpieza.

No mezclar migraciones DB con un simple cambio de layout si puede evitarse.

---

## 19. Pruebas mínimas

### Mi Campo/Finca/Parcela

- 0/1/N fincas;
- 0/1/N parcelas;
- abrir parcela desde lista/mapa/deep-link;
- fotos ausentes/presentes;
- varias explotaciones.

### Centro +

- desde Inicio sin contexto;
- desde Finca;
- desde Parcela;
- cambiar contexto;
- cerrar sin guardar.

### Map First/Catastro

- RC 14/18/20;
- polígono/parcela;
- GPS denegado;
- GPS impreciso;
- Catastro 0/1/N;
- selección múltiple;
- duplicado;
- SIGPAC 1:N;
- PNOA caído;
- servidor no verifica.

### Riegos

- parcela sin riego;
- riego configurado;
- red/sector;
- avisos on/off;
- historial vacío/con datos.

### Media

- JPG/PNG/WEBP;
- límite de tamaño;
- permiso viewer;
- fallo storage;
- desconexión;
- cambiar cover;
- aislamiento entre holdings.

---

## 20. Gates de regresión

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

## 21. Definición de terminado

La convergencia termina cuando una persona que no conoce el sistema puede completar:

```text
Entrar
-> Mi Campo
-> Fincas y parcelas
-> abrir finca/parcela
-> ver foto/datos/riego
-> vincular Catastro por GPS o búsqueda manual
-> pulsar +
-> registrar tarea/riego/trabajo
-> ver el nuevo registro en su módulo
-> verlo también en el Cuaderno
```

sin ayuda, sin formularios duplicados y sin pasar por paneles técnicos innecesarios.

La frase objetivo funcional sigue siendo:

> `Veo mi campo, pulso mi parcela y apunto lo que he hecho.`
