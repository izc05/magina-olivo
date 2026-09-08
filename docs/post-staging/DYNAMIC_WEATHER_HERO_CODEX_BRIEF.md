# Dynamic Weather Hero — Codex implementation brief

Status: **post-staging / ready for technical verification**  
Repository: `izc05/magina-olivo`  
Reference baseline: `staging/candidate-v11-2026-09-05`  
Safety rule: **do not modify or move V11**. Do not merge this feature into the integration candidate while staging P0 #7 remains open.

## 1. Goal

Add a lightweight, dynamic weather layer over the existing main olive-grove hero image so the Mágina Olivo home screen feels alive and locally connected without replacing the photography.

The hero must visually represent the user's current/local weather with transparent animated overlays:

- sunny
- partly cloudy
- cloudy
- light rain / rain
- storm
- fog
- clear night
- cloudy night

The effect must remain subtle, readable and performant on mobile/PWA. It is a visual context layer, not an agronomic recommendation engine.

## 2. Product intent

The current hero photo remains the visual identity. Weather is rendered above it as separate, non-interactive layers.

Conceptual stack:

```text
Hero content / text / buttons
            ↑
Weather light / tint
Cloud / fog overlays
Rain / storm canvas
            ↑
Existing olive-grove hero photo
```

All weather layers must use `pointer-events: none` and must never block navigation or CTA interaction.

## 3. Current repository context to preserve

Mágina web currently uses React + TypeScript + Vite and is a PWA. Do not introduce a large rendering framework by default.

Existing weather work includes:

- `apps/web/src/MaginaWeatherPage.tsx`
- `apps/web/src/WeatherRainAlertSummary.tsx`
- `apps/web/src/weather-radar.css`
- `apps/web/src/weather-rain-alerts.css`
- public weather API calls under `/api/v1/public/weather`
- radar frames under `/api/v1/public/weather/radar/frames`
- radar refresh already scheduled every 5 minutes

The home hero currently lives in `HomeTab` inside `apps/web/src/App.tsx` and uses `<section className="hero">`.

Do not duplicate weather provider logic if existing server-side services can be safely reused.

## 4. External technical references

These are **reference implementations**, not dependencies to copy wholesale.

### Preferred reference: Canvas 2D + CSS

`greywen/web-weather`

- browser weather visualization
- Canvas 2D particle engine
- CSS cloud/fog overlays
- sunshine, rain, clouds, fog, storms, day/night
- real-weather mapping and timed refresh

Use its architecture as inspiration for a lightweight Mágina-specific implementation.

### Rich visual reference

`rauschermate/react-weather-effects`

- React
- WebGL
- Three.js
- shaders
- rain / storm / fog / snow

Do **not** add Three.js/WebGL to Mágina V1 unless Codex profiling proves Canvas/CSS cannot meet the visual target.

### Rain reference

`codrops/RainEffect`

Useful inspiration for premium rain/wet-glass effects, but **not required** in first implementation.

## 5. Architecture decision

### 5.1 Rendering

Use a hybrid approach:

1. CSS gradients for sun, warmth, dusk/night and cloudy tint.
2. CSS/DOM layers for clouds and fog.
3. Canvas 2D for rain particles and optional lightweight lightning flash.
4. No audio.
5. No user interaction inside weather overlays.

### 5.2 Data flow

Target flow:

```text
weather provider(s)
        ↓
Mágina API / server-side normalizer
        ↓
WeatherVisualState
        ↓
useWeatherHero()
        ↓
WeatherHeroOverlay
        ↓
CSS + Canvas layers
```

Do not expose provider keys in the frontend.

### 5.3 Provider verification requirement

Before implementation, Codex must inspect the existing weather backend and determine whether the current AEMET integration exposes enough **current-condition** information for:

- rain intensity/current precipitation
- cloud cover/current sky state
- day/night
- wind speed/direction
- fog/storm indication

If existing AEMET data is sufficient, reuse it.

If it is not sufficient for a truthful near-real-time visual state, add a provider abstraction server-side. Open-Meteo may be evaluated as a keyless current-condition source, but it must not bypass the Mágina backend contract. AEMET remains the existing official forecast/radar source unless the project later decides otherwise.

The frontend must consume a normalized Mágina response and must not hard-code third-party provider behavior.

## 6. Proposed normalized contract

Create or derive a frontend-safe visual state similar to:

```ts
export type WeatherHeroCondition =
  | 'sunny'
  | 'partly-cloudy'
  | 'cloudy'
  | 'rain'
  | 'storm'
  | 'fog'
  | 'night-clear'
  | 'night-cloudy';

export type WeatherVisualState = {
  condition: WeatherHeroCondition;
  isDay: boolean;
  temperatureC: number | null;
  precipitationMm: number | null;
  precipitationProbabilityPercent: number | null;
  cloudCoverPercent: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  updatedAt: string | null;
  sourceMode: 'live' | 'cache' | 'degraded-cache' | 'unknown';
};
```

The exact backend schema may differ if existing contracts already cover the same semantics. Prefer adapting over duplicating.

## 7. Proposed files

Codex should verify existing feature organization before creating files. Suggested layout:

```text
apps/web/src/weather-hero/
  weatherHeroTypes.ts
  weatherHeroMapper.ts
  useWeatherHero.ts
  WeatherHeroOverlay.tsx
  WeatherRainCanvas.tsx
  weather-hero.css
  weatherHeroMapper.test.ts
  weatherHeroSource.test.ts
```

If the current repository conventions favor flat `apps/web/src/*` files, keep repository consistency rather than forcing this folder structure.

Likely integration file:

```text
apps/web/src/App.tsx
```

Potential backend files depend on current weather service location and must be discovered before editing.

## 8. Home integration

The home hero should conceptually become:

```tsx
<section className="hero hero--weather">
  <img className="hero-image" src="..." alt="" />
  <WeatherHeroOverlay state={weatherState} />
  <div className="hero-content">
    ...existing home content...
  </div>
</section>
```

If the current hero image is implemented as CSS background rather than an `<img>`, preserve the current semantic/layout approach and place overlays with absolute positioning.

Do not redesign the entire Home page as part of this feature.

## 9. Visual rules

### Sunny

- subtle warm radial glow, preferably upper-right or based on design composition
- low opacity
- no cartoon sun icon floating over the landscape

### Partly cloudy

- one slow cloud layer
- image remains bright

### Cloudy

- two low-opacity cloud layers
- slight cool/dim tint

### Rain

- cloud tint + Canvas 2D rain
- rain intensity derived from truthful weather state where available
- transparent streaks only; landscape remains visible

### Storm

- stronger cloud tint
- denser rain
- optional brief CSS/Canvas lightning flash
- lightning must be infrequent and accessibility-safe

### Fog

- soft translucent gradient/blur layer
- avoid obscuring text and controls

### Night

- cool dark overlay
- no need for stars/moon in V1
- if cloudy night, combine with subtle cloud layer

## 10. Opacity guidance

Weather must enhance, not hide, the image.

Recommended starting ranges:

- sunlight: 0.08–0.22
- cloud overlays: 0.15–0.35
- rain streaks: 0.16–0.28
- fog: 0.18–0.38
- night tint: 0.22–0.38

These are tuning ranges, not fixed requirements. Verify text contrast after implementation.

## 11. Weather mapping rules

Mapping must be deterministic and tested.

Example logic only:

```text
storm signal -> storm
fog signal -> fog
current precipitation > threshold -> rain
cloud cover >= high threshold -> cloudy
cloud cover >= medium threshold -> partly-cloudy
isDay=false + high cloud -> night-cloudy
isDay=false -> night-clear
otherwise -> sunny
```

Do not infer a storm solely from a high precipitation probability.

Do not show current rain merely because tomorrow's forecast says rain.

The visual state must describe the current/near-current condition, not a future forecast, unless the UI explicitly labels it as forecast.

## 12. Refresh behavior

Target refresh interval: **5 minutes** while the page is active.

Requirements:

- initial fetch on mount
- refresh every 5 minutes while visible
- pause network refresh while document is hidden
- refresh immediately when returning to visible state if data may be stale
- abort obsolete requests on unmount/state change
- avoid overlapping requests

Do not run a faster interval without a demonstrated need.

## 13. Offline/PWA behavior

Mágina must degrade gracefully.

If live weather is unavailable:

1. use the last valid cached visual state when it is within the approved freshness window;
2. mark data as cached/degraded where the user sees weather status text;
3. if no valid state exists, render the normal hero image with no animated weather;
4. never fabricate a condition.

Weather animation must not prevent the app from loading offline.

## 14. Performance requirements

This feature must be mobile-first.

### Canvas

- use `requestAnimationFrame`
- stop animation when `document.visibilityState !== 'visible'`
- cancel RAF on unmount
- scale to actual hero bounds, not full viewport
- cap device pixel ratio if profiling shows high GPU cost
- use a bounded reusable particle array
- avoid per-frame React state updates

Suggested starting particle counts:

- low/mobile: 35–70
- normal: 70–120
- heavy/storm: max around 140 unless profiling supports more

Counts are guidelines; profile real devices.

### Dependencies

Do not add Three.js, react-three-fiber, GSAP or Framer Motion just for this feature in V1 unless explicitly justified by bundle/performance evidence.

## 15. Accessibility

Mandatory:

### `prefers-reduced-motion`

If `prefers-reduced-motion: reduce`:

- disable continuous rain/cloud movement, or reduce to a static visual treatment
- disable lightning flashes
- preserve weather text/status

### Semantics

- overlays use `aria-hidden="true"`
- canvas is decorative
- weather condition text remains normal accessible DOM content
- no status conveyed by animation/color alone

### Contrast

Verify hero text against every visual state.

If necessary, add a stable text scrim/gradient behind hero copy rather than increasing global darkness excessively.

## 16. Suggested UI copy

Optional compact status in the hero:

```text
Huelma · 24°
Lluvia ligera
Actualizado hace 5 min
```

Or:

```text
Clima en vivo
24° · Lluvia ligera
```

Do not claim "en vivo" if the data contract/provider freshness cannot support that wording. Use "Tiempo actual" or "Última actualización" instead.

## 17. Location strategy

V1 should use the best location already available in Mágina without prompting unnecessarily.

Priority target:

1. active plot coordinates when reliably available;
2. active farm/holding municipality;
3. selected Mágina municipality;
4. conservative default only if current product behavior already has one.

Do not request browser geolocation on every app open if Mágina already knows the user's field location.

Future enhancement: per-plot hero weather using parcel coordinates.

## 18. Testing requirements

Add tests for at least:

### Mapping

- sunny
- partly cloudy
- cloudy
- rain
- storm
- fog
- night-clear
- night-cloudy
- null/partial data
- degraded cache

### Source/structure

- `WeatherHeroOverlay` is present in Home only
- overlays are decorative / non-interactive
- reduced-motion handling exists
- 5-minute refresh exists
- refresh is visibility-aware
- no direct third-party weather API key/client call is introduced in Home

### Manual

- Android/mobile viewport
- desktop viewport
- PWA installed mode
- offline cold start
- online -> offline -> online
- reduced-motion enabled
- low-end/throttled CPU profile
- all hero buttons remain clickable
- no significant layout shift
- text remains readable in sunny/cloudy/rain/night states

## 19. Acceptance criteria

Feature is accepted only if all are true:

- [ ] Existing hero photography remains the base image.
- [ ] Weather overlays are transparent and non-interactive.
- [ ] Current condition changes produce deterministic visual states.
- [ ] Weather refresh is approximately every 5 minutes while visible.
- [ ] No fabricated weather is shown when providers fail.
- [ ] Cached/degraded behavior is explicit and safe.
- [ ] Rain is rendered with lightweight Canvas 2D or equally lightweight technique.
- [ ] Clouds/fog/light are lightweight CSS/DOM overlays.
- [ ] `prefers-reduced-motion` is respected.
- [ ] Animation stops when the page is hidden.
- [ ] Mobile performance is acceptable.
- [ ] Hero text meets contrast/readability expectations.
- [ ] Existing Home functionality and navigation remain unchanged.
- [ ] Existing weather page/radar behavior is not regressed.
- [ ] Web tests, typecheck and build pass.
- [ ] MVP Core Smoke passes.
- [ ] Technical Spike Smoke passes if still required by current integration process.

## 20. Codex verification checklist before coding

Codex must first report:

1. exact current Home hero implementation and image source;
2. exact existing weather backend/provider path;
3. whether current AEMET data is enough for truthful current-condition visuals;
4. whether a new endpoint/contract is needed;
5. expected additional bundle size;
6. how reduced-motion will be implemented;
7. how animation will be paused offscreen/hidden;
8. what tests will be added;
9. confirmation that V11 and its SHA are untouched.

Only then implement on a new feature branch created from the appropriate post-staging integration base.

## 21. Suggested future implementation branch

After staging P0 #7 is closed and the project owner chooses the current integration base:

```text
feat/dynamic-weather-hero-v1
```

Do not implement this feature directly on:

```text
staging/candidate-v11-2026-09-05
```

## 22. Out of scope for V1

- audio rain/thunder
- 3D weather
- Three.js scenes
- full wet-glass refraction
- volumetric clouds
- animated terrain
- weather-driven agronomic prescriptions
- replacing the full Home screen design

## 23. Desired result

Mágina Olivo should feel like the landscape is reacting subtly to the real local weather:

```text
sun -> warm light
clouds -> slow translucent movement
rain -> fine rain over the olive grove
storm -> darker atmosphere + rain + rare safe flash
fog -> soft veil
night -> cool, calm tint
```

The effect must remain elegant, agricultural and calm — never game-like or distracting.
