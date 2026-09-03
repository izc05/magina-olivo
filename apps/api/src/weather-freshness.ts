export type WeatherFreshnessStatus = 'fresh' | 'aging' | 'stale' | 'unknown';

export type WeatherFreshness = {
  status: WeatherFreshnessStatus;
  ageHours: number | null;
};

const FRESH_MAX_HOURS = 18;
const AGING_MAX_HOURS = 36;
const MAX_FUTURE_SKEW_HOURS = 6;

function parseProviderTimestamp(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // AEMET municipality forecasts may omit a timezone. Treat that form as UTC so
  // freshness is deterministic across Docker/host/browser timezones. The 18/36h
  // thresholds intentionally leave enough margin for the small local-time offset.
  const hasExplicitZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const normalized = hasExplicitZone ? trimmed : `${trimmed}Z`;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function classifyWeatherFreshness(
  elaboratedAt: string | null | undefined,
  nowMs = Date.now(),
): WeatherFreshness {
  if (!elaboratedAt) return { status: 'unknown', ageHours: null };

  const timestamp = parseProviderTimestamp(elaboratedAt);
  if (timestamp === null || !Number.isFinite(nowMs)) {
    return { status: 'unknown', ageHours: null };
  }

  const rawAgeHours = (nowMs - timestamp) / 3_600_000;
  if (rawAgeHours < -MAX_FUTURE_SKEW_HOURS) {
    return { status: 'unknown', ageHours: null };
  }

  const ageHours = Math.max(0, Math.round(rawAgeHours * 10) / 10);
  if (ageHours <= FRESH_MAX_HOURS) return { status: 'fresh', ageHours };
  if (ageHours <= AGING_MAX_HOURS) return { status: 'aging', ageHours };
  return { status: 'stale', ageHours };
}
