# Mágina Olivo — Auditoría Visual V2

## Objetivo

La V2 debe conservar la dirección marcada por las primeras referencias: **campo + fotografía + información útil + identidad de Sierra Mágina**, evitando el aspecto de ERP o dashboard genérico.

## Principios fijados

- Logo oficial único.
- Fondo marfil cálido.
- Verde oliva profundo para navegación y acciones principales.
- Verde hoja para estados e información agronómica.
- Dorado aceite solo como acento.
- Iconografía lineal consistente, sin emojis.
- Tarjetas compactas, bordes finos y sombras discretas.
- Fotografía territorial real en los bloques protagonistas.
- Mobile-first; tablet y escritorio son adaptaciones del mismo producto.
- Mapas grandes cuando aportan valor.

## Estado global V2.1

### Cerrado

- Inicio con accesos directos a Cuaderno, Alertas, Mercado y Meteorología.
- Meteorología detallada con recomendación agrícola y ventana de trabajo.
- Mi Campo simplificado a `Campo / Cuaderno / Campaña / Gestión`.
- Costes y Maquinaria agrupados dentro de Gestión sin perder destinos internos.
- Mágina simplificada a `Noticias / Cooperativas / Mercado / Descubre / Más`.
- `Más` agrupa Mágina Local, Comunidad, Agenda y Alertas.
- Descubre promovido también a destino principal de la app.
- Barra principal estabilizada en `Inicio / Mi Campo / Mágina / Descubre / Perfil`.
- Acción contextual `+` separada de la navegación y visible solo donde aporta valor.
- Noticias con detalle editorial.
- Cooperativas con ficha completa.
- Descubre con detalle de ruta.
- Agenda con detalle de evento.
- Comunidad con detalle, respuestas, reacciones y reporte.
- Mi Mágina con preview de documentos y metadatos.
- Estados técnicos: login, registro, recuperación, onboarding, permisos, loading, offline, vacío, error y confirmación.
- Capa responsive V2.1 desde 320 px hasta escritorio sin introducir sidebar administrativo.
- Objetivos táctiles principales de al menos 44 px y soporte `prefers-reduced-motion`.
- Pipeline reproducible de fotografía P0 con `npm run photos:sync`.
- CI de GitHub Actions: fotografía + TypeScript + Vite + Chromium responsive smoke validados en verde.
- 25 capturas reales por ejecución en 360×800, 390×844, 430×932, 768×1024 y 1366×768.
- Subnavegaciones clave visibles completas en móvil estrecho.

### Correcciones de revisión visual

La revisión manual de las capturas del run 17 detectó dos mejoras que los tests estructurales por sí solos no podían valorar:

1. **Inicio / Mercado:** el selector CSS del minigráfico afectaba también al icono `TrendingUp`, expandiéndolo en escritorio. Se separa el SVG de tendencia inline del SVG principal y se limita su escala.
2. **Mágina / Actualidad:** el hero editorial deja de depender de un fondo abstracto y pasa a usar la fotografía territorial `field-olivares-magina.webp`, manteniendo el overlay oscuro para la legibilidad del titular.

El smoke responsive incorpora una aserción específica de escala para el icono y el minigráfico de Inicio, de modo que esa regresión queda automatizada.

### Pendiente real

1. Sustituir el mapa esquemático por cartografía real cuando exista fuente geográfica.
2. Mantener claramente separados los datos demo de futuras fuentes reales.
3. Integrar backend/datos reales solo después de cerrar esta referencia visual.
4. Seguir refinando recortes fotográficos cuando añadamos nuevos slots P1, sin romper los cuatro P0 ya aprobados.

## Mi Campo

**Estado:** estructura, densidad y responsive cerradas.

Navegación principal:
- Campo
- Cuaderno
- Campaña
- Gestión

Dentro de Gestión:
- Costes y rentabilidad
- Maquinaria

Pendiente: cartografía real.

## Mágina

**Estado:** estructura y densidad cerradas.

Navegación principal:
- Noticias
- Cooperativas
- Mercado
- Descubre
- Más

Dentro de Más:
- Mágina Local
- Comunidad
- Agenda
- Alertas

Los destinos internos siguen siendo válidos para accesos directos desde Inicio o notificaciones. La portada de Actualidad usa ya fotografía territorial real del pipeline aprobado.

## Fotografía P0

Slots:

- `public/photos/home-sierra-magina.webp`
- `public/photos/field-olivares-magina.webp`
- `public/photos/discover-sierra-magina.webp`
- `public/photos/discover-jimena.webp`

Los WebP se generan con `npm run photos:sync`. El script consulta la API oficial de Wikimedia Commons, obtiene una versión adecuada, aplica recorte/optimización con `sharp` y produce archivos locales; la interfaz no depende de hotlinking.

La selección P0 utiliza material territorial con licencia CC BY-SA 4.0 y atribución registrada en `public/photos/README.md`.

## Responsive

La capa `src/styles/responsive.css` y `docs/RESPONSIVE_AUDIT_V2.md` fijan el comportamiento desde móvil pequeño hasta escritorio.

Ya resuelto:
- marca compacta en móvil estrecho;
- accesos rápidos 2×2 en 320–390 px;
- barra inferior compacta con 5 destinos y FAB contextual separado;
- parcelas multilínea para evitar colisiones;
- mercado en filas completas en móvil estrecho;
- mapa de Mi Campo en dos columnas a partir de 900 px;
- subnavegaciones de Campo, Mágina y Perfil visibles en 360–430 px;
- escritorio conserva el lenguaje de app, sin sidebar de ERP.

## Validación técnica

Workflow: `.github/workflows/visual-v2-build.yml`.

Cadena validada en GitHub Actions:

1. Checkout.
2. Node 22.
3. `npm install`.
4. Instalación de Chromium.
5. `npm run photos:sync` — 4/4 fotografías generadas.
6. `npm run build` → `tsc -b && vite build`.
7. `node scripts/responsive-smoke.mjs`.
8. Generación de 25 capturas reales.
9. Subida del artifact `responsive-captures` durante 14 días.

El run 17 sobre `f1f4072574b94b6cc6d9c091eeb6b35db95198e5` terminó en verde y confirmó navegación principal, subnavegación móvil, objetivos táctiles, FAB y ausencia de overflow global.

## Orden de cierre V2.1

1. ✅ Ficha completa de cooperativa.
2. ✅ Navegación directa Inicio → subsecciones.
3. ✅ Detalle de ruta y evento.
4. ✅ Comunidad y documentos.
5. ✅ Simplificación de densidad.
6. ✅ Pipeline fotográfico territorial.
7. ✅ Responsive estructural móvil/tablet/escritorio.
8. ✅ Build/CI.
9. ✅ Capturas y validación visual por tamaños.
10. ✅ Corrección de regresiones visuales detectadas por captura.
11. ⏳ Última comprobación CI del refinamiento editorial actual.
12. Solo después valorar merge a `main`.
