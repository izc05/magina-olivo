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
