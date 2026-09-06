# Design QA — Perfil

## Evidence

- Source visual truth:
  - `/tmp/codex-clipboard-3fd1432c-3fc0-4686-a2e6-76cdc7d79bc5.png` — Editar perfil, 942 × 1672 px.
  - `/tmp/codex-clipboard-6072c520-2d37-40f4-b42e-9c9baaecc0e4.png` — Preferencias de Inicio, 942 × 1672 px.
  - `/tmp/codex-clipboard-f0e54233-e634-4d7d-bd71-0ba81ce94c15.png` — Notificaciones, 942 × 1672 px.
- Rendered implementation: browser captures from `http://127.0.0.1:5173/perfil/editar`, `/perfil/preferencias` and `/perfil/notificaciones` using the Codex in-app browser.
- Capture viewport: 634 × 682 CSS px; full-page captures reviewed. The source is a double-density mobile reference (approximately 471 × 836 CSS px). The implementation was compared proportionally because the in-app surface does not expose viewport resizing.
- State: authenticated demo account; actual saved account/notification values were retained instead of replacing them with screenshot fixtures.

## Full-view comparison

- Typography: Georgia display headings and Inter UI text preserve the reference hierarchy, weights and compact wrapping.
- Spacing/layout: single-column mobile rhythm, 16–20 px cards, rounded field containers, section labels and full-width actions now follow the reference composition.
- Colors: ivory page, dark olive primary actions, sage icon tiles, amber alert and restrained borders match the supplied palette.
- Assets/icons: the supplied official logo is used; interface pictograms come from the existing icon library rather than approximated drawings.
- Copy/content: the three screens now include the reference groups, explanations and seven notification categories. Account values remain live.

## Focused comparison

- Edit profile: verified split name/surname inputs, email, telephone capability state, real holding municipality, cooperative selector, avatar/camera treatment and actions.
- Preferences: verified the two-line information panel, six cards, visible switches/grips and save action.
- Notifications: verified important-alert card, four general rows, three exploitation rows, switches and persistence action.

## Comparison history

1. Earlier P1: notification screen exposed only three rows and lacked the `TU EXPLOTACIÓN` group. Fixed with the complete seven-row hierarchy and persistence for every switch. Post-fix browser capture shows both groups.
2. Earlier P2: edit profile lacked surname, phone capability and municipality. Fixed by safely splitting the real account name, showing the phone capability state, and reading municipality from the real holding. Post-fix accessibility tree and full-page capture contain all fields.
3. Earlier P2: mobile alert switch and preference grips collapsed or disappeared. Fixed responsive grid tracks so controls remain aligned on one row. Post-fix captures show the intended density.
4. Earlier P2: off switches and camera treatment were too faint. Increased off-state contrast and restored the overlapping camera control.

## Remaining P3 polish

- Telephone remains read-only until verified phone storage exists; this is an intentional product constraint rather than fabricated persistence.
- Device status bar and Android system controls belong to the reference capture, not to the web application.

## Primary interactions checked

- Protected routes render with authenticated data.
- Switches are real accessible `role="switch"` controls.
- Name/surname recombine into the supported account name on save.
- Home and supplemental notification choices persist locally; server-backed notification choices keep the existing API contract.
- Build and 65 frontend tests pass.

## Findings

No actionable P0, P1 or P2 visual differences remain for these three screens. The remaining deviations are expected product/runtime constraints listed above.

final result: passed

---

# Design QA — Servicios locales

## Evidence

- Source visual truth: `/tmp/codex-clipboard-299588b9-2d13-496b-8dd1-d610c89a29ae.png`, `/tmp/codex-clipboard-89b5064e-ded8-4798-b4ad-310e45f71d69.png`, `/tmp/codex-clipboard-9c26d21d-1e70-46b8-b396-466c4191ecc5.png` y `/tmp/codex-clipboard-50f6b28b-431c-4010-99b0-55d8d8fe1b6c.png`.
- Rendered implementation: `/descubre` en el navegador integrado de Codex a 634 px; contraste a nivel de contenido con las capturas móviles suministradas.
- Asset: `/apps/web/public/photos/local-services-triptych.png`, generado como imagen editorial sin texto ni marcas, para no hacer pasar una imagen artificial por una ficha comercial real.

## Full-view comparison

- La entrada de Descubre pasa a ser un directorio de servicios locales: título editorial, búsqueda, matriz de categorías, destacados, lista próxima y CTA hacia el catálogo.
- Búsqueda y categorías actualizan los resultados; las tarjetas llevan a una ficha individual y el catálogo completo vive en `/descubre/servicios`.
- Las fichas declaran de forma visible que sus contactos, horarios y rutas no se publicarán hasta verificarlos.

## Comparison history

1. P1: los iconos de categoría salían demasiado pequeños por el padding de los SVG. Se amplió el marco visual y se comprobó de nuevo en el navegador.
2. P2: no existe aún una fuente de comercios locales verificable. Se mantuvo la experiencia navegable con datos de diseño rotulados, sin habilitar llamadas, rutas u horarios falsos.

## Primary interactions checked

- Filtro de categoría, búsqueda, CTA de directorio y enlaces a fichas de servicio.
- Producción compila sin errores: `npm --prefix apps/web run build`.

## Expected follow-up

- La capa de producción sustituirá el dataset visual por un endpoint público con procedencia, fecha de revisión, teléfono, horario, coordenadas y consentimiento del negocio.
- El mapa y las rutas sólo se habilitarán al elegir proveedor cartográfico y mantener la atribución/licencia correspondiente.

final result: passed

---

# Design QA — Meteorología, ajuste de fidelidad móvil

## Evidence

- Source visual truth:
  - `/tmp/codex-clipboard-037e5336-120a-4f44-931f-371c586d35eb.png` — Previsión por horas.
  - `/tmp/codex-clipboard-c107e598-a8c0-4c3c-8e93-5a4abcb45be6.png` — Previsión semanal.
  - `/tmp/codex-clipboard-16080873-1bc6-49a4-8c92-b721e2388205.png` — Configurar alertas.
  - `/tmp/codex-clipboard-d8e36e86-9c34-4c24-bbc5-8a2dd876b1a3.png` — Detalle de alerta y radar.
- Rendered implementation: capturas completas en el navegador integrado de Codex de `/magina/tiempo`, `/magina/tiempo/horas`, `/magina/alertas/configurar` y `/magina/alerta`.
- Capture surface: 634 px de ancho. Se comparó el contenido de las referencias móviles, no las barras de estado del dispositivo.

## Full-view comparison

- La previsión semanal se compactó en una tarjeta de tres áreas y filas meteorológicas densas, manteniendo los datos devueltos por AEMET.
- La previsión por horas muestra ocho intervalos visibles, una selección de ubicación y el resumen actual dividido entre temperatura y métricas, como en la composición de referencia.
- La configuración de parcelas usa interruptores oliva, canales, selector segmentado de antelación y controles de intensidad/horario en dos columnas.
- El detalle de alerta conserva sus bloques de impacto, recomendaciones y acciones; el fondo de radar es ahora una imagen cartográfica creada para esta vista y se etiqueta expresamente como `Mapa ilustrativo para la vista demo`.

## Comparison history

1. P1: los interruptores activados heredaban una variable de color inexistente y parecían desactivados. Se fijó su estado activo en oliva oscuro.
2. P1: la franja horaria sólo dejaba leer parte de los intervalos en móvil. Se recalibró a ocho columnas compactas sin scroll horizontal.
3. P2: el radar de demostración parecía un marcador técnico. Se sustituyó por una composición cartográfica visual, sin afirmar que sea un fotograma en tiempo real.

## Primary interactions checked

- Navegación semanal → por horas, configuración de avisos y detalle de alerta.
- Cambios de interruptor, canales, antelación, intensidad y franja horaria permanecen operables en la vista privada.
- Los avisos y la previsión continúan obteniéndose de sus rutas de datos; el navegador no recibe credenciales de AEMET.
- `npm --prefix apps/web run build` pasa después de los cambios.

## Expected deviations

- Los valores conectados corresponden a Huelma cuando ese es el municipio del entorno actual; no se sustituyen por los ejemplos estáticos de Bedmar de las referencias.
- El radar visual no pretende sustituir un servicio de radar operativo: queda claramente señalado como ilustrativo hasta conectar ese proveedor.
- Los avisos privados piloto pueden cubrir parte inferior de una pantalla en demo cuando existe una alerta real; son notificaciones de cuenta ajenas a la composición meteorológica.

final result: passed

---

# Design QA — Afinado visual de Campaña

## Evidence

- Source visual truth:
  - `/tmp/codex-clipboard-9a150763-18ce-4634-a033-c1f8be364977.png` — tablero de campaña de Los Llanos.
  - `/tmp/codex-clipboard-08f82a38-fb0b-4797-bbc3-18642c099be9.png` — historial de entregas.
  - `/tmp/codex-clipboard-a7df8dd3-5c82-406b-966b-81678c477074.png` — comparativa de campaña.
- Rendered implementation: full-page capture of `http://127.0.0.1:5175/campana` in the in-app browser after the visual refinement. CUA presents the image in the active browser session but does not expose a local capture path.
- Viewport and normalization: 634 px wide browser capture; source is a 941 px wide mobile capture that includes phone chrome. Evaluation used the app-owned content crop and did not judge browser/device chrome.
- State: authenticated demo account, Campaña 2026/27, three live delivery rows and one historical season for comparison.

## Findings and comparison history

1. [P1] Earlier campaign composition had a large generic page introduction and separate selector above the image, unlike the compact reference hero. Fixed: the campaign season is now part of the hero as a usable picker; generic intro and duplicate context strip were removed.
2. [P1] Earlier hero was too tall and the central campaign information was diluted. Fixed: tightened its height, title scale, photo crop, spacing and season control while keeping readable image contrast.
3. [P2] The references organize the campaign summary as four compact facts below the hero. Fixed: the page now has four equally weighted cards for delivery total, yield, last delivery and destination/cooperative.
4. [P2] At small widths, long destination text risked dominating the summary. Fixed: a compact destination variant with responsive typography preserves all four cards without overflow.

## Required fidelity surfaces

- Typography: the large Georgia editorial title, compact sans-serif data, uppercase campaign kicker and subtle metadata now more closely mirror the source hierarchy; long cooperative names wrap within their card instead of truncating essential content.
- Spacing and layout rhythm: the hero now begins directly below the shared header, uses a tighter 214–236 px visual band and leads to 4 aligned metric cards, matching the source's cadence.
- Colors and tokens: ivory background, paper cards, olive primary CTA, sage positive states and quiet borders were retained. The change introduces no new visual palette.
- Image quality: the existing Sierra Mágina landscape remains a real, sharp supplied product asset with adjusted focal crop; no substitute imagery or fabricated icon artwork was introduced.
- Copy and content: all visible campaign quantities, destinations and dates remain derived from connected private data; the campaign selector is a real control rather than static reference chrome.

## Primary interactions checked

- The campaign selector remains a native select inside the hero and preserves the selected campaign state.
- Register delivery, ticket actions, documents, CSV/JSON exports, browser print action and fixed navigation remain visible and operable in the refined layout.
- In-app browser capture showed no clipping or overflow through the complete delivery, comparison and documents flow.
- `npm --prefix apps/web run build`, `npm --prefix apps/web test -- --run` (66 tests), and `git diff --check` pass.

## Follow-up polish

- A future delivery reference with more varied cooperative names will allow tuning of the fourth metric's ideal truncation/wrapping threshold.
- Meteorología remains intentionally out of this pass, ready for the dedicated visual review with its own radar references.

final result: passed

---

# Design QA — Comparativas e informes de campaña

## Evidence

- Source visual truth:
  - `/tmp/codex-clipboard-a7df8dd3-5c82-406b-966b-81678c477074.png` — comparativa de producción por campaña.
  - `/tmp/codex-clipboard-69cec3a0-28ed-4692-bd7e-7c2be2ab311a.png` — informes de campaña y exportaciones.
- Rendered implementation: capture from `http://127.0.0.1:5175/campana` in the Codex in-app browser, captured after selecting the active demo campaign. The capture is available in the active browser session; CUA does not return a filesystem path for the image.
- Viewport: 634 px wide browser capture. The references are 941 px wide device captures with system chrome, so comparison was normalized to app-owned content only; no device status or home bar was judged.
- State: authenticated demo account, `Campaña 2026/27` selected, three current deliveries and one historical campaign with two deliveries.

## Full-view and focused comparison

- The implementation carries the reference hierarchy into the existing campaign screen: a serif campaign heading, olive/sage cards, compact data rows and persistent bottom navigation.
- The comparativa uses actual campaign-summary reads. It shows the selected campaign, a prior campaign, production bars rendered by native `meter`, weighted yield and a calculated delta. The reference's regional benchmark is intentionally not imitated because no verified comarca aggregate exists in the product.
- The informes area keeps the reference's green report action hierarchy, but its actions state exactly what they do: browser-native print/save-as-PDF, real CSV export and real JSON export. Private uploaded documents retain their real empty/loading/error states.
- Focused card review: both cards retain readable serif labels, 15–18 px internal padding, ivory paper surfaces, low-contrast sage state fills and olive primary action color. At the available width, no text or action overflows.

## Required fidelity surfaces

- Fonts and typography: Georgia is used for editorial headings and numeric emphasis; Inter remains the legible compact data face. Campaign names, kilograms and yield data fit without truncation in the captured state.
- Spacing and layout rhythm: the new cards align to the 16 px page gutter and existing section rhythm. The comparison uses short rows instead of duplicating the dense reference graph; the report action becomes full-width on small screens.
- Colors and visual tokens: existing ivory, paper-white, olive, sage and amber tokens are reused. The positive comparison state is green; no unsupported colour is used to imply a data condition.
- Image quality and asset fidelity: this sub-block adds no new imagery. The existing provided Mágina landscape remains sharp and correctly cropped in the campaign hero; all UI icons continue to come from the installed icon library.
- Copy and content: all quantities and yield values derive from campaign data. The explicit regional-data note and browser-print wording prevent false claims about comarca benchmarks or a stored PDF generator.

## Findings and comparison history

1. [P1] The reference's “Media Sierra Mágina” value could not be truthfully reproduced. Fixed by implementing campaign-to-campaign history and explicitly deferring the regional comparison until its source is verified.
2. [P1] The reference's PDF CTA would have implied a server-side document generator that does not exist. Fixed by providing a working browser print/save-as-PDF action plus actual CSV/JSON exports.
3. [P2] Historical demo data initially returned empty summaries for closed campaigns. Fixed by scoping demo deliveries by campaign, adding a closed-season record and preserving the same API contract returned to the app.

## Primary interactions checked

- Campaign selector continues to choose the active season; the comparison queries the remaining campaign summaries without altering selected campaign data.
- Browser print action invokes `window.print()` only on the explicit button gesture.
- CSV and JSON links retain their authenticated campaign export URLs; document downloads and empty state remain intact.
- `npm --prefix apps/web run build` and `npm --prefix apps/web test -- --run` pass (66 frontend tests).

## Follow-up polish

- Add the Sierra Mágina benchmark only after a documented, freshness-controlled aggregate data source exists.
- Add persistent server-generated PDF reports only after the document-generation and storage flow exists.

final result: passed

---

# Design QA — Campaña y entregas

## Evidence

- Source visual truth:
  - `/tmp/codex-clipboard-08f82a38-fb0b-4797-bbc3-18642c099be9.png` — Historial de entregas.
  - `/tmp/codex-clipboard-9a150763-18ce-4634-a033-c1f8be364977.png` — Resumen de campaña de finca.
  - `/tmp/codex-clipboard-a7df8dd3-5c82-406b-966b-81678c477074.png` — Comparativas, referencia para la fase de históricos.
  - `/tmp/codex-clipboard-69cec3a0-28ed-4692-bd7e-7c2be2ab311a.png` — Informes, referencia para la fase de PDF.
- Rendered implementation: full-page capture of `/campana` in the Codex in-app browser, con datos de campaña privados de demostración.
- Capture surface: 634 px wide. Se compararon jerarquía, fotografía, tarjetas, estado de entregas y navegación inferior con las referencias móviles.

## Full-view comparison

- Se implantó la composición de campaña: foto de finca, etiqueta de temporada, resumen de entrega/rendimiento y acción principal para registrar una entrega.
- El historial conserva fecha, destino, variedad, ticket, kilos, rendimiento y estado desde los contratos privados existentes.
- La presentación de documentos usa las descargas CSV/JSON reales y comunica de forma amable la ausencia temporal de archivos, sin exponer errores HTTP.

## Comparison history

1. P1: el contexto de finca y último destino se truncaba en móvil. Se agrupó cada texto con su icono para preservar ambas etiquetas.
2. P1: el entorno demo comunicaba los rendimientos como pendientes aunque existiesen. Se alineó el estado de datos de demostración con el contrato productivo `current`.
3. P1: la carga de documentos exponía el texto técnico `HTTP 400`. Se sustituyó por un mensaje de continuidad comprensible.

## Expected follow-up

- Comparativa con media de Sierra Mágina requiere una fuente histórica y agregada verificada; no se muestra una media inventada.
- Generación PDF requiere un servicio de documentos real; por ahora se mantienen las exportaciones CSV/JSON y documentos privados existentes.

## Primary interactions checked

- Selector de campaña, registro desplegable de entrega, descarga de CSV/JSON, adjunto de ticket y navegación a documentos.
- Resultados por entrega se leen del endpoint privado y se actualizan con el estado correcto.
- Producción build y suite web pasan tras los cambios.

final result: passed

---

# Design QA — Meteorología

## Evidence

- Source visual truth:
  - `/tmp/codex-clipboard-13d6d646-bde4-4cee-91ba-90ae5e97e782.png` — Previsión por horas.
  - `/tmp/codex-clipboard-9d20508a-a66b-4e5b-a5d0-8d707a40ba4e.png` — Previsión semanal.
  - `/tmp/codex-clipboard-d539cb6e-f454-42b8-a9db-8c2f9ca0bc5c.png` — Detalle de alerta.
  - `/tmp/codex-clipboard-228780bf-0524-487c-a9bc-8cf748998b7c.png` — Configurar alertas.
- Rendered implementation: full-page captures from `/magina/tiempo`, `/magina/tiempo/horas`, `/magina/alerta` and `/magina/alertas/configurar` in the Codex in-app browser.
- Capture surface: 634 px wide. Reference proportions, hierarchy, color, density, wrapping and fixed navigation were compared at the available mobile width.
- State: explicit demo preview for visual QA. Simulated values are labelled as such; production routes use server-side AEMET data and authenticated account data.

## Full-view comparison

- Typography and hierarchy retain the large Georgia titles, green meteorology eyebrow and compact Inter data labels.
- The ivory background, white bordered cards, olive controls, sage icon tiles and amber caution states match the supplied visual system.
- Weekly rows, horizontal hourly strip, alert summary, recommendation cards and per-plot settings reproduce the reference information architecture.
- The shared official logo, header and bottom navigation remain consistent with the rest of the product.

## Comparison history

1. P1: the first hourly demo exposed only four usable time columns. Expanded the source fixture so the horizontal strip now shows eight two-hour intervals.
2. P1: the alert detail lacked the precipitation radar shown in the reference. Added the latest real radar frame and linked the full animated radar view.
3. P1: public weather pages initially inherited a second navigation wrapper. Removed the duplicate wrapper and kept one accessible navigation landmark.
4. P2: the former route only exposed a single weather page. Added dedicated weekly, hourly, alert-detail and per-plot configuration routes and connected their primary actions.

## Primary interactions checked

- Weekly-to-hourly navigation and radar destination resolve to implemented pages.
- Hourly and daily forecasts use public server routes; no AEMET credential is shipped to the client.
- Alert detail reads the authenticated rain-alert feed and the public radar feed.
- Per-plot switches, channels, lead time, intensity and time band are operable and persist locally with an explicit scope note.
- Production build, API tests and frontend tests pass.

## Expected deviations

- The reference names Bedmar and sample parcels; the implementation preserves the account/municipality actually returned by the connected data instead of fabricating those values.
- Android/iOS status and system bars belong to the reference device and are not reproduced by the web application.
- Fixed private pilot notices may overlay the lower edge in demo mode when a real alert is active; their presence is intentional account feedback.

final result: passed
