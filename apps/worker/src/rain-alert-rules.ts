export type RainForecastDay = {
  date: string;
  precipitationProbabilityPercent: number | null;
};

export type RainTrigger = {
  date: string;
  precipitationProbabilityPercent: number;
};

export function normalizePlace(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-ES')
    .replace(/\s+/g, ' ')
    .trim();
}

export function selectRainTriggers(
  days: RainForecastDay[],
  thresholdPercent: number,
  horizonDays = 2,
): RainTrigger[] {
  const threshold = Math.min(100, Math.max(0, thresholdPercent));
  const horizon = Math.max(1, Math.floor(horizonDays));

  return days
    .slice(0, horizon)
    .filter((day): day is RainForecastDay & { precipitationProbabilityPercent: number } => (
      day.precipitationProbabilityPercent != null
      && Number.isFinite(day.precipitationProbabilityPercent)
      && day.precipitationProbabilityPercent >= threshold
    ))
    .map((day) => ({
      date: day.date,
      precipitationProbabilityPercent: day.precipitationProbabilityPercent,
    }));
}
