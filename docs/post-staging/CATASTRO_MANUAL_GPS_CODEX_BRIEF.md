# Codex Brief — Catastro Manual + GPS

## Authority

Read first:

1. `AGENTS.md`
2. `docs/mvp/CATASTRO_MANUAL_GPS_V1.md`
3. `docs/mvp/PLOT_BOUNDARY_V2.md`
4. `docs/mvp/SIGPAC_OVERLAY_V1.md`
5. `docs/design/PARCEL_MAP_FIRST_V1.md`
6. `docs/SECURITY.md`

Working branch:

`feat/catastro-manual-gps-v1`

Frozen base:

`staging/candidate-v11-2026-09-05`

SHA:

`063767560fe824c3415f200e0314dc5b2e8f4122`

Do not modify the V11 candidate branch. Do not merge this feature while staging acceptance is still open.

## Product decision — do not reinterpret

The parcel onboarding UX has two primary Catastro selection methods:

```text
[ Manual ] [ GPS ]
```

### Manual

The user navigates the map and taps **inside** the parcel.

Expected behavior:

```text
map click
 -> WGS84 lat/lon
 -> GET /api/v1/maps/catastro/identify
 -> official Catastro coordinate service
 -> cadastral reference(s)
 -> INSPIRE WFS GetParcel
 -> render candidate geometry
 -> user confirms
 -> POST /api/v1/plots/:plotId/import-catastro
 -> server re-fetches GetParcel
 -> validate + store official boundary
```

### GPS

The user is physically on the parcel and taps `Localizar mi parcela`.

Expected behavior:

```text
navigator.geolocation
 -> show approximate accuracy
 -> exact Catastro coordinate lookup
 -> if exact lookup has no reference, distance lookup
 -> WFS geometry for candidates
 -> user reviews candidate(s)
 -> explicit confirmation
 -> server verified import
```

Do not auto-import the closest parcel.

## Current implementation

### Backend

`apps/api/src/catastro-client.ts`

Contains:

- `CATASTRO_WFS_URL`
- `CATASTRO_COORDINATE_JSON_URL`
- `buildCatastroPointUrl()`
- `parseCatastroCoordinateJson()`
- `identifyCatastroParcelsAtPoint()`
- existing `fetchCatastroParcelByReference()`

Coordinate services:

```text
Consulta_RCCOOR
Consulta_RCCOOR_Distancia
```

Geometry service:

```text
INSPIRE WFS GetParcel
```

`apps/api/src/catastro-map-routes.ts`

New endpoint:

```text
GET /api/v1/maps/catastro/identify
```

Query:

```text
lat
lon
nearby=0|1
```

The route MUST remain authenticated.

The route MUST NOT write parcel data.

### Frontend

`apps/web/src/CatastroParcelPanel.tsx`

Contains:

- Manual/GPS mode selector;
- lightweight OSM map;
- manual click conversion to WGS84;
- GPS request initiated only from user action;
- candidate polygon overlay;
- proximity result messaging;
- explicit selection of candidate;
- two-step import confirmation.

`apps/web/src/catastro-panel.css`

Contains the responsive visual treatment.

Integration already exists through:

```text
App
 -> FieldTab
 -> FieldNotebook
 -> PlotMapPanel
 -> CatastroParcelPanel
```

Do not create a second standalone Catastro app or duplicate the screen elsewhere.

## Security invariants

These are non-negotiable.

### 1. Client cannot declare official provenance

The frontend must never send:

```json
{
  "boundarySource": "catastro"
}
```

or:

```json
{
  "source": "catastro"
}
```

for a normal boundary update.

### 2. Import accepts cadastral reference, not trusted GeoJSON

Correct:

```http
POST /api/v1/plots/:plotId/import-catastro
```

```json
{
  "cadastralReference": "XXXXXXXXXXXXXX"
}
```

### 3. Server re-fetch is mandatory

`import-catastro` must call:

```text
fetchCatastroParcelByReference(reference)
```

before setting:

```text
boundary_source = 'catastro'
```

### 4. Keep holding/farm authorization

Never weaken `getFarmAccess`, `canWrite`, holding isolation, session checks or 404 anti-enumeration behavior.

### 5. External responses are untrusted input

Maintain:

- finite coordinate validation;
- timeout;
- response-size limits;
- reference format validation;
- max candidate count;
- geometry validation before persistence.

## Required verification before marking ready

Run from repo root:

```bash
npm ci
npm --workspace apps/api test
npm --workspace apps/api run typecheck
npm --workspace apps/web test
npm --workspace apps/web run typecheck
npm --workspace apps/web run build
```

Also run the repository smoke gates applicable to the branch.

## Manual acceptance scenarios

### Scenario A — manual exact match

1. Open Mi Campo.
2. Select an existing Mágina parcel.
3. Open Catastro block.
4. Choose Manual.
5. Center on the olive grove.
6. Tap clearly inside the parcel.
7. Verify candidate polygon appears.
8. Verify reference and surface are visible.
9. Tap `Esta es mi parcela`.
10. Verify a second confirmation is required.
11. Confirm.
12. Reload.
13. Verify source is Catastro and reference persists.

### Scenario B — GPS

1. Open on a phone with HTTPS.
2. Choose GPS.
3. Tap `Localizar mi parcela`.
4. Grant location permission.
5. Verify approximate accuracy is displayed.
6. Verify Catastro candidate(s) appear.
7. Confirm one only after reviewing its geometry.

### Scenario C — denied GPS

1. Deny location permission.
2. Verify no crash.
3. Verify message instructs user to enable permission or use Manual.
4. Switch to Manual and continue.

### Scenario D — point near boundary

1. Use a point near a path/linde.
2. Exact lookup may return nothing.
3. Nearby lookup may return multiple candidates.
4. UI must not auto-import any candidate.
5. User can select the intended one.

### Scenario E — Catastro unavailable

1. Simulate upstream error/timeout.
2. API returns controlled `CATASTRO_UNAVAILABLE`.
3. Existing private parcel data remains unchanged.
4. UI offers retry through another selection action.

## Known V1 technical debt

### GML geometry parsing

The current parser is deliberately conservative. It treats collected `posList` rings safely enough for simple current imports but is not the final solution for all GML structures.

Future task:

- parse XML structurally;
- distinguish exterior vs interior rings;
- preserve holes;
- preserve MultiSurface / MultiPolygon semantics;
- add fixtures from real Catastro responses;
- only then widen automatic import beyond simple polygons.

Do not silently reinterpret multiple rings as unrelated polygons in a new implementation.

### Basemap

Current map uses OpenStreetMap tiles to avoid adding another provider during this feature.

Future visual enhancement may add an authorized PNOA/IGN orthophoto or other licensed imagery. Keep provider attribution and usage terms explicit.

## Definition of done for this branch

- code compiles;
- tests pass;
- manual and GPS modes are visible in Mi Campo;
- GPS permission is user-triggered;
- candidates come from official Catastro services;
- selected geometry is visible;
- import is double-confirmed;
- import is re-fetched server-side;
- SIGPAC remains independent;
- docs match code;
- PR remains Draft until V11 staging acceptance allows post-staging integration.
