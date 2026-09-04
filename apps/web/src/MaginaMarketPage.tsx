import { useEffect, useMemo, useState } from 'react';
import { PublicHeader } from './publicNavigation';

type MarketSeriesKey = 'extra' | 'virgin' | 'lampante';
type MarketWeek = {
  week: number;
  label: string;
  startDate: string | null;
  endDate: string | null;
};
type MarketSeries = {
  key: MarketSeriesKey;
  label: string;
  values: Array<number | null>;
};
type MarketResponse = {
  weeks: MarketWeek[];
  series: MarketSeries[];
  freshness: {
    status: 'fresh' | 'aging' | 'stale' | 'unknown';
    ageDays: number | null;
    latestDate: string | null;
  };
  availability: { mode: 'live' | 'cache' | 'degraded-cache' };
  source: {
    provider: string;
    sourceUrl: string;
    checkedAt: string;
    position: string;
    scope: string;
    unit: '€/kg';
    usageNote: string;
  };
};

type ChartPoint = { x: number; y: number; value: number; index: number };

function dateLabel(value: string | null | undefined): string {
  if (!value) return 'Fecha no disponible';
  const date = new Date(`${value.length === 10 ? `${value}T12:00:00Z` : value}`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-ES');
}

function priceLabel(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} €/kg`;
}

function latestValue(series: MarketSeries | undefined): number | null {
  return series?.values.at(-1) ?? null;
}

function previousValue(series: MarketSeries | undefined): number | null {
  return series && series.values.length > 1 ? series.values.at(-2) ?? null : null;
}

function changeLabel(current: number | null, previous: number | null): { text: string; direction: 'up' | 'down' | 'flat' } {
  if (current == null || previous == null) return { text: 'Sin comparación', direction: 'flat' };
  const delta = current - previous;
  if (Math.abs(delta) < 0.0005) return { text: 'Sin cambio semanal', direction: 'flat' };
  const sign = delta > 0 ? '+' : '';
  return {
    text: `${sign}${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(delta)} €/kg vs. semana anterior`,
    direction: delta > 0 ? 'up' : 'down',
  };
}

function freshnessLabel(response: MarketResponse): { title: string; detail: string; tone: 'ok' | 'warn' | 'error' } {
  const age = response.freshness.ageDays == null ? null : `${response.freshness.ageDays} días`;
  if (response.availability.mode === 'degraded-cache') {
    return { title: 'Fuente temporalmente no disponible', detail: 'Mostramos la última lectura validada guardada por el servidor.', tone: 'warn' };
  }
  if (response.freshness.status === 'fresh') {
    return { title: 'Referencia semanal vigente', detail: age ? `Última semana publicada hace ${age}.` : 'Última semana publicada dentro del periodo esperado.', tone: 'ok' };
  }
  if (response.freshness.status === 'aging') {
    return { title: 'Revisar fecha de mercado', detail: age ? `La última semana publicada tiene ${age}.` : 'La publicación necesita revisión de fecha.', tone: 'warn' };
  }
  if (response.freshness.status === 'stale') {
    return { title: 'Datos de mercado desactualizados', detail: age ? `La última semana publicada tiene ${age}.` : 'No uses estos valores como referencia actual sin contrastarlos.', tone: 'error' };
  }
  return { title: 'Fecha de mercado no confirmada', detail: 'La fuente no permite confirmar la antigüedad de la última semana.', tone: 'warn' };
}

function MarketChart({ weeks, series }: { weeks: MarketWeek[]; series: MarketSeries[] }) {
  const chart = useMemo(() => {
    const numbers = series.flatMap((item) => item.values.filter((value): value is number => value != null && Number.isFinite(value)));
    if (!numbers.length || weeks.length < 2) return null;
    const rawMin = Math.min(...numbers);
    const rawMax = Math.max(...numbers);
    const span = Math.max(0.1, rawMax - rawMin);
    const min = rawMin - span * 0.12;
    const max = rawMax + span * 0.12;
    const width = 760;
    const height = 300;
    const left = 58;
    const right = 20;
    const top = 22;
    const bottom = 48;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const x = (index: number) => left + (plotWidth * index) / Math.max(1, weeks.length - 1);
    const y = (value: number) => top + plotHeight - ((value - min) / (max - min)) * plotHeight;
    const bySeries = series.map((item) => ({
      ...item,
      points: item.values.flatMap((value, index): ChartPoint[] => value == null ? [] : [{ x: x(index), y: y(value), value, index }]),
    }));
    const ticks = Array.from({ length: 5 }, (_, index) => {
      const ratio = index / 4;
      return { y: top + plotHeight * ratio, value: max - (max - min) * ratio };
    });
    return { width, height, left, right, top, bottom, plotWidth, plotHeight, bySeries, ticks };
  }, [weeks, series]);

  if (!chart) return <div className="market-chart-empty">No hay suficientes semanas verificadas para dibujar la evolución.</div>;

  return (
    <div className="market-chart-wrap">
      <svg className="market-chart" viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-labelledby="market-chart-title market-chart-desc">
        <title id="market-chart-title">Evolución semanal del aceite de oliva</title>
        <desc id="market-chart-desc">Comparación sincronizada de aceite virgen extra, virgen y lampante en euros por kilogramo.</desc>
        {chart.ticks.map((tick) => (
          <g key={tick.y}>
            <line className="market-chart-gridline" x1={chart.left} x2={chart.width - chart.right} y1={tick.y} y2={tick.y} />
            <text className="market-chart-y-label" x={chart.left - 10} y={tick.y + 4} textAnchor="end">{tick.value.toFixed(2)}</text>
          </g>
        ))}
        {chart.bySeries.map((item) => (
          <g className={`market-chart-series market-chart-series--${item.key}`} key={item.key}>
            <polyline points={item.points.map((point) => `${point.x},${point.y}`).join(' ')} />
            {item.points.map((point) => (
              <circle key={`${item.key}-${point.index}`} cx={point.x} cy={point.y} r="4.5">
                <title>{`${item.label} · ${weeks[point.index]?.label ?? ''} · ${priceLabel(point.value)}`}</title>
              </circle>
            ))}
          </g>
        ))}
        {weeks.map((week, index) => {
          const x = chart.left + (chart.plotWidth * index) / Math.max(1, weeks.length - 1);
          return <text className="market-chart-x-label" key={week.week} x={x} y={chart.height - 17} textAnchor="middle">S{week.week}</text>;
        })}
      </svg>
    </div>
  );
}

export function MaginaMarketPage() {
  const [market, setMarket] = useState<MarketResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void fetch('/api/v1/public/market/olive-oil', {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<MarketResponse>;
    }).then((result) => {
      setMarket(result);
    }).catch((reason) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setMarket(null);
      setError('No se ha podido consultar ahora la referencia oficial del aceite.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, [reloadKey]);

  const latestWeek = market?.weeks.at(-1) ?? null;
  const extra = market?.series.find((item) => item.key === 'extra');
  const virgin = market?.series.find((item) => item.key === 'virgin');
  const lampante = market?.series.find((item) => item.key === 'lampante');
  const categories = [extra, virgin, lampante].filter((item): item is MarketSeries => Boolean(item));
  const status = market ? freshnessLabel(market) : null;

  return (
    <main className="market-shell" id="main-content">
      <PublicHeader backHref="/magina" backLabel="Volver a Mágina" />

      <section className="market-hero" aria-labelledby="market-title">
        <p className="eyebrow">Mágina · Aceite y mercado</p>
        <h1 id="market-title">El precio del aceite, categoría a categoría</h1>
        <p>Evolución semanal sincronizada de virgen extra, virgen y lampante a partir de la referencia oficial del Observatorio de Precios y Mercados de Andalucía.</p>
      </section>

      {error ? (
        <div className="market-error alert" role="alert">
          <span>{error}</span>
          <button className="text-button" type="button" onClick={() => setReloadKey((value) => value + 1)}>Reintentar</button>
        </div>
      ) : null}

      <section className="market-price-section" aria-busy={loading} aria-live="polite">
        <div className="market-section-heading">
          <div>
            <p className="eyebrow page-eyebrow">Última referencia</p>
            <h2>{latestWeek ? `${latestWeek.label} · hasta ${dateLabel(latestWeek.endDate)}` : loading ? 'Consultando referencia oficial…' : 'Referencia no disponible'}</h2>
          </div>
          {market ? <span className="badge gold">{market.source.position}</span> : null}
        </div>

        {categories.length ? (
          <div className="market-latest-grid">
            {categories.map((item) => {
              const current = latestValue(item);
              const previous = previousValue(item);
              const change = changeLabel(current, previous);
              return (
                <article className={`card market-latest-card market-latest-card--${item.key}`} key={item.key}>
                  <span>{item.label}</span>
                  <strong>{priceLabel(current)}</strong>
                  <small className={`market-delta market-delta--${change.direction}`}>{change.text}</small>
                </article>
              );
            })}
          </div>
        ) : loading ? <div className="market-loading-card card">Preparando la comparativa semanal…</div> : null}
      </section>

      {market ? (
        <section className="card market-chart-card" aria-labelledby="market-evolution-title">
          <div className="market-section-heading">
            <div>
              <p className="eyebrow page-eyebrow">Evolución sincronizada</p>
              <h2 id="market-evolution-title">Virgen extra · Virgen · Lampante</h2>
              <p>Las tres líneas comparten las mismas semanas para que puedas comparar movimiento y diferencia entre categorías.</p>
            </div>
            <span className="market-chart-unit">€/kg</span>
          </div>
          <div className="market-chart-legend" aria-label="Leyenda de categorías">
            {market.series.map((item) => <span className={`market-legend market-legend--${item.key}`} key={item.key}>{item.label}</span>)}
          </div>
          <MarketChart weeks={market.weeks} series={market.series} />
        </section>
      ) : null}

      {market && status ? (
        <section className={`card market-source-card market-source-card--${status.tone}`}>
          <div>
            <p className="eyebrow page-eyebrow">Fuente y frescura</p>
            <h2>{status.title}</h2>
            <p>{status.detail}</p>
          </div>
          <dl className="market-facts">
            <div><dt>Fuente</dt><dd>{market.source.provider}</dd></div>
            <div><dt>Ámbito</dt><dd>{market.source.scope}</dd></div>
            <div><dt>Posición</dt><dd>{market.source.position}</dd></div>
            <div><dt>Última semana</dt><dd>{dateLabel(market.freshness.latestDate)}</dd></div>
            <div><dt>Comprobación</dt><dd>{dateLabel(market.source.checkedAt)}</dd></div>
          </dl>
          <p className="market-source-note">{market.source.usageNote}</p>
          <a className="secondary-button market-source-link" href={market.source.sourceUrl} target="_blank" rel="noreferrer noopener">Consultar fuente oficial</a>
        </section>
      ) : null}

      <section className="card market-rule-card">
        <p className="eyebrow page-eyebrow">Regla de producto</p>
        <h2>Mercado ≠ liquidación de tu cooperativa</h2>
        <p>Esta referencia sirve para observar el mercado. Tus rendimientos, anticipos, liquidaciones y pagos pertenecen a tu histórico privado y se registran por separado; Mágina Olivo no presenta estos precios como una cantidad garantizada para el agricultor.</p>
      </section>
    </main>
  );
}
