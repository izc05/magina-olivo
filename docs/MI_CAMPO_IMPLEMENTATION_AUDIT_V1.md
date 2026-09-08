# Mi Campo — Auditoría de implementación V1

Fecha: 2026-09-08  
Rama auditada: `feat/visual-v2-public-first-convergence`  
Estado: decisión de arquitectura previa al rediseño

## Objetivo

Convertir Mi Campo en el centro operativo del agricultor siguiendo una única promesa:

> **ver → entender → tocar parcela → actuar**

La jerarquía de datos sigue siendo `Explotación → Finca → Parcela`, pero la navegación no obligará a recorrer tres listados antes de trabajar.

## Evidencia revisada

Se revisaron en staging autenticado las rutas `/mi-campo` y `/mi-campo/mapa`, además de la implementación de `FieldTab`, `FieldNotebook`, `PlotMapPanel`, `PlotMapEditor`, rutas privadas de explotaciones/fincas/parcelas, adapters Catastro/SIGPAC, geometrías, timeline, actividades, documentos, campaña, entregas y la base de loyalty/recompensas.

Capturas inspeccionadas durante esta auditoría:

1. Inicio público: acceso a Mi Campo visible y contexto municipal coherente.
2. Mi Campo: gran hero fotográfico, selector de finca y ocho accesos del mismo peso.
3. Mapa de parcelas vacío: navegación por pasos y dos enlaces cruzados para poder añadir la primera parcela.

## Inventario reutilizable

No se necesita crear un segundo sistema. Ya existen:

- autenticación y autorización por explotación;
- `holdings`, `farms` y `plots` con relaciones reales;
- persistencia de finca activa;
- punto GPS, perímetro, superficie y procedencia de geometría;
- consulta y verificación server-side de Catastro y SIGPAC;
- mapa con capas, PNOA, edición y geolocalización;
- actividades con outbox offline e idempotencia;
- timeline por parcela con labores, entregas y rendimientos;
- campañas, entregas, resultados y documentos privados;
- recursos agrícolas, jornales, maquinaria y QR local;
- ledger, saldo pendiente/disponible, vareo, recompensas y validación de partner.

## Problemas estructurales encontrados

### 1. La portada no cumple la promesa principal

El mapa no es la superficie inicial. Una fotografía ocupa el área protagonista y debajo aparecen ocho destinos con igual jerarquía. El usuario debe decidir qué módulo abrir antes de comprender el estado de su explotación.

### 2. Se mezclan contexto y navegación

La finca activa se conserva, pero cada ruta vuelve a explicar la finca, presenta pasos numerados y añade enlaces de “siguiente”. Trabajar en el campo no es un asistente lineal: mapa, parcela, labor y campaña son accesos contextuales.

### 3. La parcela aún no es una pantalla de trabajo

Actualmente seleccionar una parcela muestra una ficha corta dentro del listado. Falta la URL y ficha estable con `Resumen / Actividad / Cosecha / Datos / Documentos`. Por eso Tratamientos y Riegos necesitan volver a pedir parcela y campaña.

### 4. Alta inicial circular

Con una finca sin parcelas, el mapa indica ir a Parcelas y Parcelas vuelve a abrir herramientas cartográficas. Debe existir una sola entrada `Añadir parcela`, con elección de método dentro del flujo.

### 5. Exceso de tarjetas y formularios visibles

Las tarjetas se usan como contenedor universal. Falta distinguir entre mapa, hoja inferior, ficha, lista cronológica y formulario. Los detalles agronómicos avanzados aparecen demasiado pronto.

### 6. Jerarquía visual inconsistente

Hero, métricas, accesos, pasos, pestañas y barra inferior compiten entre sí. En móvil, la actualización PWA y la acción flotante pueden cubrir datos o acciones.

## Arquitectura de experiencia aprobada

```text
MI CAMPO (mapa vivo)
├── Selector: Todas las fincas / una finca
├── Mapa: parcelas y estados
├── Resumen compacto: superficie, tareas, alertas, campaña
├── Tocar parcela → ficha rápida inferior
│   ├── Abrir parcela
│   └── Registrar
├── Ficha de finca
│   ├── Resumen
│   ├── Parcelas
│   ├── Actividad
│   ├── Campaña
│   └── Documentos
└── Ficha de parcela
    ├── Resumen
    ├── Actividad
    ├── Cosecha
    ├── Datos
    └── Documentos
```

## Comparación útil, sin copiar producto

- OneSoil permite seleccionar límites existentes o dibujar campos directamente sobre el mapa y conserva los campos entre web y móvil.
- AgriWebb sitúa mapa, parcelas y tareas en una misma superficie móvil, recuerda filtros y usa una acción `+` contextual desde el mapa.
- La conclusión aplicable a Mágina Olivo es estructural: mapa como entrada, filtro persistente y acción contextual. La identidad, el lenguaje y el modelo olivarero siguen siendo propios.

## Pantallas y rutas objetivo

| Ruta | Responsabilidad | Acción principal |
|---|---|---|
| `/mi-campo` | Mapa vivo de toda la explotación | Tocar parcela |
| `/mi-campo/fincas/:farmId` | Ficha resumida de una finca | Ver parcelas / registrar |
| `/mi-campo/parcelas/:plotId` | Resumen operativo de parcela | Registrar |
| `/mi-campo/parcelas/:plotId/actividad` | Cronología y filtros | Añadir registro |
| `/mi-campo/parcelas/:plotId/cosecha` | Kilos, rendimiento y entregas | Añadir entrega |
| `/mi-campo/parcelas/:plotId/datos` | Datos agrícolas y fuentes | Editar datos |
| `/mi-campo/parcelas/:plotId/documentos` | Evidencias vinculadas | Añadir documento |
| `/mi-campo/parcelas/nueva` | Alta única GPS/Catastro/SIGPAC | Confirmar parcela |

Las rutas actuales podrán redirigir temporalmente a estas pantallas para no romper enlaces guardados.

## Pantalla principal acordada

1. Cabecera compacta: `Mi Campo`, total de parcelas y hectáreas.
2. Selector de finca y botón `Añadir`.
3. Mapa visible en el primer viewport y ocupando la mayor superficie.
4. Estados discretos por color/icono: normal, tarea, lluvia, incidencia, campaña y tratamiento.
5. Hoja inferior al tocar una parcela, sin abandonar el mapa.
6. Debajo del mapa, solo prioridades: tareas, alertas y campaña; no ocho menús equivalentes.

## Regla de contexto

- Seleccionar finca filtra mapa, KPIs, alertas, tareas y campaña.
- Tocar parcela fija `plotId` para todas las acciones posteriores.
- `Registrar` hereda finca y parcela; el usuario no vuelve a seleccionarlas.
- Una acción multiparcela permite ampliar el alcance explícitamente.
- Cambiar finca o parcela siempre es visible y reversible.

## Registro rápido

La primera hoja pide solo tipo, fecha y dato esencial. `Más detalles` contiene producto, dosis, coste, maquinaria, jornal, documento y notas. El backend y el outbox existentes siguen siendo la autoridad; loyalty solo se concede tras confirmación idempotente del servidor.

## Riesgos de accesibilidad a comprobar

- hoja inferior con foco atrapado, cierre accesible y retorno de foco;
- parcelas seleccionables por teclado además de puntero;
- estados que no dependan solo del color;
- objetivos táctiles de al menos 44 px;
- orden de lectura mapa → ficha → acción;
- actualización de estados anunciada sin interrumpir;
- reflow a 360, 390 y 430 px, tablet y escritorio;
- respeto de `prefers-reduced-motion`.

Las capturas permiten señalar riesgos visuales, pero no acreditan por sí solas navegación completa con lector de pantalla o teclado.

## Secuencia de implementación

1. Extraer `FieldTab` en componentes pequeños sin cambiar contratos.
2. Convertir `/mi-campo` en mapa vivo con selector y hoja rápida.
3. Crear ficha estable de parcela y sus cinco vistas.
4. Unificar el alta de parcela reutilizando Catastro/SIGPAC/GPS existentes.
5. Simplificar el registro y añadir alcance multiparcela.
6. Vincular documentos, cosecha y timeline al contexto activo.
7. Integrar Mi Olivo y eventos loyalty confirmados por backend.
8. Validar offline, permisos, responsive, accesibilidad y regresiones.

## Criterio para cada cambio

Un cambio solo entra si reduce decisiones o pasos sin eliminar datos, permisos, trazabilidad, funcionamiento offline o cálculos autoritativos.
