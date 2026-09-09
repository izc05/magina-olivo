# Catastro UI Lab V1

Branch: `feat/catastro-ui-lab-v1`  
Base: `feat/catastro-borrowed-audit-v1` @ `efed1febefd3b4752ede508e98814e4551fe18ff`  
Status: isolated UX prototype, not production.

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

### Step 3 — Añadir

Before changing the working boundary, Mágina shows a before/after comparison and requires explicit confirmation.

The UI explains that the server will re-check the RC directly against Catastro before saving.

### Success state

After confirmation the user sees:

- cadastral reference;
- verified area;
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

## Acceptance checklist

### UX

- [ ] A user understands that pointing on the map is the recommended method.
- [ ] RC search remains easy to discover.
- [ ] Nearby search is available but not visually dominant.
- [ ] Catastro vs Mi Campo surface difference is immediately understandable.
- [ ] It is obvious that nothing is saved before confirmation.
- [ ] `No es mi parcela` is easy to find.
- [ ] Mobile layout remains usable at ~360 px width.

### Safety / trust

- [ ] DGC is clearly identified as the official source.
- [ ] Catastro and SIGPAC are never presented as equivalent.
- [ ] The confirmation explains server-side re-verification.
- [ ] The lab is impossible to open when `VITE_CATASTRO_UI_LAB` is disabled.
- [ ] No lab interaction performs network writes.

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
3. run the full Catastro and MVP/technical gates again;
4. only then decide whether to update PR #182 or create a replacement PR.
