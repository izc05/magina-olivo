import { useEffect, useMemo, useState } from 'react';
import {
  getHarvestCampaignComparison,
  type HarvestCampaignComparison,
  type HarvestMetricComparison,
  type HarvestPlotComparison,
} from './harvestComparisonApi.ts';
import './HarvestCampaignComparisonPanel.css';

function formatNumber(value: number | null, digits = 1): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits }).format(value);
}

function season(startYear: number, endYear: number): string {
  return `${startYear}/${String(endYear).slice(-2)}`;
}

function direction(value: number | null): 'up' | 'down' | 'flat' {
  if (value == null || Math.abs(value) < 0.0001) return 'flat';
  return value > 0 ? 'up' : 'down';
}

function directionLabel(value: number | null): string {
  const trend = direction(value);
  if (trend === 'up') return '↑ Sube';
  if (trend === 'down') return '↓ Baja';
  return '→ Estable';
}

function signed(value: number | null, digits = 1, suffix = ''): string {
  if (value == null) return 'Sin dato';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${formatNumber(value, digits)}${suffix}`;
}

function metricChange(metric: HarvestMetricComparison, kind: 'percent' | 'points'): string {
  if (metric.previous == null) return 'Sin campaña anterior';
  if (kind === 'points') return signed(metric.absoluteChange, 2, ' pp');
  if (metric.percentChange == null) return signed(metric.absoluteChange, 1);
  return signed(metric.percentChange, 1, ' %');
}

function PlotHighlight({ plot, tone }: { plot: HarvestPlotComparison; tone: 'up' | 'down' }) {
  return (
    <li className="harvest-highlight-item">
      <div>
        <strong>{plot.name}</strong>
        <span>{plot.farmName}</span>
      </div>
      <b className={`harvest-delta ${tone}`}>{signed(plot.kilogramsPerHectareChange, 1, ' kg/ha')}</b>
    </li>
  );
}

export function HarvestCampaignComparisonPanel({ campaignId }: { campaignId: string }) {
  const [comparison, setComparison] = useState<HarvestCampaignComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!campaignId) {
      setComparison(null);
      return () => { cancelled = true; };
    }

    setLoading(true);
    setError(null);
    void getHarvestCampaignComparison(campaignId)
      .then((result) => {
        if (!cancelled) setComparison(result);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'No se ha podido cargar la comparativa.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [campaignId]);

  const metrics = useMemo(() => comparison ? [
    {
      key: 'kg',
      label: 'Kilos',
      value: `${formatNumber(comparison.metrics.totalKilograms.current)} kg`,
      previous: comparison.metrics.totalKilograms.previous == null ? '—' : `${formatNumber(comparison.metrics.totalKilograms.previous)} kg`,
      change: metricChange(comparison.metrics.totalKilograms, 'percent'),
      trend: direction(comparison.metrics.totalKilograms.absoluteChange),
    },
    {
      key: 'kg-ha',
      label: 'Kg/ha',
      value: formatNumber(comparison.metrics.kilogramsPerHectare.current),
      previous: formatNumber(comparison.metrics.kilogramsPerHectare.previous),
      change: metricChange(comparison.metrics.kilogramsPerHectare, 'percent'),
      trend: direction(comparison.metrics.kilogramsPerHectare.absoluteChange),
    },
    {
      key: 'kg-tree',
      label: 'Kg/olivo',
      value: formatNumber(comparison.metrics.kilogramsPerOliveTree.current, 2),
      previous: formatNumber(comparison.metrics.kilogramsPerOliveTree.previous, 2),
      change: metricChange(comparison.metrics.kilogramsPerOliveTree, 'percent'),
      trend: direction(comparison.metrics.kilogramsPerOliveTree.absoluteChange),
    },
    {
      key: 'yield',
      label: 'Rendimiento',
      value: comparison.metrics.weightedYieldPercent.current == null ? '—' : `${formatNumber(comparison.metrics.weightedYieldPercent.current, 2)} %`,
      previous: comparison.metrics.weightedYieldPercent.previous == null ? '—' : `${formatNumber(comparison.metrics.weightedYieldPercent.previous, 2)} %`,
      change: metricChange(comparison.metrics.weightedYieldPercent, 'points'),
      trend: direction(comparison.metrics.weightedYieldPercent.absoluteChange),
    },
  ] : [], [comparison]);

  if (!campaignId) return null;

  if (loading && !comparison) {
    return (
      <section className="section card card-body harvest-comparison-panel" aria-busy="true">
        <span className="badge">Comparativa</span>
        <h3 className="section-title harvest-comparison-title">Analizando campañas…</h3>
        <p className="section-copy">Calculando kilos, productividad y rendimiento de la explotación.</p>
      </section>
    );
  }

  if (error && !comparison) {
    return (
      <section className="section card card-body harvest-comparison-panel">
        <span className="badge">Comparativa</span>
        <h3 className="section-title harvest-comparison-title">Comparativa no disponible</h3>
        <p className="section-copy">{error}</p>
      </section>
    );
  }

  if (!comparison) return null;

  const currentSeason = season(comparison.currentCampaign.seasonStartYear, comparison.currentCampaign.seasonEndYear);
  const previousSeason = comparison.previousCampaign
    ? season(comparison.previousCampaign.seasonStartYear, comparison.previousCampaign.seasonEndYear)
    : null;

  return (
    <section className="section harvest-comparison-shell" aria-labelledby="harvest-comparison-title">
      <div className="section-heading harvest-comparison-heading">
        <div>
          <p className="eyebrow page-eyebrow">Evolución de la explotación</p>
          <h3 id="harvest-comparison-title" className="section-title">Comparativa de campañas</h3>
          <p className="section-copy">
            {comparison.previousCampaign
              ? `${currentSeason} frente a ${previousSeason}. La productividad usa la misma base activa en ambas campañas.`
              : `${currentSeason}. Todavía no existe una campaña anterior comparable.`}
          </p>
        </div>
        <span className="badge gold">{comparison.previousCampaign ? `vs ${previousSeason}` : 'Primera campaña'}</span>
      </div>

      <div className="harvest-comparison-metrics">
        {metrics.map((metric) => (
          <article className="card harvest-comparison-metric" key={metric.key}>
            <div className="harvest-metric-topline">
              <span>{metric.label}</span>
              <small className={`harvest-trend ${metric.trend}`}>{directionLabel(metric.trend === 'up' ? 1 : metric.trend === 'down' ? -1 : 0)}</small>
            </div>
            <strong>{metric.value}</strong>
            <div className="harvest-metric-compare">
              <span>Anterior {metric.previous}</span>
              <b className={`harvest-delta ${metric.trend}`}>{metric.change}</b>
            </div>
          </article>
        ))}
      </div>

      <div className="card card-body harvest-balance-card">
        <div className="harvest-balance-heading">
          <div>
            <strong>Balance por parcela</strong>
            <span>Según variación de kg/ha</span>
          </div>
          <small>Base: {formatNumber(comparison.base.activeAreaHa, 2)} ha · {comparison.base.activeOliveTreeCount || '—'} olivos</small>
        </div>

        {comparison.previousCampaign ? (
          <div className="harvest-balance-grid" aria-label="Balance de parcelas comparadas">
            <div><span aria-hidden="true">↑</span><strong>{comparison.balance.improvedPlots}</strong><small>Mejoran</small></div>
            <div><span aria-hidden="true">↓</span><strong>{comparison.balance.worsenedPlots}</strong><small>Empeoran</small></div>
            <div><span aria-hidden="true">→</span><strong>{comparison.balance.stablePlots}</strong><small>Estables</small></div>
          </div>
        ) : (
          <p className="section-copy harvest-first-campaign-copy">Cuando cierres una segunda campaña, aquí aparecerá automáticamente la evolución de cada parcela.</p>
        )}
      </div>

      {comparison.previousCampaign && (comparison.improvedPlots.length > 0 || comparison.worsenedPlots.length > 0) ? (
        <div className="harvest-highlights-grid">
          <article className="card card-body harvest-highlight-card">
            <div className="harvest-highlight-heading">
              <span aria-hidden="true">↑</span>
              <div><strong>Más mejora</strong><small>Kg/ha frente a la anterior</small></div>
            </div>
            <ul>
              {comparison.improvedPlots.slice(0, 3).map((plot) => <PlotHighlight key={plot.id} plot={plot} tone="up" />)}
              {comparison.improvedPlots.length === 0 ? <li className="harvest-highlight-empty">Sin parcelas al alza.</li> : null}
            </ul>
          </article>

          <article className="card card-body harvest-highlight-card">
            <div className="harvest-highlight-heading">
              <span aria-hidden="true">↓</span>
              <div><strong>Más retroceso</strong><small>Kg/ha frente a la anterior</small></div>
            </div>
            <ul>
              {comparison.worsenedPlots.slice(0, 3).map((plot) => <PlotHighlight key={plot.id} plot={plot} tone="down" />)}
              {comparison.worsenedPlots.length === 0 ? <li className="harvest-highlight-empty">Sin parcelas a la baja.</li> : null}
            </ul>
          </article>
        </div>
      ) : null}
    </section>
  );
}
