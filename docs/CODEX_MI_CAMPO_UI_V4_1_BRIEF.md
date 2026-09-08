# Codex Brief — Mi Campo UI V4.1 «Campo Claro»

Fecha: 2026-09-08  
Estado: ejecución post-staging  
Producto obligatorio: `docs/design/MI_CAMPO_UX_V4.md`  
Visual obligatorio: `docs/design/MI_CAMPO_UI_V4_1_CAMPO_CLARO.md`  
Pantallas obligatorias: `docs/design/MI_CAMPO_SCREEN_CONTRACTS_V4_1.md`

---

## 1. Objetivo

Implementar la capa visual y de interacción V4.1 sobre la arquitectura Mi Campo V4 sin perder capacidades existentes.

Resultado esperado:

```text
Mi Campo = consultar / entender / gestionar
+        = añadir / registrar
Finca    = identidad + agrupación
Parcela  = centro operativo diario
Mapa     = territorio / Catastro / SIGPAC
```

La UI debe sentirse más clara, menos decorativa y más usable en campo.

---

## 2. Precedencia documental

Para navegación/función:

1. `MI_CAMPO_UX_V4.md`
2. documentos específicos Catastro/Action Center V4
3. V3/V1 cuando no contradigan V4

Para visual:

1. `MI_CAMPO_UI_V4_1_CAMPO_CLARO.md`
2. `MI_CAMPO_SCREEN_CONTRACTS_V4_1.md`
3. `DESIGN_SYSTEM_V1.md`
4. imágenes conceptuales solo como referencia secundaria

Si una imagen contradice estos documentos, **manda el documento**.

---

## 3. No tocar staging candidate

No modificar:

```text
staging/candidate-v11-2026-09-05
```

Trabajar en ramas funcionales posteriores y PRs pequeñas.

---

## 4. Inspección obligatoria antes de crear código

Antes de implementar, localizar y reutilizar:

- shell/navegación móvil actual;
- `FieldTab` / `FieldNotebook`;
- mapas y GIS existentes;
- `PlotMapEditor`;
- `CatastroParcelPanel`;
- `SigpacRecintoPanel`;
- `ParcelSourceComparisonPanel`;
- APIs de finca/parcela;
- timeline/labores;
- tareas si existen;
- campañas/entregas;
- documentos privados;
- offline/outbox;
- componentes/button/card/input/icon ya existentes.

No duplicar provider, endpoint, store o formulario sin demostrar que el existente no sirve.

---

## 5. Primer trabajo: shell y tokens

Crear/adaptar componentes de diseño reutilizables antes de maquetar diez pantallas distintas.

Objetivo conceptual:

```text
PrivateAppShell
BottomNavigation
ContextBar
PageHeader
IdentityHero
SummaryStrip
PrimaryAction
StatusBadge
RecentList
EmptyState
OfflineState
ActionCenter
```

Centralizar tokens, no hardcodear colores/radios/spacing pantalla a pantalla.

### Barra inferior

Única:

```text
Inicio | Mi Campo | + | Campaña | Más
```

Eliminar visualmente variantes privadas anteriores cuando se migre cada ruta.

---

## 6. Tipografía

No copiar serif de los mockups en todo el producto.

- UI/formularios/listas/botones: Inter/system.
- serif solo en nombres/títulos de identidad cuando el sistema final disponga de ella de forma estable.
- si la serif no está resuelta en el repo, usar temporalmente la tipografía de UI antes que cargar una fuente improvisada.

No añadir archivos de fuente de terceros sin revisión/licencia.

---

## 7. Iconos

Elegir una familia lineal ya instalada si existe.

Si existen varias bibliotecas, normalizar a una sola para V4.1.

No usar emoji final.

Crear mapping central por concepto:

```text
work
task
irrigation
treatment
worker
machine
delivery
observation
document
farm
plot
map
campaign
```

No importar iconos distintos ad hoc por pantalla.

---

## 8. Implementación por PR

### PR A — Campo Claro foundation

- tokens/variables;
- shell;
- barra inferior única;
- iconografía normalizada;
- componentes base;
- estados comunes;
- no cambiar lógica de negocio.

### PR B — Mi Campo + Fincas/Parcelas

- índice Mi Campo;
- `Fincas y parcelas`;
- navegación a finca/parcela;
- fotos/minis si existen;
- sin megaformulario.

### PR C — Finca + Parcela

- identity hero;
- resumen finca;
- resumen parcela;
- tabs Actividad/Cosecha/Datos/Documentos;
- contexto para `+`.

### PR D — Centro de acciones

- abrir desde botón central;
- acciones configuradas;
- contexto heredado;
- formularios existentes reutilizados.

### PR E — Tareas / Riegos / Tratamientos

Aplicar patrón universal:

```text
resumen -> CTA -> relevante -> últimos -> historial
```

No repetir hero fotográfico.

### PR F — Jornales / Maquinaria / Cuaderno

- resumen;
- altas;
- timeline unificado;
- sin duplicar registro de labores.

### PR G — Mapa/Catastro

- mapa protagonista;
- GPS/ref/polígono;
- bottom sheet;
- capas;
- verificación server-side.

### PR H — Admin alertas de riego

Solo después de tener modelo de riego en parcela estable.

- crear alerta;
- resolver destinatarios;
- preview;
- confirmación;
- auditoría;
- preferencias de usuario.

---

## 9. Modelo de riego

Antes de migrar DB, inspeccionar esquema real.

Necesidades de producto:

```text
parcela tiene riego sí/no
tipo de riego
nombre de red/comunidad
sector
días habituales
avisos activados
```

No crear tablas duplicadas si datos equivalentes ya existen.

La combinación `red/comunidad + sector` debe ser normalizable para poder segmentar avisos admin.

No usar texto libre sin normalización para destinatarios automáticos si eso hace imposible emparejar `Virgen de 4` con variantes ortográficas.

Propuesta técnica a estudiar:

- catálogo de redes/comunidades administrable;
- id estable de red;
- sectores asociados;
- parcela referencia `network_id + sector_id`;
- label humano separado del id.

No implementar a ciegas: revisar necesidades del dominio y datos actuales primero.

---

## 10. Acción contextual

Definir un contrato compartido para lanzar altas:

```ts
type ActionContext = {
  holdingId?: string;
  farmId?: string;
  plotId?: string;
  campaignId?: string;
};
```

Si la navegación conoce el contexto, preseleccionar.

No persistir accidentalmente un contexto anterior al crear otra entidad.

Al cambiar contexto, validar permisos y pertenencia al holding.

---

## 11. No duplicar formularios

Ejemplo obligatorio:

```text
Mi Campo -> Riegos -> Registrar riego
```

y

```text
+ -> Riego
```

usan el **mismo componente/formulario**.

Lo mismo para:

- Tarea;
- Tratamiento;
- Jornal;
- Entrega;
- Observación;
- Documento;
- Finca/parcela.

---

## 12. Carga visual

Máximo recomendado por dashboard/módulo:

- 1 resumen principal;
- 1 CTA;
- 1 bloque relevante;
- 3–5 registros recientes;
- `Ver todos`.

No renderizar 20 elementos porque existan en API.

Historial completo vive en pantalla/lista propia con paginación o carga incremental.

---

## 13. Fotografías

Usar foto grande solo en Finca/Parcela.

No añadir fotos decorativas de Bedmar en Tareas/Riegos/Jornales.

Si no existe cover:

- fallback neutro;
- acción para añadir foto;
- no usar stock genérico.

Reutilizar private storage/documentos actual.

---

## 14. Offline

No degradar outbox ni sincronización existente.

Mostrar explícitamente:

```text
Sin conexión
Guardado pendiente de sincronizar
```

Map First/Catastro puede necesitar red.

Datos privados ya cacheados deben seguir consultables según política actual.

Uploads de archivos no deben fingirse como completados si el backend no los ha recibido.

---

## 15. Rendimiento

Objetivo móvil Android medio.

- lazy load para módulos secundarios;
- no cargar mapa pesado en Mi Campo si el usuario no entra a Mapa;
- thumbnails optimizadas;
- evitar re-render global al abrir Action Center;
- listas virtualizadas solo si el volumen lo justifica;
- no incluir grandes imágenes sin tamaño/compresión adecuados.

---

## 16. Accesibilidad

Gates obligatorios:

- 320 px;
- teclado;
- focus visible;
- labels reales;
- target >= 44 px, preferencia 48+;
- contraste AA;
- reduced motion;
- no depender de color;
- mapa con alternativa lista;
- modal/sheet con focus trap correcto;
- botón atrás/cerrar predecible.

---

## 17. Pruebas de aceptación por flujo

### Finca/parcela

```text
Mi Campo -> Fincas y parcelas -> Finca -> Parcela -> volver
```

### Centro +

```text
Parcela Norte -> + -> Riego
```

Debe abrir con Parcela Norte preseleccionada.

### Tarea global

```text
Inicio -> + -> Tarea -> elegir otra finca/parcela -> guardar
```

### Catastro GPS

```text
Parcela -> Vincular -> Estoy en la finca -> GPS -> seleccionar -> servidor verifica -> guardar
```

### Catastro manual

```text
Parcela -> Vincular -> Buscar manualmente -> RC/polígono -> confirmar -> guardar
```

### Riego admin

```text
Admin -> red -> sector -> fecha/hora -> preview destinatarios -> confirmar -> auditoría
```

---

## 18. Estados de prueba obligatorios

Probar cada nueva pantalla con:

```text
0 datos
1 dato
muchos datos
loading
error
offline
permiso insuficiente
dato antiguo
fuente externa caída
```

---

## 19. Visual QA

Antes de aceptar una PR:

- comprobar que no aparecen dos barras inferiores distintas;
- comprobar que solo hay un CTA primario por pantalla;
- comprobar que módulos de gestión no tienen hero fotográfico innecesario;
- comprobar que no se han inventado nuevos colores;
- comprobar iconografía coherente;
- comprobar que títulos no desbordan a 320 px;
- comprobar Android Chrome/PWA;
- comprobar contraste al aire libre simulando brillo alto.

---

## 20. Definición de terminado V4.1

V4.1 está lista cuando una persona puede:

```text
abrir Mi Campo
-> reconocer su finca
-> abrir una parcela
-> ver estado y riego
-> pulsar +
-> registrar una acción
-> verla en el módulo correspondiente
-> verla también en el Cuaderno
```

sin encontrarse formularios duplicados ni navegación distinta entre módulos.

Control final:

> **Más campo. Menos interfaz.**
