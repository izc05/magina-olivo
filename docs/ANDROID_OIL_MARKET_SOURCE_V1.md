# Android Oil Market Source V1

Status: source/architecture decision for the future Home market module.

Verified: 2026-09-19.

## Goal

Provide a read-only olive-oil market block for Mágina Olivo with current Andalusian origin prices and a short historical series for:

- Virgen Extra;
- Virgen;
- Lampante.

The market module is informational. It must never block the offline farm-management core.

## Primary public source

Primary reference:
Junta de Andalucía — Observatorio de Precios y Mercados, subsector "Aceites de oliva".

Current public page:
https://www.juntadeandalucia.es/agriculturaypesca/observatorio/servlet/FrontController?action=UltimosPrecios&posicion=2291332&producto=33000&subsector=33

On 2026-09-19 the page exposed validated weekly origin prices through week 37 (7–13 September 2026) and separate rows for:

- LAMPANTE (1 g);
- VIRGEN;
- VIRGEN-EXTRA.

The Observatorio states that these are latest prices in Almazara or Bodega registered and validated in its system.

## Open-data catalogue caveat

The Junta open-data catalogue also advertises CSV/JSON resources for agricultural prices under CC BY 4.0 and a nominal daily update frequency.

However, the currently exposed directory for those legacy resources shows stale/empty files. Therefore:

- do not consume those legacy CSV/JSON files as the production feed until a live resource is verified;
- do not infer freshness from the catalogue metadata alone;
- use the live Observatorio page as the primary source for V1.

## Architecture

Android must not scrape the Observatorio directly.

Use a backend adapter:

```
Junta Observatorio
      ↓
Supabase Edge Function: oil-market
      ↓
normalized JSON contract
      ↓
Android OilMarketRepository
      ↓
local cache
      ↓
Home market card / detailed market screen
```

Reasons:

- isolates HTML/source changes from the APK;
- centralizes attribution and parsing;
- supports rate limiting and caching;
- keeps Android offline-friendly;
- allows replacing/adding providers later without changing UI/domain contracts.

## Normalized backend contract

Suggested response:

```json
{
  "provider": "Junta de Andalucía · Observatorio de Precios y Mercados",
  "sourceType": "validated_origin_prices",
  "unit": "EUR_PER_KG",
  "updatedAt": "2026-09-19T00:00:00Z",
  "latestWeek": {
    "week": 37,
    "startDate": "2026-09-07",
    "endDate": "2026-09-13"
  },
  "series": [
    {
      "category": "EXTRA_VIRGIN",
      "points": [
        {"week": 37, "startDate": "2026-09-07", "endDate": "2026-09-13", "price": 3.63}
      ]
    }
  ]
}
```

The values above are examples of the shape, not fixtures for production.

## Domain model

```kotlin
enum class OliveOilCategory {
    EXTRA_VIRGIN,
    VIRGIN,
    LAMPANTE,
}

data class OliveOilPricePoint(
    val category: OliveOilCategory,
    val week: Int,
    val startDate: String,
    val endDate: String,
    val priceEurPerKg: Double,
)

data class OilMarketSnapshot(
    val provider: String,
    val fetchedAtEpochMs: Long,
    val sourceUpdatedAt: String?,
    val points: List<OliveOilPricePoint>,
    val degraded: Boolean,
)
```

## Freshness

The backend and Android repository must expose freshness explicitly.

Recommended states:

- LIVE: source fetched successfully;
- CACHED: last valid snapshot is shown;
- STALE: cache older than the configured threshold;
- UNAVAILABLE: no source and no cache.

The UI must show the week/date of the latest point. Never show a price without its period.

## Cache rules

- Edge Function: cache source response to avoid unnecessary hits.
- Android: persist the last valid normalized snapshot locally.
- Network failure must not erase a previous valid snapshot.
- Parsing failure must not overwrite the last valid snapshot.

## Parsing guardrails

The backend parser must validate:

- all three required categories when present;
- decimal comma conversion;
- week number and date range;
- numeric price > 0;
- no duplicate category/week pair;
- chronological order;
- source page still identifies the olive-oil subsector.

If parsing changes unexpectedly, return a controlled error and keep serving the last validated cache.

## Attribution

The UI must visibly identify the source as Junta de Andalucía / Observatorio de Precios y Mercados.

Do not present these values as Mágina Olivo's own market assessment.

## Scope V1

V1:
- latest value for Extra Virgin, Virgin and Lampante;
- 8-week trend;
- week/date;
- source attribution;
- offline cache;
- graceful stale state.

Out of scope for V1:
- forecasts;
- buy/sell recommendations;
- cooperative-specific offers;
- user-entered commercial contracts;
- POOLred subscription integration;
- international prices.

## Gate proposal

Future implementation gate should verify:

1. backend parser against captured source fixtures;
2. normalization of decimal commas;
3. exact category mapping;
4. stale/cache fallback;
5. Android unit tests;
6. debug build;
7. no direct Observatorio HTTP call in Android sources;
8. visible source attribution in UI.

## Canonical decision

For Oil Market V1:

- primary source = live Junta de Andalucía Observatorio page;
- transport/parsing = Supabase Edge Function;
- Android consumes only the normalized backend contract;
- local cache is mandatory;
- legacy open-data CSV/JSON is not trusted as production feed until independently verified live.
