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
