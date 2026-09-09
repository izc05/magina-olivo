# Catastro UI Lab V1

Branch: `feat/catastro-ui-lab-v1`  
Base: `feat/catastro-borrowed-audit-v1` @ `efed1febefd3b4752ede508e98814e4551fe18ff`  
Status: isolated UX + read-only integration laboratory, not production.

## Purpose

Test the Catastro experience before changing the audited production component.

The branch deliberately separates three questions:

1. **Is the flow understandable for a farmer?** — use the simulated interactive UI at `/lab/catastro`.
2. **Do the audited Catastro GET endpoints answer correctly in a real authenticated environment?** — use `/lab/catastro-real`.
3. **Should Mágina actually replace a plot boundary?** — this remains outside the laboratory and is not performed here.

No code from this laboratory is automatically accepted into the real Catastro panel.

## Laboratory A — visual / simulated

Route:

```text
/lab/catastro
```

Required build flag:

```text
VITE_CATASTRO_UI_LAB=true
```

This component contains no `fetch()` and writes no data. It is an interactive UX prototype only.

### Proposed UX

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

Reference input behaves like the intended real form:

- removes unsupported punctuation;
- accepts 14, 18 or 20 alphanumeric characters;
- shows inline valid/invalid feedback;
- prevents review while the RC is invalid;
- when a full 18/20-character property RC is used, review explains that parcel geometry uses the first 14 characters.

#### Nearby interaction

`Buscar alrededor` does not jump directly to an arbitrary parcel. The laboratory returns three simulated candidates. The user must recognize and select one using:

- polygon;
- parcel number;
- cadastral reference;
- area;
- approximate surface difference.

This is important because the real bounded Catastro query can legitimately return multiple nearby parcels.

### Step 2 — Revisar

The selected official-style parcel is shown beside the map with:

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

Before changing the simulated working boundary, Mágina shows a before/after comparison and requires explicit confirmation.

Confirmation is a deliberate unchecked-by-default acknowledgement:

```text
[ ] He revisado la parcela <RC> y quiero usar este perímetro.
```

`Confirmar perímetro` remains disabled until that box is checked.

The UI explains that in the production flow the server will re-check the RC directly against Catastro before saving.

### Success state

After simulated confirmation the user sees:

- the reference selected in the test path;
- simulated verified area;
- source (`Catastro · DGC`);
- clear route back to Mi Campo.

## Laboratory B — real Catastro, read-only

Route:

```text
/lab/catastro-real
```

Required build flags:

```text
VITE_CATASTRO_UI_LAB=true
VITE_CATASTRO_REAL_LAB=true
```

The second flag is intentionally insufficient on its own. The real laboratory route is enabled only when both flags are true.

This route calls the already-audited authenticated backend adapters inherited from `feat/catastro-borrowed-audit-v1`:

```text
GET /api/v1/maps/catastro/parcela?reference=...
GET /api/v1/maps/catastro/parcela-en-punto?longitude=...&latitude=...
```

### What it can do

- query a real cadastral reference of 14, 18 or 20 characters;
- query the official parcel containing real WGS84 coordinates;
- send the user's existing Mágina session cookie with `credentials: include`;
- show the returned cadastral reference, label, surface, geometry type, source and query time;
- render a simple geometry preview from the response.

### What it cannot do

The real laboratory intentionally contains no:

- `POST`;
- `PUT`;
- `PATCH`;
- `DELETE`;
- `/api/v1/plots/...` request;
- `import-catastro` request;
- button to add/replace a plot boundary.

This restriction is enforced by source-contract tests.

If the user is not authenticated, the route displays a login-required error instead of attempting any bypass.

## Safety model

```text
VISUAL LAB
  mock only
  no fetch
  no writes
        │
        ▼
REAL READ-ONLY LAB
  authenticated GET only
  official Catastro response
  no plot writes
        │
        ▼
PRODUCTION COMPONENT
  not changed by this branch
  server re-verification required
  explicit future merge decision
```

The normal application in this branch still contains the real authenticated Catastro implementation inherited from `feat/catastro-borrowed-audit-v1`; the laboratory routes do not replace it.

## How to test locally / mini PC

### Visual laboratory only

```bash
export VITE_CATASTRO_UI_LAB=true
npm ci
npm run dev:web
```

Open:

```text
http://<host>:<vite-port>/lab/catastro
```

### Visual + real read-only laboratory

The web application and API must be running in the same normal development/staging environment so the relative `/api/v1/...` calls reach Mágina's backend.

```bash
export VITE_CATASTRO_UI_LAB=true
export VITE_CATASTRO_REAL_LAB=true
npm ci
npm run dev:web
```

Open:

```text
http://<host>:<vite-port>/lab/catastro-real
```

You must first have a valid authenticated Mágina Olivo session.

### Production-style static build

```bash
VITE_CATASTRO_UI_LAB=true \
VITE_CATASTRO_REAL_LAB=true \
VITE_DEMO_MODE=true \
npm run build --workspace @magina/web
```

The dedicated `Catastro UI Lab` GitHub Actions workflow performs typecheck, tests, web build and uploads the resulting `dist` directory as a short-lived artifact. It never publishes GitHub Pages.

## Manual test script

Run visual scenarios once on desktop and once around 360–390 px mobile width.

### Scenario A — point search (visual)

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

Expected: no network request, no persisted data, clear simulated success state.

### Scenario B — reference search (visual)

1. Select `Referencia catastral`.
2. Enter an invalid short value and verify error feedback + disabled action.
3. Enter a valid 14-character RC and continue.
4. Repeat with 18 or 20 characters.
5. Verify review explains normalization to the 14-character parcel base.
6. Complete explicit confirmation.

Expected: the reviewed/success reference corresponds to the entered parcel base, not an unrelated demo value.

### Scenario C — nearby search (visual)

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

### Scenario E — real RC read

1. Log into Mágina Olivo in the test environment.
2. Open `/lab/catastro-real` with both lab flags enabled.
3. Enter a known real RC.
4. Press `Comprobar referencia real`.
5. Verify response shows DGC source, RC, area and geometry.
6. Confirm there is no add/import button.

Expected: one authenticated GET to the Mágina Catastro adapter and zero write requests.

### Scenario F — real coordinate read

1. Keep a valid Mágina session.
2. Select `Coordenadas`.
3. Enter longitude/latitude for a point inside a known parcel.
4. Press `Buscar parcela en este punto`.
5. Compare the returned reference with the expected parcel.

Expected: the official parcel containing the point is displayed; no data is written to Mi Campo.

### Scenario G — unauthenticated real lab

1. Clear/end the Mágina test session.
2. Open the real laboratory.
3. Submit a syntactically valid query.

Expected: a clear authentication-required error; no fallback to direct browser-to-DGC calls.

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
- [ ] Visual lab is impossible to open when `VITE_CATASTRO_UI_LAB` is disabled.
- [ ] Real lab is impossible to open unless **both** lab flags are enabled.
- [ ] Visual lab performs no network request.
- [ ] Real lab performs authenticated reads only.
- [ ] Real lab contains no import/write route.

### Accessibility sanity

- [ ] Interactive map has a keyboard-equivalent action.
- [ ] Current step exposes `aria-current="step"`.
- [ ] RC error state exposes `aria-invalid` and descriptive help.
- [ ] Disabled actions are visibly distinct.
- [ ] Focus remains visible on interactive controls.

### Technical

- [ ] Typecheck passes.
- [ ] Unit/source tests pass.
- [ ] Web build passes with both lab flags enabled.
- [ ] Visual lab text is present in the built bundle.
- [ ] Real read-only lab text is present in the built bundle.
- [ ] Build artifact is produced by GitHub Actions.

## Merge policy

This branch should not be merged directly into `feat/integration-v2-mvp-v1` or `main`.

If the design and read-only tests are accepted:

1. extract the approved interaction/layout decisions;
2. create a separate implementation branch from the audited Catastro base;
3. apply the approved UI to the real `CatastroParcelPanel.tsx`;
4. connect map-point, RC and nearby selection to the already audited authenticated API;
5. keep server-side re-fetch and authorization for the write/import step;
6. run the full Catastro and MVP/technical gates again;
7. perform at least one real Sierra Mágina parcel test in staging;
8. only then decide whether to update PR #182 or create a replacement PR.
