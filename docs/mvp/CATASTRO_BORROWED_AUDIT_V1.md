# Catastro Borrowed-Code Audit V1

Status: **implementation complete on isolated branch; merge gated by CI/review**  
Branch: `feat/catastro-borrowed-audit-v1`  
Base integration candidate: `063767560fe824c3415f200e0314dc5b2e8f4122`  
Target branch: `feat/integration-v2-mvp-v1`  
Public Pages deployment: **forbidden**. This branch must never replace the Visual V2 GitHub Pages review app.

## 1. Goal

Make parcel lookup in Mágina Olivo practical for an olive grower while keeping the existing security/provenance model:

1. locate a working plot in `Mi Campo`;
2. identify a cadastral parcel by reference, by a point already placed on the map, or by a bounded nearby search;
3. inspect official DGC geometry and metadata;
4. explicitly confirm the selected parcel;
5. re-fetch it server-side from the official Catastro service before persisting anything;
6. store the verified parcel base reference and boundary provenance.

The implementation deliberately borrows proven ideas from open-source Catastro integrations, but it does not import copyleft code into Mágina core unless the repository license is compatible with the intended distribution model.

## 2. Existing V11 baseline audited

The frozen integration candidate already had a sound first Catastro implementation:

- authenticated backend adapter to the official DGC INSPIRE WFS;
- bounded BBOX queries;
- 8 s upstream timeout;
- 2 MB XML response cap;
- max 80 features;
- server-side re-fetch by cadastral reference before import;
- farm/holding authorization and write-role checks;
- source provenance (`boundary_source = 'catastro'`, external id and checked timestamp);
- explicit warning that Catastro and SIGPAC are independent data sources;
- complex geometry blocked from lossy automatic import.

The V1 audit therefore extends the existing adapter instead of replacing it.

## 3. Open-source sources reviewed

### 3.1 `nkz-os/catastro-sp-module-nekazari`

Source: https://github.com/nkz-os/catastro-sp-module-nekazari  
License: **AGPL-3.0** (declared in repository README).

Useful ideas reviewed:

- reverse geocoding / parcel query from coordinates;
- click-to-add workflow;
- agricultural parcel UX;
- server endpoint concept `query-by-coordinates`;
- PostGIS-oriented parcel cache architecture.

Decision: **PATTERN ONLY in Mágina core.** No literal Nekazari source is copied into `apps/api` or `apps/web`, because embedding AGPL code could impose network copyleft obligations on the combined application. If a future decision is made to run a modified Nekazari service separately, that service must have its own AGPL compliance plan and published corresponding source.

### 3.2 `asolabre/catastroesp`

Source: https://github.com/asolabre/catastroesp  
License: **GPL-3.0** (`LICENSE`).

Useful ideas reviewed:

- RC lookup;
- province / municipality / polygon / parcel workflows;
- historical and bulk cadastral operations;
- GML-oriented GIS workflows.

Decision: **PATTERN ONLY in Mágina core.** No GPL source imported.

### 3.3 `gisce/pycatastro`

Source: https://github.com/gisce/pycatastro  
License: **GPL-3.0** (`LICENSE`).

Useful ideas reviewed:

- public Catastro coordinate-service operations;
- coordinate-to-RC interface shape.

Decision: **PATTERN ONLY in Mágina core.** No GPL source imported.

### 3.4 `rOpenSpain/CatastRo`

Source: https://github.com/rOpenSpain/CatastRo  
License: **GPL-2** (`DESCRIPTION`).

Useful ideas reviewed:

- public OVC endpoint catalogue;
- coordinate / reference conversion patterns;
- INSPIRE and OVC separation.

Decision: **PATTERN ONLY in Mágina core.** No GPL source imported.

### 3.5 `sigdeletras/Leaflet.Spain.WMS`

Source: https://github.com/sigdeletras/Leaflet.Spain.WMS  
License: **CC BY 3.0** as declared by the repository.

Useful ideas reviewed:

- Spanish public WMS layer composition;
- Catastro / imagery overlay UX.

Decision: **NOT IMPORTED.** Mágina does not need the Leaflet-specific implementation for this Catastro API increment.

### 3.6 `carlosGalisteo/catastro_mcp_server`

Source: https://github.com/carlosGalisteo/catastro_mcp_server  
README declaration: **MIT**, copyright 2026 Carlos Galisteo.

Audit finding: the README says an included `LICENSE` file contains the MIT terms, but the repository root inspected on `main` does not contain `LICENSE`; the same file is absent from tag `v0.1.3`. `pyproject.toml` also does not currently declare a license field.

Useful ideas reviewed:

- accept RCs of 14/18/20 characters and operate on parcel base 14;
- separate OVC lookups from INSPIRE WFS geometry;
- parcel GML/GeoJSON workflows;
- coordinates ↔ cadastral reference workflows.

Decision: **LICENSE HOLD FOR LITERAL COPYING.** The declared MIT intent is noted, but no literal source from this repository is imported into Mágina until the upstream licensing inconsistency is resolved or explicit licensing evidence is obtained. The public service behavior and interface concepts are reimplemented against the official DGC services.

## 4. What was implemented in Mágina

### API

`apps/api/src/catastro-client.ts`

- accepts cadastral references of 14, 18 or 20 alphanumeric characters;
- normalizes them to the cadastral parcel base (first 14 characters) before WFS `GetParcel` and persistence;
- preserves the official bounded WFS adapter;
- adds validated point queries;
- identifies the parcel whose official geometry contains a selected WGS84 point;
- parses polygon holes as interior rings instead of incorrectly turning every `posList` into a separate polygon;
- preserves multiple independent polygon patches as `MultiPolygon`;
- uses point-in-polygon logic that excludes interior holes and handles boundary points;
- introduces a typed `CatastroParcelNotFoundError` so not-found can be distinguished from upstream failure.

`apps/api/src/catastro-map-routes.ts`

- existing `GET /api/v1/maps/catastro/parcelas` retained for bounded nearby search;
- new authenticated `GET /api/v1/maps/catastro/parcela?reference=...`;
- new authenticated `GET /api/v1/maps/catastro/parcela-en-punto?longitude=...&latitude=...`;
- 400 for invalid input, 404 for a valid lookup with no parcel, 502 for DGC/upstream failure;
- private five-minute response cache retained;
- import accepts 14/18/20 input but persists only the verified 14-character parcel base;
- all imports remain server-side re-fetched and authorization-gated.

### Web UX

`apps/web/src/CatastroParcelPanel.tsx`

A grower can now find a parcel in three ways:

1. **Buscar por referencia** — accepts RC 14/18/20;
2. **Buscar parcela bajo el punto** — uses the point previously placed inside the terrain from Mi Campo;
3. **Buscar parcelas catastrales cercanas** — keeps the original bounded-area fallback.

All three feed the same result/review surface. Import still requires explicit confirmation and the server independently verifies Catastro again.

Complex cadastral geometry (multipolygon or polygon with holes) remains consultable but cannot be reduced to the current simple private plot polygon automatically. This is intentional loss-prevention, not a missing validation.

## 5. Security audit

### PASS — authentication

Every new Catastro endpoint requires `getAuthenticatedSession`.

### PASS — no arbitrary upstream URL / SSRF surface

Clients send only bounded numbers or a cadastral reference. The upstream DGC URL remains hard-coded in the server adapter.

### PASS — bounded spatial query

BBOX span remains capped. Point lookup converts one validated WGS84 point into a very small server-controlled BBOX.

### PASS — resource limits

- upstream timeout: 8 s;
- XML response cap: 2 MB;
- result cap: 80 parcels;
- parser limits polygon/ring accumulation.

### PASS — trust boundary

The browser never supplies a geometry that is directly persisted as Catastro provenance. On import, the API re-fetches the official parcel by RC and validates the geometry before updating the plot.

### PASS — authorization

Import still verifies active plot, holding ownership/access and a writable role.

### PASS — public/private data separation

Only non-protected cadastral parcel geometry/metadata used by the public services is exposed by this adapter. Mágina's farm/plot association remains private authenticated application data.

## 6. Data-integrity audit

### PASS — Catastro vs SIGPAC separation

No attempt is made to treat Catastro as SIGPAC or vice versa. The UI keeps an explicit warning and provenance fields remain distinct.

### PASS — 18/20 character RC normalization

Full property RC input is useful to the user, but parcel geometry is queried/stored using the first 14 characters. Existing DB constraint remains a 14-character parcel reference.

### PASS — holes and multipolygons

The parser now distinguishes:

- one polygon with interior rings → `Polygon` with multiple rings;
- independent polygon patches → `MultiPolygon`.

Automatic import stays limited to one simple exterior ring until the Mágina private boundary model explicitly supports complex geometry.

## 7. Test gate

The branch adds/updates unit and source-contract tests for:

- bounded official WFS URL;
- RC 14/18/20 validation and normalization;
- point validation;
- GML → WGS84 parsing;
- polygon interior-ring preservation;
- multipolygon preservation;
- point containment and holes;
- WFS exception rejection;
- authenticated direct-reference and point routes;
- browser wiring for all three search modes;
- server-side verified import;
- complex-geometry no-loss gate.

Required PR gate:

```bash
npm ci --no-audit --no-fund
npm run typecheck
npm test
npm run build --workspace @magina/web
```

GitHub workflow `MVP Core Smoke` runs typecheck and tests for PRs targeting `feat/integration-v2-mvp-v1`.

## 8. Deployment / merge gate

- Do **not** merge directly into `main`.
- Do **not** deploy this branch to GitHub Pages.
- Open a PR into `feat/integration-v2-mvp-v1` only.
- Require `MVP Core Smoke` green.
- Preserve the frozen base candidate until the PR is explicitly accepted.
- Staging should verify one real Jaén/Sierra Mágina parcel by each applicable search path before release.

## 9. Remaining optional P2 work

Not required for this V1 merge:

- municipality → polygon → parcel form backed by official non-protected services;
- direct click event from the map editor that invokes point lookup without first saving/placing the working point;
- true complex `Polygon`/`MultiPolygon` private boundary storage with PostGIS geometry column;
- PostGIS spatial cache for repeated Catastro analytics;
- Navarra/Euskadi regional cadastre provider abstraction;
- upstream follow-up to obtain an unambiguous license artifact for `catastro_mcp_server` before any literal source reuse.

## 10. Audit verdict

**READY FOR PR / CI.**

The Catastro module now exposes the useful agricultural workflows identified in the reviewed open-source projects while preserving Mágina's security, source provenance and private-app license boundary. Copyleft code is not silently mixed into the core repository, and the one source that declares MIT but lacks its promised license artifact is explicitly quarantined from literal copying pending resolution.
