# Design QA — Mágina Olivo visual convergence

## Comparison targets

- Home source truth: `/tmp/codex-clipboard-4b0a6e3c-e15a-4c57-9995-c7cacd3a1640.png` (941 × 1672 px).
- Loyalty source truth: `/tmp/codex-clipboard-b476e97b-9fd5-4a5b-8516-b3c2505d03d9.png` (941 × 1672 px).
- Supporting truth: the supplied Mi Campo, parcel, notebook, tasks, weather, news, cooperatives, market, rewards, onboarding, login, profile and administration screens in the same conversation.
- Home comparison: `docs/design/qa/home-reference-comparison.png`.
- Loyalty comparison: `docs/design/qa/loyalty-reference-comparison.png`.
- Implementation: `http://127.0.0.1:5173/` and `http://127.0.0.1:5173/tu-olivo`.
- Browser viewport: 430 × 764 CSS px, device scale factor 1. The browser capture was 415 × 737 px after browser insets and was aspect-fitted and padded to 430 × 764. Each 941 × 1672 source was aspect-fitted and padded to the same 430 × 764 comparison frame. Final side-by-side artifacts are 860 × 764 px.
- States: public home without a session; authenticated loyalty account with 150 pending and 0 available olives; reward catalog with zero active stock.

## Findings

- No remaining P0, P1 or P2 mismatch.
- Fonts and typography: Georgia display faces and Inter UI text reproduce the serif/sans hierarchy, optical weight and compact olive labels from the references. Dynamic titles wrap without clipping at 430 px.
- Spacing and layout rhythm: the 16 px mobile gutter, restrained 16–20 px radii, low-elevation cards and five-item fixed navigation match the reference family. The loyalty hero was reduced to a compact two-column image/content card so the level and next reward remain visible in the initial scroll.
- Colors and tokens: ivory paper, deep olive actions, muted sage surfaces and neutral borders are mapped to shared tokens. No unverified price, stock, queue or cooperative state is colored as though it were live.
- Image quality and asset fidelity: the approved Mágina Olivo mark remains the single brand mark. The loyalty tree is a dedicated 1820 × 864 raster illustration matching the supplied botanical art direction; the former CSS/SVG tree substitute is no longer rendered. Sierra Mágina photography remains sharp and correctly cropped.
- Copy and content: app copy remains Spanish, concise and consistent with the references. Mock-only figures are deliberately replaced by live, unavailable or empty states.
- Icons: visible controls use one line-icon family with consistent stroke weight and accessible labels. The generated tree is not reproduced with code-native shapes.
- Accessibility and responsiveness: focus styles, semantic buttons/links, alt text, reduced-motion behavior, tap targets and current-page semantics are preserved. No horizontal overflow was observed at 430 px.

## Comparison history

1. Home pass: the visual hierarchy matched, but live AEMET and authenticated farm data were unavailable in the production preview. Kept explicit unavailable/sign-in states instead of copying the mock's 22 °C, 5.35 €/kg or parcel values. Post-fix evidence: `docs/design/qa/home-reference-comparison.png`.
2. Loyalty pass 1: the imported branch used a very tall CSS/SVG tree scene and the level card shrank inside its grid. This was a P1 density/layout mismatch and an asset-fidelity failure.
3. Fix: replaced the rendered CSS/SVG tree with the dedicated raster asset, compacted the hero into the reference's left-image/right-content composition and forced loyalty summary cards to the full mobile width.
4. Loyalty pass 2: no actionable P0/P1/P2 issue remained. The reference's daily challenge list is intentionally not invented because the integrated backend currently exposes balances, levels, collection, catalog, reservations and validation, but not a challenge-history feed. Post-fix evidence: `docs/design/qa/loyalty-reference-comparison.png`.

## Interaction and runtime checks

- Main Inicio → Mágina navigation: passed.
- Authenticated `/tu-olivo` bootstrap and balance load: passed after additive migrations 0040–0044.
- `/recompensas` catalog, verified empty-stock state and navigation: passed.
- PWA update prompt dismissal: passed.
- Mutation controls were verified enabled/disabled from live state but were not clicked, avoiding alteration of the user's olive balance.
- Browser console errors/warnings on the reviewed route: none.
- Web build: passed.
- Web tests: 60 passed, 0 failed.
- API tests: 41 passed, 0 failed.
- Worker tests: 12 passed, 0 failed.
- API typecheck and `git diff --check`: passed.

## Follow-up polish

- P3: once a real challenge/history API exists, add the daily-retos and recent-activity blocks from the reference rather than supplying static rewards.
- P3: the administration visuals are represented by separate repository branches and should be converged in a dedicated secure admin pass instead of being merged into the grower navigation.

## Profile refinement — 6 September 2026

- Sources: six supplied mobile references for profile overview, editing, notifications, privacy, home preferences and support.
- Reviewed implementation routes: `/mi-magina`, `/perfil/editar`, `/perfil/notificaciones`, `/perfil/privacidad`, `/perfil/preferencias` and `/perfil/soporte`.
- Profile overview now follows the reference hierarchy and uses live farm, delivery and campaign-kilogram values instead of copying sample figures.
- Home preferences and support complete the visible route family. Preferences persist locally for the current device; unsupported server fields and an unconfigured support email are not fabricated.
- Mobile visual inspection found no clipped headings, horizontal overflow or inaccessible primary controls. Switch-track contrast was corrected during the pass.
- Web build: passed. Web tests: 65 passed, 0 failed.

final result: passed
