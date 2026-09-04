# Measurement & Privacy V1

## Purpose

Measure whether Mágina Olivo's public discovery surfaces are useful and which acquisition channels produce real activation, without turning private agricultural data into analytics data.

This document defines the activation contract for Growth V1. Technical preparation may live in PR #38, but collection MUST remain disabled until staging/pilot and the privacy/legal review are complete.

## Default state

Growth measurement is OFF by default.

Frontend build requirements:

- `VITE_PUBLIC_GROWTH_MEASUREMENT=disabled` by default.
- `VITE_PUBLIC_GROWTH_ENDPOINT` empty by default.
- An endpoint is accepted only when it is same-origin and exactly `/api/public/growth/events`.
- Requests use `credentials: omit`.
- No third-party analytics SDK is required for Growth V1.

Activation requires an explicit production build with both the measurement flag and the approved first-party endpoint configured.

## Public surfaces allowed

Only these routes may emit Growth V1 events:

- `/magina`
- `/magina/mercado`
- `/magina/tiempo`
- `/magina/campo`
- `/magina/noticias`
- `/magina/directorio`

Private routes, authentication routes, API data routes, farms, plots, campaigns, documents and account screens are outside the measurement surface.

## Consent

Before consent, no Growth V1 network event is sent.

The public consent panel offers two choices:

- **Solo necesario** → no Growth V1 events.
- **Permitir medición anónima** → enables the approved public events.

The choice may be stored locally only to remember the preference. The consent value must never be used as an advertising identifier or cross-device identifier.

## Events allowed

### `public_page_view`

One public page view for an approved public route. The client deduplicates the same route/attribution combination before the async request resolves to avoid React StrictMode doubles.

### `share_started`

The user started a share action from a public page.

Allowed channel values:

- `native`
- `whatsapp`
- `copy`

### `share_completed`

A public share action completed where the browser surface lets us determine completion safely.

## Attribution allowed

Only low-cardinality acquisition context is allowed:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- coarse referrer category:
  - `direct`
  - `google`
  - `bing`
  - `social`
  - `other`

UTM values are length-limited and sanitized. The full referrer URL and exact referrer hostname are not part of the payload.

## Data that MUST NOT be included

The Growth V1 client or endpoint must never persist or intentionally add:

- email, name, phone or account ID;
- session ID or auth cookie;
- farm, holding, plot or campaign IDs;
- document IDs or filenames;
- harvest quantities, yield, labor or task data;
- coordinates, parcel boundaries or Catastro/SIGPAC identifiers;
- exact referrer URL;
- full user-agent string;
- device fingerprint;
- advertising IDs;
- query-string values other than the approved sanitized UTM fields.

## First-party endpoint contract

Planned endpoint:

`POST /api/public/growth/events`

The endpoint must:

1. accept only the event, route, optional channel and approved attribution enums/strings;
2. reject unknown fields rather than silently storing them;
3. reject non-public routes;
4. use strict body-size limits;
5. use abuse/rate protection without creating a persistent visitor identifier;
6. return no user profile or tracking token;
7. never set a cookie;
8. never echo submitted attribution back into HTML;
9. keep its request body out of application logs;
10. avoid retaining source IP or full user-agent in the Growth dataset.

If infrastructure logging cannot meet the approved privacy posture, Growth measurement remains disabled.

## Storage model

Preferred model: aggregate as early as practical.

Daily aggregate dimensions:

- UTC/local reporting date;
- event;
- approved public route;
- optional share channel;
- sanitized UTM source/medium/campaign;
- coarse referrer category;
- count.

Do not build a visitor-level event history for Growth V1.

## Funnel measurement

Public anonymous metrics and authenticated product activation must remain separated.

For launch reporting we need aggregate answers such as:

- Google impressions/clicks → public visits;
- public visits → registration count;
- registrations → first exploitation/farm/plot/campaign activation;
- share actions → visits from share UTM;
- D7/D30 returning-user counts.

Do not join an anonymous public event to a named user's agricultural history. Registration/activation/D7/D30 should be computed as aggregate product KPIs from the authenticated system, not by carrying a public visitor identifier into the private area.

## Weekly dashboard

Minimum weekly Growth V1 report:

| Metric | Purpose |
| --- | --- |
| Search impressions | Discoverability |
| Search clicks | Organic acquisition |
| Organic CTR | Snippet/title quality |
| Public page views by route | Useful entry surfaces |
| Visits by coarse source | Channel mix |
| `share_started` / `share_completed` | Recommendation intent |
| Visits with `utm_medium=share` | Share acquisition |
| Registrations | Acquisition conversion |
| Activated users | Quality of acquisition |
| D7 / D30 | Retention |

Prioritize activation and retention over raw downloads or page views.

## Activation checklist

Do not enable remote measurement until all are true:

- staging V5 acceptance is complete or a later approved candidate has passed the same gates;
- pilot has no P0 privacy/security defect;
- final public domain and `PUBLIC_SITE_URL` are fixed;
- privacy/legal text reflects the measurement actually used;
- consent behavior is reviewed on mobile and desktop;
- first-party endpoint contract is implemented and tested;
- server/proxy logging behavior is reviewed;
- abuse/rate controls are tested;
- a deletion/retention policy for aggregate metrics is documented;
- test traffic can be identified operationally without introducing a user identifier.

## Non-goals

Growth V1 is not an advertising platform, behavioral profiling system or cross-site tracker. It does not need a third-party analytics SDK to validate whether Mágina Olivo is being found, shared and used.
