# Mágina Olivo — Backlog de implementación UX V3

Fecha: 2026-09-08
Estado: plan de ejecución post-staging
Base de referencia: V11 `063767560fe824c3415f200e0314dc5b2e8f4122`

> Este backlog convierte la arquitectura UX V3 en PRs pequeños, revisables y reversibles.

## 1. Regla de ejecución

No implementar UX V3 como una convergencia gigante.

Cada PR debe:
- tener un alcance único;
- preservar contratos existentes cuando sea posible;
- añadir/ajustar tests;
- documentar cualquier desviación;
- no modificar el candidato V11;
- poder revertirse sin arrastrar todo V3.

## 2. Secuencia recomendada

```text
UX3-00 Documentación
UX3-01 Shell y navegación
UX3-02 Mi Campo
UX3-03 Ficha de parcela
UX3-04 Quick Actions globales
UX3-05 Inicio inteligente
UX3-06 Campaña
UX3-07 Más
UX3-08 Público/privado
UX3-09 Estados y accesibilidad
UX3-10 Limpieza y convergencia final
```

## UX3-00 — Documentación

### Alcance
- arquitectura V3;
- mapa de migración;
- mapa maestro de funciones;
- wireframes;
- estados/aceptación;
- brief Codex;
- backlog.

### No tocar
- código runtime;
- migraciones;
- staging V11.

### DoD
Toda persona/Codex puede responder dónde vive cada función sin inventar una nueva pestaña.

## UX3-01 — Shell y navegación

### Objetivo
Pasar conceptualmente a:

```text
Inicio | Mi Campo | + | Campaña | Más
```

### Trabajo
- separar `Mágina` como tab privado principal;
- convertir el `+` central en trigger global, todavía puede abrir placeholders de acciones no migradas;
- renombrar/normalizar `Mi Mágina` -> `Más`;
- conservar sesión, selección de holding y comportamiento de foco;
- no cambiar contratos API.

### Tests
- navegación por teclado;
- `aria-current`;
- foco tras cambio de sección;
- móvil estrecho;
- sesión/offline cold start sin regresión.

### No hacer
No rediseñar todavía contenido profundo de Campo/Campaña.

## UX3-02 — Mi Campo

### Objetivo
Mapa + lista como entrada principal al campo.

### Trabajo
- crear `FieldHub` o equivalente;
- reutilizar `PlotMapPanel`/primitives existentes;
- tarjetas simples de parcela;
- seleccionar parcela desde mapa o lista;
- CTA `Añadir parcelas`;
- empty/loading/error/offline.

### Invariantes
- alternativa accesible al mapa;
- datos privados autorizados;
- mapa caído no inutiliza lista;
- no mostrar Catastro/SIGPAC como módulos principales.

### DoD
Abrir una parcela desde Mi Campo en <=2 interacciones desde la entrada.

## UX3-03 — Ficha de parcela

### Objetivo
Convertir parcela en objeto central de trabajo.

### Secciones
- Resumen;
- Actividad;
- Cosecha;
- Datos;
- Documentos.

### Trabajo
- cabecera + superficie/localidad;
- mapa/ortofoto;
- indicadores clima/RAIF/campaña;
- tarjeta `Mágina recomienda` preparada para datos reales/placeholder seguro;
- CTA `+ Registrar`;
- timeline reciente;
- mover Catastro/SIGPAC a Datos.

### No hacer
No inventar recomendaciones agronómicas si no existe motor/regla verificable.

## UX3-04 — Quick Actions

### Objetivo
Un único patrón de escritura.

### Acciones
- Trabajo;
- Entrega;
- Observación/incidencia;
- Tarea;
- Documento/foto.

### Trabajo
- `QuickActionSheet` global;
- contexto de parcela heredado;
- formularios progresivos;
- preservar componentes/lógica existentes de labores y entregas;
- conservar contenido tras error;
- integrar outbox donde ya aplique.

### DoD
- labor simple <45 s objetivo piloto;
- entrega normal <30 s objetivo piloto;
- no pedir dos veces parcela/fecha si ya se conoce.

## UX3-05 — Inicio inteligente

### Objetivo
Responder `¿Qué tengo que saber hoy?`

### Trabajo
- `TodaySummary` o equivalente;
- priorización de avisos;
- resumen clima;
- resumen campaña;
- actividad reciente;
- estados sin avisos/sin campaña/sin parcelas;
- no bloquear página por fuentes externas secundarias.

### Regla
Máximo 1 recomendación dominante + pocos avisos prioritarios; evitar dashboard de 20 KPIs.

## UX3-06 — Campaña

### Objetivo
Simplificar sin perder entregas, rendimientos, documentos e histórico.

### Trabajo
- cabecera campaña;
- kilos/entregas/rendimiento;
- CTA Entrega;
- evolución simple;
- origen/cooperativas/costes/documentos;
- lista entregas;
- pendientes de rendimiento.

### Invariantes
- entrega sin parcela válida;
- rendimiento pendiente != 0;
- media ponderada determinista;
- conservar trazabilidad documental/importación.

## UX3-07 — Más

### Objetivo
Agrupar funciones secundarias sin lista caótica.

### Grupos
`Trabajo`, `Mi explotación`, `Cuenta`.

### Incluir
- calendario/tareas;
- documentos;
- centro de avisos;
- informes;
- costes;
- importar;
- cooperativas favoritas;
- familia/cuadrilla futura;
- Mágina IA;
- Mis Aceitunas;
- perfil/preferencias/privacidad/exportación.

### Regla
Capacidades futuras pueden aparecer como feature flag, pero no como enlaces muertos.

## UX3-08 — Convergencia público/privado

### Objetivo
Separar claramente Mágina pública de Mi Mágina privada.

### Público
- Tiempo;
- Mercado;
- Noticias;
- Eventos/Ayudas;
- RAIF;
- Directorio;
- Cerca de ti;
- Contacto/legal.

### Privado
- Inicio;
- Mi Campo;
- +;
- Campaña;
- Más.

### Trabajo
- eliminar duplicidad de `MaginaPrivateHub` como destino principal;
- conservar rutas públicas;
- enlaces contextuales desde privado;
- no exigir login a contenido público.

## UX3-09 — Estados, accesibilidad y offline

### Objetivo
Cerrar todos los casos no felices.

### Trabajo
- matriz de estados según `UX_V3_STATES_AND_ACCEPTANCE.md`;
- pruebas teclado/foco;
- mensajes offline/cache;
- sincronización pendiente;
- error parcial de fuentes externas;
- mapa con lista equivalente;
- reduced motion;
- targets táctiles.

### DoD
No existen pantallas que se queden solo con spinner/error genérico cuando un módulo secundario falla.

## UX3-10 — Limpieza y convergencia final

### Objetivo
Eliminar duplicaciones temporales creadas durante la migración.

### Trabajo
- componentes antiguos ya sustituidos;
- imports muertos;
- estilos duplicados;
- tabs/rutas legacy;
- documentación final;
- smoke tests completos;
- comparación funcional contra V11.

### Regla
Antes de eliminar una pieza V11, demostrar dónde quedó su capacidad equivalente.

## 3. Plantilla obligatoria de PR UX3

```markdown
## UX3-XX — título

### Objetivo
...

### Base
ref/sha

### Cambios incluidos
- ...

### Fuera de alcance
- ...

### Capacidades V11 preservadas
- ...

### Estados probados
- loading
- empty
- error
- offline

### Accesibilidad
- teclado/foco
- móvil estrecho
- labels/aria

### Tests
- ...

### Riesgo / rollback
- ...

### Documentación
- ...
```

## 4. Orden de dependencia

```text
UX3-01
  ├─ UX3-02
  │    └─ UX3-03
  │          └─ UX3-04
  ├─ UX3-05 (puede avanzar tras shell + contratos)
  ├─ UX3-06
  └─ UX3-07

UX3-08 cuando shell público/privado esté claro
UX3-09 transversal + cierre
UX3-10 último
```

## 5. Política de ramas

Sugerencia:

```text
feat/ux3-shell
feat/ux3-field-hub
feat/ux3-plot-detail
feat/ux3-quick-actions
feat/ux3-home
feat/ux3-campaign
feat/ux3-more
feat/ux3-public-private
fix/ux3-a11y-...
```

No crear una rama eterna `feat/ux3-everything`.

## 6. Gate antes de empezar código V3

Antes de iniciar UX3-01:
- staging V11 debe estar cerrado/autorizado según proceso operativo vigente;
- base de implementación debe declararse por SHA;
- PRs existentes de convergencia visual deben revisarse para evitar duplicidad/conflicto;
- decidir si se reaprovechan o se cierran antes de crear nuevas ramas.

## 7. Criterio de éxito

V3 no se considera exitosa por tener un diseño más bonito.

Debe lograr:
- menos decisiones por tarea;
- menos navegación;
- mismo o mayor alcance funcional;
- contexto persistente de parcela;
- escrituras rápidas;
- público accesible sin cuenta;
- robustez offline/error;
- trazabilidad intacta;
- arquitectura que permita añadir funciones sin añadir pestañas.
