# Dynamic Weather Hero — Production hardening addendum

Status: **post-staging / implementation guardrails**

Related brief: `docs/post-staging/DYNAMIC_WEATHER_HERO_CODEX_BRIEF.md`
Related implementation issue: `#174`

This addendum closes the non-visual gaps required before treating Dynamic Weather Hero as production-ready.

## 1. Feature flag / kill switch

Implement the feature behind a lightweight Mágina-owned flag, for example:

```text
DYNAMIC_WEATHER_HERO_ENABLED=true|false
```

or the equivalent runtime/public-config mechanism already used by the project.

Requirements:

- default OFF until staging validation is complete;
- no third-party feature-flag platform required for V1;
- disabling the flag must immediately fall back to the normal static hero;
- the flag must not alter the weather page, radar or alerts;
- production rollback must not require deleting code.

If per-user rollout is later desired, evolve the same abstraction rather than hard-coding branches in `HomeTab`.

## 2. Data freshness and provenance

The normalized weather state should expose enough metadata to answer four questions:

1. when was the condition observed/modelled?;
2. when did Mágina fetch it?;
3. when should it be considered stale?;
4. which source/mode produced it?

Preferred normalized metadata:

```ts
{
  observedAt: string | null;
  fetchedAt: string;
  expiresAt: string | null;
  sourceProvider: string;
  sourceMode: 'live' | 'cache' | 'degraded-cache' | 'unknown';
}
```

Do not overload a single `updatedAt` field with multiple meanings if backend changes are needed anyway.

## 3. Cache strategy

Do not let each browser cause an identical upstream weather call.

Target behavior:

```text
many users / same municipality or nearby weather key
                 ↓
          Mágina API cache
                 ↓
        provider only when needed
```

Codex must first inspect the existing weather cache before adding another one.

Recommended initial policy to validate against provider terms and real update cadence:

- fresh cache target: around 5 minutes for current-condition visual state;
- stale-while-revalidate window: configurable, initially 20–30 minutes if the source has not changed materially;
- beyond the approved stale window: no animated condition, use static hero and display stale/unavailable status if weather text is shown;
- radar cache remains independent because its frame cadence and payload are different.

These are starting values, not legal/provider guarantees. Provider usage policy wins.

## 4. Request resilience

Weather Hero must not create a retry storm.

Backend/provider calls should use:

- explicit timeout;
- bounded retry only for retryable failures;
- exponential/backoff behavior if current infrastructure already supports it;
- no infinite retry loop;
- no cascading failure that delays Home rendering.

If repeated provider failures occur, prefer cached/static hero over aggressive retries.

## 5. Location privacy

Use the location Mágina already knows before asking for browser geolocation.

Rules:

- do not request precise browser geolocation merely for the visual hero if holding/farm/plot location is already available;
- exact parcel coordinates must not be placed in analytics events or client logs;
- logs should use a municipality slug, coarse location key or internal non-sensitive weather cache key whenever possible;
- no raw location query strings in telemetry unless already required and approved elsewhere in the project;
- if browser geolocation is ever added later, it must be explicit, permission-based and separately documented.

## 6. One Weather Engine, multiple consumers

Do not create hero-only provider logic.

Target architecture:

```text
                  Weather Engine
                       │
        ┌──────────────┼───────────────┐
        │              │               │
   Dynamic Hero    Weather page    Rain alerts
        │              │               │
        └──────────────┼───────────────┘
                       │
                 future Today card
                 future plot context
```

Current conditions, freshness semantics and source provenance should be reusable by every weather surface.

## 7. Municipality image integration contract

Dynamic Weather Hero should be compatible with the municipality-image repository without coupling both projects together.

Recommended scene input:

```ts
type HeroSceneContext = {
  backgroundImageUrl: string | null;
  municipalitySlug: string | null;
  locationLabel: string | null;
  weather: WeatherVisualState | null;
};
```

Responsibilities stay separate:

- municipality/image service selects the correct photograph;
- Weather Engine selects the truthful condition;
- `WeatherHeroOverlay` only renders the condition over the supplied background.

This enables the future flow:

```text
Huelma image + Huelma weather
Torres image + Torres weather
Cambil image + Cambil weather
...
```

without duplicating weather logic inside the image system.

## 8. Progressive loading

Home must not wait for weather.

Required order:

1. render app shell;
2. render hero image or current static hero immediately;
3. render Home content;
4. fetch/resolve current weather;
5. fade weather overlay in only after a valid state exists.

No weather request may become a blocking dependency for first meaningful Home render.

## 9. Image performance

The dynamic overlay must not hide a poorly optimized hero asset.

When municipality imagery lands, require:

- responsive source sizes;
- AVIF/WebP where supported by the current pipeline;
- sensible fallback format;
- stable aspect ratio to prevent layout shift;
- preload/prioritize only the currently selected hero image, not every municipality image;
- no full-resolution original served unnecessarily to a mobile hero.

Measure image cost separately from animation cost.

## 10. Performance budgets

Codex must measure a baseline before and after implementation.

Suggested targets, to be adjusted after baseline measurement:

- no large new animation dependency;
- incremental weather-hero JS target: ideally <= 15–25 KB gzip if custom Canvas/CSS implementation is used;
- no meaningful regression to Home LCP attributable to weather code;
- no continuous React state update per animation frame;
- stable 30+ FPS on a representative mid/low-range Android during rain;
- CPU/GPU work stops when Home/hero is not visible or document is hidden;
- no growing particle arrays or detached canvases after repeated tab changes.

Do not fail the feature solely because an arbitrary budget is exceeded; report measurement and justify exceptions.

## 11. Offscreen behavior

Visibility handling should cover more than browser tab visibility.

Preferred behavior:

- `document.visibilityState`: stop all animation when app is hidden;
- `IntersectionObserver` or equivalent: pause Canvas/cloud movement when the Home hero is offscreen;
- restart cleanly without duplicating RAF loops;
- no animation in background navigation tabs if `HomeTab` remains mounted.

## 12. Device adaptation

Use graceful tiers rather than device fingerprinting.

Possible signals:

- reduced-motion preference;
- mobile viewport;
- measured frame performance;
- optional `navigator.deviceMemory` only as a weak hint where available.

Suggested modes:

```text
FULL
  Canvas rain + clouds + light

REDUCED
  fewer particles + slower/limited clouds

STATIC
  weather tint/static cloud treatment, no continuous animation
```

A user should never lose weather information because animation is reduced.

## 13. Transition engine

Condition changes should not pop abruptly.

Requirements:

- crossfade between overlay states;
- avoid recreating multiple expensive canvases during transition;
- target transition duration around 1.5–4 seconds depending on implementation;
- if reduced-motion is enabled, transition should be near-instant or use a minimal opacity change;
- never animate text values in a way that delays factual weather updates.

## 14. Debug / forced-state harness

Codex must provide a development-only way to verify every state without waiting for real weather.

Acceptable options:

- dev-only query parameter;
- local development control;
- Storybook-equivalent only if the project already has it;
- test fixture route/component.

Required forced states:

```text
sunny
partly-cloudy
cloudy
rain-light
rain-heavy
storm
fog
night-clear
night-cloudy
offline-cache
unavailable
reduced-motion
```

This harness must not ship as an exposed production control.

## 15. Visual regression matrix

Capture/reference at least these viewport states during implementation review:

- small Android portrait;
- common Android portrait;
- tablet portrait or wide mobile;
- desktop;

For each, verify:

- sunny;
- cloudy;
- rain;
- night;
- reduced motion;
- no-data/static fallback.

The approved product direction remains: real olive-grove photography is dominant; weather is atmospheric and transparent.

## 16. Text contrast policy

Do not tune each municipality image manually in code.

Use a stable readability strategy such as:

- bottom/side scrim behind copy;
- subtle text shadow;
- controlled overlay gradient;
- optional image metadata later if required.

Hero title/CTA must remain readable over bright sky, dark grove and rain/night states.

## 17. Analytics / observability

Only add analytics if the project already has or later adopts an analytics mechanism. Do not add a vendor just for this feature.

Useful privacy-safe events/metrics:

```text
weather_hero_state_rendered
weather_hero_provider_error
weather_hero_cache_used
weather_hero_animation_mode
weather_hero_disabled_by_flag
```

Properties may include:

- condition;
- source mode;
- freshness bucket;
- animation mode;
- municipality slug if product analytics policy permits it.

Do not include exact parcel coordinates.

Operational logs should make it possible to distinguish:

```text
provider unavailable
provider timeout
bad response
mapping failure
cache fallback
frontend rendering failure
```

## 18. Security

Mandatory checks:

- no provider API key in browser bundle;
- no secrets in Vite-exposed environment variables;
- provider response is normalized server-side before reaching Home when required;
- external image URLs follow the repository's existing image/security policy;
- weather strings rendered in DOM are treated as data, not injected HTML;
- no user-controlled condition value can become an arbitrary CSS class without validation.

## 19. Feature flag rollout

Suggested release path:

```text
OFF
 ↓
staging/dev forced states
 ↓
staging live weather
 ↓
internal/limited production activation if available
 ↓
100% production
```

At each stage verify:

- provider health;
- Home performance;
- battery/CPU behavior;
- text contrast;
- no navigation regression;
- no spike in API errors.

If per-user gradual rollout is not supported, use environment-level OFF/ON and perform the same validation sequence across environments.

## 20. Rollback plan

Rollback must be trivial:

```text
DYNAMIC_WEATHER_HERO_ENABLED=false
```

Expected result:

- normal hero returns;
- no weather Canvas instantiated;
- no hero-specific polling executed;
- weather page/radar/alerts continue normally;
- no database rollback required merely to disable presentation.

## 21. Failure-state UX

Never show contradictory presentation.

Examples:

- if state is stale beyond policy: do not keep showing animated heavy rain indefinitely;
- if condition fails to map: static hero;
- if temperature exists but condition does not: temperature may be shown only if its freshness is valid; visual overlay stays neutral;
- if image fails: preserve readable hero fallback color/gradient and weather status must not render over a broken transparent area.

## 22. Day/night correctness

Day/night must use the location/weather source semantics, not blindly the user's device clock.

Preferred order:

1. provider `isDay`/sunrise-sunset semantics for target location;
2. server-side astronomical calculation if later needed and already supported;
3. device-local time only as a last, explicitly documented fallback.

A user travelling outside Jaén should not make their Sierra Mágina parcel hero turn to night at the wrong time.

## 23. Source conflict policy

If multiple sources are introduced later, define precedence instead of averaging silently.

Codex must document:

- authoritative source per field;
- fallback source per field;
- timestamp comparison rule;
- what happens when sources disagree materially.

Do not display a synthetic "consensus" without an explicit algorithm and tests.

## 24. Admin controls — future-compatible, not V1 requirement

Do not build a full Admin editor in V1, but keep the design compatible with future controls:

```text
Dynamic Weather Hero: on/off
Animation intensity: normal/reduced/static
Storm flash: on/off
Municipality hero image override
Weather data status/source
```

Avoid hard-coding values in ways that make these impossible later.

## 25. Product copy rules

Use factual wording tied to data freshness.

Preferred:

```text
Tiempo actual
Huelma · 24°
Lluvia ligera
Actualizado hace 5 min
```

Use `Clima en vivo` only if the final source cadence and freshness semantics justify it.

If cached:

```text
Últimos datos disponibles · hace 18 min
```

If unavailable:

```text
Tiempo no disponible ahora
```

The visual overlay disappears in the final case.

## 26. Go / No-Go checklist

### GO only if

- [ ] staging P0 gate allows implementation;
- [ ] current-condition source is truthful enough for visual mapping;
- [ ] provider/cache policy is documented;
- [ ] feature flag works;
- [ ] static fallback works;
- [ ] forced-state harness covers all states;
- [ ] reduced-motion works;
- [ ] offscreen/background pause works;
- [ ] Android performance is acceptable;
- [ ] no meaningful LCP/layout regression;
- [ ] no provider key reaches frontend;
- [ ] no exact parcel coordinates enter analytics/logging;
- [ ] visual regression review passes;
- [ ] weather page/radar/alerts do not regress;
- [ ] build/typecheck/tests/smokes pass.

### NO-GO if

- weather state is inferred from future probability rather than current condition;
- Home blocks on weather;
- feature cannot be disabled without code rollback;
- animation continues aggressively in background;
- text becomes unreadable on known municipality images;
- low-end mobile behavior is unacceptable;
- stale weather can remain visually animated without freshness limits.

## 27. Codex final report template

When Codex implements this feature, its PR summary should include:

```text
Weather source used:
Current-condition fields available:
Cache/freshness policy:
Feature flag:
Files added/changed:
Bundle delta:
Performance test device/profile:
Reduced-motion behavior:
Offline behavior:
Forced-state test route/method:
Automated tests added:
Manual visual states checked:
Known limitations:
Rollback procedure:
V11 untouched: YES/NO
```

This report is part of acceptance, not optional documentation.
