import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  getHarvestHistory,
  type HarvestHistory,
  type HarvestHistoryPoint,
} from './harvestHistoryApi.ts';
import './HarvestHistoryPanel.css';

type MetricKey = 'totalKilograms' | 'kilogramsPerHectare' | 'kilogramsPerOliveTree' | 'weightedYieldPercent';

type MetricDefinition = {
  key: MetricKey;
  label: string;
  shortLabel: string;
  unit: string;
  digits: number;
};

const metrics: MetricDefinition[] = [
  { key: 'totalKilograms', label: 'Kilos entregados', shortLabel: 'Kilos', unit: 'kg', digits: 0 },
  { key: 'kilogramsPerHectare', label: 'Productividad por hectárea', shortLabel: 'Kg/ha', unit: 'kg/ha', digits: 0 },
  { key: 'kilogramsPerOliveTree', label: 'Productividad por olivo', shortLabel: 'Kg/olivo', unit: 'kg/olivo', digits: 1 },
  { key: 'weightedYieldPercent', label: 'Rendimiento graso medio', shortLabel: 'Rendimiento', unit: '%', digits: 1 },
];

function formatNumber(value: number | null, digits: number): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

function season(item: HarvestHistoryPoint): string {
  return `${item.seasonStartYear}/${String(item.seasonEndYear).slice(-2)}`;
}

function valueFor(item: HarvestHistoryPoint, metric: MetricKey): number | null {
  return item[metric];
}

function metricLabel(value: number | null, metric: MetricDefinition): string {
  if (value == null) return 'Sin dato';
  return `${formatNumber(value, metric.digits)} ${metric.unit}`;
}

export function HarvestHistoryPanel({
  holdingId,
  selectedCampaignId,
}: {
  holdingId: string;
  selectedCampaignId: string;
}) {
  const [history, setHistory] = useState<HarvestHistory | null>(null);
  const [metricKey, setMetricKey] = useState<MetricKey>('kilogramsPerHectare');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!holdingId) return () => { cancelled = true; };

    setLoading(true);
    setError(null);
    void getHarvestHistory(holdingId)
      .then((result) => {
        if (!cancelled) setHistory(result);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'No se ha podido cargar el histórico.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [holdingId]);

  const metric = metrics.find((item) => item.key === metricKey) ?? metrics[1]!;

  const chart = useMemo(() => {
    const items = history?.items ?? [];
    const values = items.map((item) => valueFor(item, metricKey)).filter((value): value is number => value != null && Number.isFinite(value));
    const maxValue = values.length > 0 ? Math.max(...values) : 0;
    const best = maxValue > 0
      ? items.findLast((item) => valueFor(item, metricKey) === maxValue) ?? null
      : null;
    const latest = items.at(-1) ?? null;
    return { items, maxValue, best, latest };
  }, [history, metricKey]);

  if (loading && !history) {
    return (
      <section className="section card card-body harvest-history-shell" aria-busy="true">
        <span className="badge">Histórico</span>
        <h3 className="section-title harvest-history-title">Cargando evolución…</h3>
        <p className="section-copy">Preparando el histórico de campañas de esta explotación.</p>
      </section>
    );
  }

  if (error && !history) {
    return (
      <section className="section card card-body harvest-history-shell">
        <span className="badge">Histórico</span>
        <h3 className="section-title harvest-history-title">Histórico no disponible</h3>
        <p className="section-copy">{error}</p>
      </section>
    );
  }

  if (!history) return null;

  return (
    <section className="section harvest-history-shell" aria-labelledby="harvest-history-title">
      <div className="section-heading harvest-history-heading">
        <div>
          <p className="eyebrow page-eyebrow">Evolución a largo plazo</p>
          <h3 id="harvest-history-title" className="section-title">Histórico de campañas</h3>
          <p className="section-copy">
            Misma base para todas las campañas: {formatNumber(history.activeAreaHa, 2)} ha · {history.activeOliveTreeCount || '—'} olivos activos.
          </p>
        </div>
        <span className="badge gold">{history.items.length} {history.items.length === 1 ? 'campaña' : 'campañas'}</span>
      </div>

      <div className="harvest-history-metric-tabs" role="group" aria-label="Métrica del histórico">
        {metrics.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`harvest-history-metric-tab${metricKey === item.key ? ' active' : ''}`}
            aria-pressed={metricKey === item.key}
            onClick={() => setMetricKey(item.key)}
          >
            {item.shortLabel}
          </button>
        ))}
      </div>

      {chart.items.length === 0 ? (
        <div className="card empty-state harvest-history-empty">
          <strong>Tu histórico empezará con la primera campaña</strong>
          Cuando registres una campaña y sus entregas, la evolución aparecerá aquí automáticamente.
        </div>
      ) : (
        <>
          <div className="card card-body harvest-history-chart-card">
            <div className="harvest-history-chart-head">
              <div>
                <strong>{metric.label}</strong>
                <span>Comparación cronológica de la explotación</span>
              </div>
              <small>{metric.unit}</small>
            </div>

            <div className="harvest-history-scroll" tabIndex={0} aria-label={`Gráfico histórico de ${metric.label.toLowerCase()}`}>
              <div className="harvest-history-chart" style={{ '--history-count': Math.max(4, chart.items.length) } as CSSProperties}>
                {chart.items.map((item) => {
                  const value = valueFor(item, metricKey);
                  const percentage = value != null && chart.maxValue > 0
                    ? Math.max(4, (value / chart.maxValue) * 100)
                    : 0;
                  const selected = item.campaignId === selectedCampaignId;
                  return (
                    <article
                      key={item.campaignId}
                      className={`harvest-history-column${selected ? ' selected' : ''}`}
                      aria-label={`${season(item)}: ${metricLabel(value, metric)}${selected ? ', campaña seleccionada' : ''}`}
                    >
                      <span className="harvest-history-value">{metricLabel(value, metric)}</span>
                      <div className="harvest-history-bar-zone" aria-hidden="true">
                        <div
                          className={`harvest-history-bar${value == null ? ' missing' : ''}`}
                          style={{ '--bar-height': `${percentage}%` } as CSSProperties}
                        />
                      </div>
                      <strong>{season(item)}</strong>
                      <small>{selected ? 'Seleccionada' : item.status === 'active' ? 'Activa' : item.status === 'closed' ? 'Cerrada' : item.status}</small>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="harvest-history-summary-grid">
            <article className="card card-body harvest-history-summary-card">
              <span>Mejor campaña · {metric.shortLabel}</span>
              <strong>{chart.best ? season(chart.best) : '—'}</strong>
              <small>{chart.best ? metricLabel(valueFor(chart.best, metricKey), metric) : 'Sin datos comparables'}</small>
            </article>
            <article className="card card-body harvest-history-summary-card">
              <span>Última campaña</span>
              <strong>{chart.latest ? season(chart.latest) : '—'}</strong>
              <small>{chart.latest ? metricLabel(valueFor(chart.latest, metricKey), metric) : 'Sin datos'}</small>
            </article>
          </div>

          {chart.items.length === 1 ? (
            <p className="section-copy harvest-history-note">Cuando exista una segunda campaña podrás ver claramente la evolución entre años.</p>
          ) : null}
        </>
      )}
    </section>
  );
}
