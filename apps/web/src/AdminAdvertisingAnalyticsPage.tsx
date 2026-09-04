import { useEffect, useState } from 'react';

type BenchmarkPlan = {
  planCode: 'featured' | 'premium';
  advertisers: number;
  suppressed: boolean;
  impressions?: number;
  actions?: number;
  actionRate?: number | null;
  impressionsPerAdvertiser?: number;
  actionsPerAdvertiser?: number;
};

type BenchmarkResponse = {
  rangeDays: 30 | 90 | 365;
  minimumCohortSize: number;
  plans: BenchmarkPlan[];
  privacy: string;
};

async function load(days: number): Promise<BenchmarkResponse> {
  const response = await fetch(`/api/v1/admin/advertising/analytics/benchmark?days=${days}`, { credentials: 'include', headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<BenchmarkResponse>;
}

function pct(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 1 }).format(value);
}

function number(value: number | undefined): string {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value ?? 0);
}

export function AdminAdvertisingAnalyticsPage() {
  const [days, setDays] = useState<30 | 90 | 365>(90);
  const [data, setData] = useState<BenchmarkResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    void load(days).then(setData).catch(() => setError('No se ha podido cargar el benchmark comercial.'));
  }, [days]);

  return <main className="ad-analytics-shell" id="main-content">
    <header className="ad-analytics-header">
      <a href="/admin" className="ad-analytics-brand"><img src="/brand/magina-olivo-mark.svg" alt="" /><span><strong>Mágina Olivo</strong><small>Administración · Estadísticas</small></span></a>
      <a href="/admin/comercial">← Embudo comercial</a>
    </header>
    <section className="ad-analytics-hero">
      <div><p className="eyebrow">Benchmark comercial</p><h1>Destacado vs Premium</h1><p>Comparativa agregada de rendimiento para orientar el producto publicitario sin exponer los resultados de una empresa concreta.</p></div>
      <div className="ad-analytics-controls"><label>Periodo<select value={days} onChange={(e) => setDays(Number(e.target.value) as 30 | 90 | 365)}><option value={30}>30 días</option><option value={90}>90 días</option><option value={365}>12 meses</option></select></label></div>
    </section>
    {error ? <div className="ad-analytics-error" role="alert">{error}</div> : null}
    <section className="ad-admin-benchmark">
      <div className="ad-benchmark-grid">
        {(data?.plans ?? []).map((plan) => <article className="ad-benchmark-plan" key={plan.planCode}>
          <h2>{plan.planCode === 'featured' ? 'Destacado' : 'Premium'}</h2>
          {plan.suppressed ? <div className="ad-benchmark-suppressed"><strong>Muestra insuficiente</strong><p>Hay {plan.advertisers} anunciante(s). Se necesitan al menos {data?.minimumCohortSize ?? 3} para mostrar el benchmark.</p></div> : <div className="ad-benchmark-metrics">
            <Metric label="Anunciantes" value={number(plan.advertisers)} />
            <Metric label="Impresiones" value={number(plan.impressions)} />
            <Metric label="Interacciones" value={number(plan.actions)} />
            <Metric label="Tasa de acción" value={pct(plan.actionRate)} />
            <Metric label="Imp. / anunciante" value={number(plan.impressionsPerAdvertiser)} />
            <Metric label="Acc. / anunciante" value={number(plan.actionsPerAdvertiser)} />
          </div>}
        </article>)}
      </div>
      <p className="ad-benchmark-note">{data?.privacy ?? 'El benchmark protege la confidencialidad comercial mediante agregación y supresión de cohortes pequeñas.'}</p>
    </section>
  </main>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><small>{label}</small><strong>{value}</strong></div>;
}
