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

function TrendChart({ series, periods }: { series: MarketSeries; periods: string[] }) {
  const points = useMemo(() => {
    if (series.values.length < 2) return '';
    const min = Math.min(...series.values);
    const max = Math.max(...series.values);
    const span = Math.max(0.01, max - min);
    return series.values.map((value, index) => {
      const x = 10 + (index / (series.values.length - 1)) * 300;
      const y = 112 - ((value - min) / span) * 88;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [series]);

  return (
    <div className="market-real-chart" aria-label={`Evolución semanal de ${series.label}`}>
      <svg viewBox="0 0 320 125" role="img" aria-label={`${series.label}: evolución de ${series.values.length} semanas`}>
        <line x1="10" x2="310" y1="112" y2="112" className="market-real-chart__axis" />
        <polyline points={points} className="market-real-chart__line" />
        {series.values.map((value, index) => {
          const min = Math.min(...series.values);
          const max = Math.max(...series.values);
          const span = Math.max(0.01, max - min);
          const x = 10 + (index / Math.max(1, series.values.length - 1)) * 300;
          const y = 112 - ((value - min) / span) * 88;
          return <circle key={`${periods[index]}-${value}`} cx={x} cy={y} r="3.4" className="market-real-chart__point" />;
        })}
      </svg>
      <div className="market-real-chart__labels"><span>{periods[0]}</span><span>{periods.at(-1)}</span></div>
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

  const selected = payload?.series.find((series) => series.id === selectedId) ?? payload?.series[0] ?? null;

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

          {selected && (
            <article className="market-chart-card market-chart-card--real">
              <div className="market-real__chart-head">
                <div><span className="eyebrow">8 semanas</span><strong>{selected.label}</strong></div>
                <strong>{formatPrice(latestValue(selected), payload.unit)}</strong>
              </div>
              <TrendChart series={selected} periods={payload.periods} />
            </article>
          )}

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
