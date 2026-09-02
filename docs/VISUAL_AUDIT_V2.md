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
- CI de GitHub Actions: fotografía + TypeScript + Vite validados en verde.

### Pendiente real

1. Revisar visualmente los recortes fotográficos dentro de cada hero y ajustar `background-position` si hace falta.
2. Ejecutar prueba visual en 360×800, 390×844, 430×932, 768×1024 y 1366×768.
3. Sustituir el mapa esquemático por cartografía real cuando exista fuente geográfica.
4. Mantener claramente separados los datos demo de futuras fuentes reales.
5. Integrar backend/datos reales solo después de cerrar esta referencia visual.

## Mi Campo

**Estado:** estructura y densidad cerradas.

Navegación principal:
- Campo
- Cuaderno
- Campaña
- Gestión

Dentro de Gestión:
- Costes y rentabilidad
- Maquinaria

Pendiente: cartografía real y revisión visual final del hero fotográfico.

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

Los destinos internos siguen siendo válidos para accesos directos desde Inicio o notificaciones.

## Fotografía P0

Slots:

- `public/photos/home-sierra-magina.webp`
- `public/photos/field-olivares-magina.webp`
- `public/photos/discover-sierra-magina.webp`
- `public/photos/discover-jimena.webp`

Los WebP se generan con `npm run photos:sync`. El script consulta la API oficial de Wikimedia Commons, obtiene una versión adecuada, aplica recorte/optimización con `sharp` y produce archivos locales; la interfaz no depende de hotlinking.

Validación CI:

- Home: ~224 KB.
- Mi Campo: ~375 KB.
- Descubre Sierra Mágina: ~254 KB.
- Jimena: ~319 KB.

La selección P0 utiliza material territorial con licencia CC BY-SA 4.0 y atribución registrada en `public/photos/README.md`.

## Responsive

La capa `src/styles/responsive.css` y `docs/RESPONSIVE_AUDIT_V2.md` fijan el comportamiento desde móvil pequeño hasta escritorio.

Ya resuelto:
- marca compacta en móvil estrecho;
- accesos rápidos 2×2 en 320–390 px;
- barra inferior compacta con FAB de 48 px;
- parcelas multilínea para evitar colisiones;
- mercado en filas completas en móvil estrecho;
- mapa de Mi Campo en dos columnas a partir de 900 px;
- escritorio conserva el lenguaje de app, sin sidebar de ERP.

## Validación técnica

Workflow: `.github/workflows/visual-v2-build.yml`.

Cadena validada en GitHub Actions:

1. Checkout.
2. Node 22.
3. `npm install` — 0 vulnerabilidades en la ejecución validada.
4. `npm run photos:sync` — 4/4 fotografías generadas.
5. `npm run build` → `tsc -b && vite build` — correcto.
6. Vite transformó 1603 módulos en la ejecución validada.

## Orden de cierre V2.1

1. ✅ Ficha completa de cooperativa.
2. ✅ Navegación directa Inicio → subsecciones.
3. ✅ Detalle de ruta y evento.
4. ✅ Comunidad y documentos.
5. ✅ Simplificación de densidad.
6. ✅ Pipeline fotográfico territorial.
7. ✅ Responsive estructural móvil/tablet/escritorio.
8. ✅ Build/CI.
9. ⏳ Capturas y validación visual por tamaños.
10. Solo después valorar merge a `main`.
