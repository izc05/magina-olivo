import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ExternalLink, LineChart, RefreshCw, Scale, TriangleAlert } from 'lucide-react';
import { latestValue, loadMarket, weeklyChange, type MarketPayload, type MarketSeries } from './marketFeed';
import '../../styles/market-real.css';

type LoadState = 'loading' | 'ready' | 'error';

type Props = {
  onBack: () => void;
};

function formatPrice(value: number | null, unit: string) {
  if (value == null) return '—';
  return `${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unit}`;
}

function trendText(series: MarketSeries) {
  const change = weeklyChange(series);
  if (!change) return 'Sin comparación';
  const sign = change.absolute > 0 ? '+' : '';
  return `${sign}${change.absolute.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · ${sign}${change.percent.toLocaleString('es-ES', { maximumFractionDigits: 1 })}%`;
}

function MultiTrendChart({
  series,
  periods,
  activeId,
}: {
  series: MarketSeries[];
  periods: string[];
  activeId: MarketSeries['id'];
}) {
  const scale = useMemo(() => {
    const values = series.flatMap((item) => item.values);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const rawSpan = Math.max(0.01, rawMax - rawMin);
    const padding = Math.max(0.08, rawSpan * 0.12);
    const min = rawMin - padding;
    const max = rawMax + padding;
    return { min, max, span: max - min };
  }, [series]);

  const pointFor = (value: number, index: number, length: number) => {
    const x = 18 + (index / Math.max(1, length - 1)) * 284;
    const y = 108 - ((value - scale.min) / scale.span) * 84;
    return { x, y };
  };

  const topLabel = scale.max.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const bottomLabel = scale.min.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="market-real-chart market-real-chart--multi">
      <div className="market-real-chart__scale" aria-hidden="true">
        <span>{topLabel}</span>
        <span>{bottomLabel}</span>
      </div>
      <svg viewBox="0 0 320 125" role="img" aria-label={`Comparativa sincronizada de ${series.map((item) => item.shortLabel).join(', ')}`}>
        <line x1="18" x2="302" y1="24" y2="24" className="market-real-chart__grid" />
        <line x1="18" x2="302" y1="66" y2="66" className="market-real-chart__grid" />
        <line x1="18" x2="302" y1="108" y2="108" className="market-real-chart__axis" />

        {series.map((item) => {
          const points = item.values.map((value, index) => {
            const { x, y } = pointFor(value, index, item.values.length);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(' ');
          const isActive = item.id === activeId;

          return (
            <g key={item.id} className={isActive ? 'market-real-chart__series market-real-chart__series--active' : 'market-real-chart__series'}>
              <polyline
                points={points}
                pathLength={1}
                className={`market-real-chart__line market-real-chart__line--${item.id}`}
              />
              {item.values.map((value, index) => {
                const { x, y } = pointFor(value, index, item.values.length);
                return (
                  <circle
                    key={`${item.id}-${periods[index]}-${value}`}
                    cx={x}
                    cy={y}
                    r={isActive ? 3.2 : 2.4}
                    className={`market-real-chart__point market-real-chart__point--${item.id}`}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      <div className="market-real-chart__labels"><span>{periods[0]}</span><span>{periods.at(-1)}</span></div>
      <div className="market-real-chart__legend" aria-label="Leyenda de categorías">
        {series.map((item) => (
          <span key={item.id} className={item.id === activeId ? 'market-real-chart__legend-item market-real-chart__legend-item--active' : 'market-real-chart__legend-item'}>
            <i className={`market-real-chart__legend-dot market-real-chart__legend-dot--${item.id}`} />
            {item.shortLabel}
          </span>
        ))}
      </div>
    </div>
  );
}

export function MarketPanel({ onBack }: Props) {
  const [payload, setPayload] = useState<MarketPayload | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [selectedId, setSelectedId] = useState<MarketSeries['id']>('aove');

  const refresh = async () => {
    setState('loading');
    try {
      const next = await loadMarket();
      setPayload(next);
      setState('ready');
    } catch {
      setState('error');
    }
  };

  useEffect(() => { void refresh(); }, []);

  return (
    <section className="section-block hub-panel hub-panel--flush market-real section-block--last">
      <div className="market-real__top">
        <button type="button" className="text-action" onClick={onBack}><ArrowLeft size={16} /> Noticias</button>
        <button type="button" className="icon-button" aria-label="Actualizar mercado" onClick={() => void refresh()}><RefreshCw size={18} /></button>
      </div>

      <div className="section-heading">
        <div><span className="eyebrow">Precio en origen</span><h2>Mercado del aceite</h2></div>
        <LineChart size={22} />
      </div>
      <p className="market-real__intro">Precios semanales validados en almazara o bodega. No son precios de supermercado ni liquidaciones de una cooperativa concreta.</p>

      {state === 'loading' && <div className="market-real__state"><RefreshCw size={20} className="real-news-spin" /><span>Cargando precios oficiales…</span></div>}
      {state === 'error' && <div className="market-real__state market-real__state--error"><TriangleAlert size={20} /><span>No se ha podido cargar el mercado.</span></div>}

      {state === 'ready' && payload && (
        <>
          <div className="market-real__period">
            <Scale size={17} />
            <div><strong>{payload.market}</strong><span>{payload.periods.at(-1)} · {payload.unit}</span></div>
          </div>

          <div className="market-grid market-grid--real">
            {payload.series.map((series) => {
              const change = weeklyChange(series);
              const direction = change && change.absolute > 0 ? 'up' : change && change.absolute < 0 ? 'down' : 'flat';
              return (
                <button
                  key={series.id}
                  type="button"
                  aria-pressed={selectedId === series.id}
                  className={selectedId === series.id ? 'market-real__price market-real__price--active' : 'market-real__price'}
                  onClick={() => setSelectedId(series.id)}
                >
                  <span>{series.shortLabel}</span>
                  <strong>{formatPrice(latestValue(series), payload.unit)}</strong>
                  <small className={`market-real__trend market-real__trend--${direction}`}>{trendText(series)} vs. semana anterior</small>
                </button>
              );
            })}
          </div>

          <article className="market-chart-card market-chart-card--real">
            <div className="market-real__chart-head">
              <div>
                <span className="eyebrow">8 semanas · misma escala</span>
                <strong>Comparativa sincronizada</strong>
              </div>
              <span className="market-real__chart-unit">{payload.unit}</span>
            </div>
            <p className="market-real__chart-note">Las categorías comparten el mismo eje de precios para que la distancia entre AOVE, Virgen y Lampante sea comparable de forma real.</p>
            <MultiTrendChart series={payload.series} periods={payload.periods} activeId={selectedId} />
          </article>

          <a className="market-real__source" href={payload.sourceUrl} target="_blank" rel="noreferrer">
            {payload.collectorError ? <TriangleAlert size={18} /> : <CheckCircle2 size={18} />}
            <div>
              <strong>{payload.sourceLabel}</strong>
              <span>{payload.collectorError ? 'Se muestra el último feed válido porque la actualización automática no pudo completar la lectura.' : 'Datos actualizados automáticamente y trazables a la fuente pública.'}</span>
              <small>Feed generado: {new Date(payload.generatedAt).toLocaleString('es-ES')}</small>
            </div>
            <ExternalLink size={16} />
          </a>
        </>
      )}
    </section>
  );
}
