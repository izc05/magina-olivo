export type MarketSeries = {
  id: 'aove' | 'virgen' | 'lampante';
  label: string;
  shortLabel: string;
  values: number[];
};

export type MarketPayload = {
  generatedAt: string;
  sourceLabel: string;
  sourceUrl: string;
  market: string;
  unit: string;
  provisional?: boolean;
  collectorError?: string | null;
  periods: string[];
  series: MarketSeries[];
};

function getMarketPath(): string {
  const pathname = window.location.pathname;
  const base = pathname.startsWith('/magina-olivo/') ? '/magina-olivo/' : '/';
  return `${base}data/market.json`;
}

export async function loadMarket(): Promise<MarketPayload> {
  const response = await fetch(`${getMarketPath()}?ts=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`No se pudo cargar el mercado (${response.status})`);

  const payload = await response.json() as MarketPayload;
  if (!Array.isArray(payload.periods) || !Array.isArray(payload.series) || payload.series.length < 3) {
    throw new Error('Formato de mercado no válido');
  }
  return payload;
}

export function latestValue(series: MarketSeries): number | null {
  return series.values.length ? series.values[series.values.length - 1] : null;
}

export function previousValue(series: MarketSeries): number | null {
  return series.values.length > 1 ? series.values[series.values.length - 2] : null;
}

export function weeklyChange(series: MarketSeries): { absolute: number; percent: number } | null {
  const current = latestValue(series);
  const previous = previousValue(series);
  if (current == null || previous == null || previous === 0) return null;
  return {
    absolute: current - previous,
    percent: ((current - previous) / previous) * 100,
  };
}
