# Catastro UI Lab V1

Branch: `feat/catastro-ui-lab-v1`  
Base: `feat/catastro-borrowed-audit-v1` @ `efed1febefd3b4752ede508e98814e4551fe18ff`  
Status: isolated UX prototype, iteration 2, not production.

## Purpose

Test the Catastro experience before changing the audited production component.

The laboratory intentionally separates two questions:

1. **Is the flow understandable for a farmer?** — test with the standalone interactive prototype at `/lab/catastro`.
2. **Does the real Catastro adapter work?** — continue using the authenticated real `Mi Campo` flow already present in the branch base.

No code from this laboratory is automatically accepted into the real Catastro panel.

## Proposed UX

The main idea is to stop presenting Catastro as a technical GIS tool and turn it into a short three-step task:

```text
1. LOCALIZAR
   ↓
2. REVISAR
   ↓
3. AÑADIR
```

### Step 1 — Localizar

Three choices are visible together, but one is clearly recommended:

- **Señalar en el mapa** — recommended for most users;
- **Referencia catastral** — for users who already know the RC;
- **Buscar alrededor** — fallback when the working plot already has location/perimeter.

The user does not need to understand WFS, INSPIRE, GML, BBOX or CRS.

#### Point interaction

The map is interactive in the laboratory when `Señalar en el mapa` is selected:

- pointer/touch places the simulated point;
- another touch moves it;
- keyboard users can focus the map and press `Enter` or `Space`;
- the continue button stays disabled until a point is selected;
- the map shows an explicit `Punto marcado` state.

This tests the intended mental model before wiring the real map click to the authenticated Catastro point endpoint.

#### Reference interaction

Reference input now behaves like the intended real form:

- removes unsupported punctuation;
- accepts 14, 18 or 20 alphanumeric characters;
- shows inline valid/invalid feedback;
- prevents review while the RC is invalid;
- when a full 18/20-character property RC is used, the review explains that parcel geometry uses the first 14 characters.

#### Nearby interaction

`Buscar alrededor` no longer jumps directly to an arbitrary parcel. The laboratory returns three simulated candidates. The user must recognize and select one using:

- polygon;
- parcel number;
- cadastral reference;
- area;
- approximate surface difference.

This is important because the real bounded Catastro query can legitimately return multiple nearby parcels.

### Step 2 — Revisar

The selected official parcel is shown beside the map with:

- cadastral reference;
- Catastro surface;
- current Mi Campo surface;
- percentage/area difference;
- geometry type;
- official source disclosure;
- explicit warning that Catastro and SIGPAC are not equivalent.

The primary action is `Usar este perímetro`. A visible secondary action is `No es mi parcela`.

The result shown in this screen follows the selected laboratory search path instead of always showing one hard-coded reference.

### Step 3 — Añadir

Before changing the working boundary, Mágina shows a before/after comparison and requires explicit confirmation.

Iteration 2 changes the confirmation from a pre-checked checkbox to a **deliberate unchecked-by-default acknowledgement**:

```text
[ ] He revisado la parcela <RC> y quiero usar este perímetro.
```

`Confirmar perímetro` remains disabled until that box is checked.

The UI explains that the server will re-check the RC directly against Catastro before saving.

### Success state

After confirmation the user sees:

- the reference actually selected in the test path;
- verified/simulated area;
- source (`Catastro · DGC`);
- clear route back to Mi Campo.

## Lab safety

The prototype is available only when:

```text
VITE_CATASTRO_UI_LAB=true
```

and the route is:

```text
/lab/catastro
```

The lab component contains no `fetch()` and writes no data. It is an interactive visual prototype only.

The normal application in this branch still contains the real authenticated Catastro implementation inherited from `feat/catastro-borrowed-audit-v1`.

## How to test locally / mini PC

Linux / mini PC:

```bash
export VITE_CATASTRO_UI_LAB=true
npm ci
npm run dev:web
```

Open:

```text
http://<host>:<vite-port>/lab/catastro
```

For a production-style static build:

```bash
VITE_CATASTRO_UI_LAB=true VITE_DEMO_MODE=true npm run build --workspace @magina/web
```

The dedicated `Catastro UI Lab` GitHub Actions workflow performs typecheck, tests, web build and uploads the resulting `dist` directory as a short-lived artifact. It never publishes GitHub Pages.

## Manual test script

Run every scenario once on desktop and once around 360–390 px mobile width.

### Scenario A — point search

1. Open `/lab/catastro`.
2. Keep `Señalar en el mapa` selected.
3. Verify the main action is disabled before placing a point.
4. Touch/click a position in the map.
5. Verify the pin appears and `Punto marcado · puedes continuar` is shown.
6. Move the point to another position.
7. Continue to review.
8. Choose `Usar este perímetro`.
9. Verify final confirmation is disabled until the checkbox is checked.
10. Check it and finish the flow.

Expected: no network request, no persisted data, clear success state.

### Scenario B — reference search

1. Select `Referencia catastral`.
2. Enter an invalid short value and verify error feedback + disabled action.
3. Enter a valid 14-character RC and continue.
4. Repeat with 18 or 20 characters.
5. Verify review explains normalization to the 14-character parcel base.
6. Complete explicit confirmation.

Expected: the reviewed/success reference corresponds to the entered parcel base, not an unrelated demo value.

### Scenario C — nearby search

1. Select `Buscar alrededor`.
2. Press `Buscar parcelas cercanas`.
3. Verify three candidates appear.
4. Select candidate 2 or 3, not only candidate 1.
5. Verify review reflects the candidate selected.
6. Use `No es mi parcela`, return and select another candidate.

Expected: fallback search makes selection explicit and never assumes the first result is correct.

### Scenario D — keyboard/accessibility sanity

1. Navigate the search-mode choices using keyboard focus.
2. Focus the simulated map.
3. Press `Enter` or `Space` and verify a point is marked.
4. Confirm visible focus states.
5. Verify stepper identifies the current step.
6. Verify invalid RC exposes `aria-invalid`.

## Acceptance checklist

### UX

- [ ] A user understands that pointing on the map is the recommended method.
- [ ] Point search cannot continue before a point is deliberately selected.
- [ ] RC search remains easy to discover.
- [ ] Invalid RC cannot reach review.
- [ ] Full RC normalization is understandable.
- [ ] Nearby search is available but not visually dominant.
- [ ] Nearby search requires choosing a candidate when several are returned.
- [ ] Catastro vs Mi Campo surface difference is immediately understandable.
- [ ] It is obvious that nothing is saved before confirmation.
- [ ] Final confirmation starts unchecked and blocks the destructive action.
- [ ] `No es mi parcela` is easy to find.
- [ ] Mobile layout remains usable at ~360 px width.

### Safety / trust

- [ ] DGC is clearly identified as the official source.
- [ ] Catastro and SIGPAC are never presented as equivalent.
- [ ] The confirmation explains server-side re-verification.
- [ ] The lab is impossible to open when `VITE_CATASTRO_UI_LAB` is disabled.
- [ ] No lab interaction performs network writes.

### Accessibility sanity

- [ ] Interactive map has a keyboard-equivalent action.
- [ ] Current step exposes `aria-current="step"`.
- [ ] RC error state exposes `aria-invalid` and descriptive help.
- [ ] Disabled actions are visibly distinct.
- [ ] Focus remains visible on interactive controls.

### Technical

- [ ] Typecheck passes.
- [ ] Unit/source tests pass.
- [ ] Web build passes with lab flag enabled.
- [ ] Lab text is present in the built bundle.
- [ ] Build artifact is produced by GitHub Actions.

## Merge policy

This branch should not be merged directly into `feat/integration-v2-mvp-v1` or `main`.

If the design is accepted:

1. extract the approved interaction/layout decisions;
2. apply them to the real `CatastroParcelPanel.tsx` on a new implementation commit/branch;
3. connect map-point, RC and nearby selection to the already audited authenticated API;
4. run the full Catastro and MVP/technical gates again;
5. perform at least one real Sierra Mágina parcel test in staging;
6. only then decide whether to update PR #182 or create a replacement PR.
