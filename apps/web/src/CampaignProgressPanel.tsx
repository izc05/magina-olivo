import { useEffect, useMemo, useState } from 'react';
import { api, type CampaignSummary } from './api.ts';
import './CampaignProgressPanel.css';

function number(value: string | number | null, digits = 1): string {
  if (value == null) return '—';
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return '—';
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(parsed);
}

function percentage(value: string | null): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

export function CampaignProgressPanel({ campaignId }: { campaignId: string }) {
  const [summary, setSummary] = useState<CampaignSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!campaignId) {
      setSummary(null);
      return () => { cancelled = true; };
    }

    setLoading(true);
    setError(null);
    void api.campaignSummary(campaignId)
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'No se ha podido cargar el progreso de campaña.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [campaignId]);

  const coverage = useMemo(() => percentage(summary?.coveragePercent ?? null), [summary?.coveragePercent]);

  if (loading && !summary) {
    return (
      <section className="section card card-body campaign-progress-shell" aria-busy="true">
        <span className="badge">Campaña actual</span>
        <h3 className="section-title campaign-progress-title">Actualizando campaña…</h3>
        <p className="section-copy">Calculando entregas, kilos y cobertura de rendimientos.</p>
      </section>
    );
  }

  if (error && !summary) {
    return (
      <section className="section card card-body campaign-progress-shell">
        <span className="badge">Campaña actual</span>
        <h3 className="section-title campaign-progress-title">Progreso no disponible</h3>
        <p className="section-copy">{error}</p>
      </section>
    );
  }

  if (!summary) return null;

  const hasDeliveries = summary.deliveriesCount > 0;
  const complete = hasDeliveries && summary.pendingResultCount === 0;

  return (
    <section className="section campaign-progress-shell" aria-labelledby="campaign-progress-title">
      <div className="section-heading campaign-progress-heading">
        <div>
          <p className="eyebrow page-eyebrow">Seguimiento de campaña</p>
          <h3 id="campaign-progress-title" className="section-title">Progreso de la campaña</h3>
          <p className="section-copy">Solo se contabilizan entregas confirmadas y el rendimiento vigente de cada entrega.</p>
        </div>
        <span className={`badge ${complete ? 'gold' : ''}`}>{complete ? 'Rendimientos completos' : hasDeliveries ? 'En curso' : 'Sin entregas'}</span>
      </div>

      <div className="campaign-progress-metrics">
        <article className="card card-body campaign-progress-metric">
          <span>Kilos confirmados</span>
          <strong>{number(summary.totalKilograms, 0)} kg</strong>
          <small>{summary.deliveriesCount} {summary.deliveriesCount === 1 ? 'entrega' : 'entregas'}</small>
        </article>
        <article className="card card-body campaign-progress-metric">
          <span>Rendimiento medio</span>
          <strong>{summary.weightedYieldPercent == null ? '—' : `${number(summary.weightedYieldPercent, 2)} %`}</strong>
          <small>Ponderado por kilos con resultado</small>
        </article>
        <article className="card card-body campaign-progress-metric">
          <span>Con rendimiento</span>
          <strong>{summary.deliveriesWithResult}</strong>
          <small>{number(summary.resultCoveredKilograms, 0)} kg cubiertos</small>
        </article>
        <article className="card card-body campaign-progress-metric">
          <span>Pendientes</span>
          <strong>{summary.pendingResultCount}</strong>
          <small>{summary.pendingResultCount === 1 ? 'entrega sin resultado' : 'entregas sin resultado'}</small>
        </article>
      </div>

      <div className="card card-body campaign-progress-coverage">
        <div className="campaign-progress-coverage-head">
          <div>
            <strong>Cobertura de rendimientos</strong>
            <span>{hasDeliveries ? `${number(summary.resultCoveredKilograms, 0)} de ${number(summary.totalKilograms, 0)} kg ya tienen resultado` : 'Aún no hay entregas confirmadas'}</span>
          </div>
          <b>{hasDeliveries ? `${number(summary.coveragePercent, 1)} %` : '—'}</b>
        </div>
        <div
          className="campaign-progress-track"
          role="progressbar"
          aria-label="Cobertura de rendimientos de la campaña"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(coverage)}
        >
          <span style={{ width: `${coverage}%` }} />
        </div>
        {hasDeliveries && summary.pendingResultCount > 0 ? (
          <p className="campaign-progress-note warning">Faltan {summary.pendingResultCount} {summary.pendingResultCount === 1 ? 'resultado' : 'resultados'} de rendimiento. El rendimiento medio todavía es provisional.</p>
        ) : null}
        {complete ? <p className="campaign-progress-note success">Todas las entregas confirmadas tienen rendimiento registrado.</p> : null}
      </div>
    </section>
  );
}
