import { useEffect, useMemo, useState } from 'react';

type AccessResponse = { memberships: Array<{ advertiserId: string; businessName: string; role: string }> };
type Point = { bucket: string; impressions: number; actions: number };
type AnalyticsResponse = {
  advertiser: { id: string; businessName: string; municipality: string | null; province: string | null };
  rangeDays: 30 | 90 | 365;
  summary: { impressions: number; actions: number; actionRate: number | null; activeDays: number };
  series: { daily: Point[]; weekly: Point[]; monthly: Point[] };
  breakdown: {
    actions: Array<{ event_type: string; total: number }>;
    municipalities: Array<{ municipality: string; impressions: number; actions: number }>;
    placements: Array<{ placement: string; impressions: number; actions: number }>;
  };
  campaigns: Array<{ id: string; planCode: string; status: string; startsAt: string | null; endsAt: string | null; impressions: number; actions: number; actionRate: number | null }>;
  privacy: string;
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include', headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

function pct(value: number | null): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 1 }).format(value);
}

function shortDate(value: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}

function labelForAction(value: string): string {
  return ({ impression: 'Impresiones', profile_view: 'Ficha', phone_click: 'Llamadas', whatsapp_click: 'WhatsApp', website_click: 'Web' } as Record<string, string>)[value] ?? value;
}

export function AdvertiserAnalyticsPage() {
  const [memberships, setMemberships] = useState<AccessResponse['memberships']>([]);
  const [advertiserId, setAdvertiserId] = useState('');
  const [days, setDays] = useState<30 | 90 | 365>(90);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getJson<AccessResponse>('/api/v1/advertiser/access').then((result) => {
      setMemberships(result.memberships);
      const fromQuery = new URLSearchParams(window.location.search).get('advertiserId');
      const selected = result.memberships.some((item) => item.advertiserId === fromQuery) ? fromQuery! : result.memberships[0]?.advertiserId ?? '';
      setAdvertiserId(selected);
    }).catch(() => setError('No se ha podido validar el acceso del anunciante.')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!advertiserId) { setData(null); return; }
    setLoading(true); setError(null);
    void getJson<AnalyticsResponse>(`/api/v1/advertiser/analytics?advertiserId=${encodeURIComponent(advertiserId)}&days=${days}`)
      .then(setData)
      .catch(() => setError('No se han podido cargar las estadísticas.'))
      .finally(() => setLoading(false));
  }, [advertiserId, days]);

  const chart = days === 30 ? data?.series.daily ?? [] : days === 90 ? data?.series.weekly ?? [] : data?.series.monthly ?? [];
  const maxValue = useMemo(() => Math.max(1, ...chart.map((item) => Math.max(item.impressions, item.actions))), [chart]);
  const csvHref = advertiserId ? `/api/v1/advertiser/analytics/export.csv?advertiserId=${encodeURIComponent(advertiserId)}&days=${days}` : '#';

  if (!loading && !memberships.length) return <main className="ad-analytics-gate"><h1>Sin negocio vinculado</h1><p>Necesitas una membresía activa del Área del Anunciante.</p><a href="/anunciante">Volver</a></main>;

  return (
    <main className="ad-analytics-shell" id="main-content">
      <header className="ad-analytics-header">
        <a href="/anunciante" className="ad-analytics-brand"><img src="/brand/magina-olivo-mark.svg" alt="" /><span><strong>Mágina Olivo</strong><small>Estadísticas del anunciante</small></span></a>
        <a href="/anunciante">← Área del Anunciante</a>
      </header>

      <section className="ad-analytics-hero">
        <div><p className="eyebrow">Rendimiento comercial</p><h1>{data?.advertiser.businessName ?? 'Tus estadísticas'}</h1><p>Consulta evolución, interacciones, campañas y zonas de visibilidad sin seguimiento personal de los visitantes.</p></div>
        <div className="ad-analytics-controls">
          {memberships.length > 1 ? <label>Negocio<select value={advertiserId} onChange={(e) => setAdvertiserId(e.target.value)}>{memberships.map((item) => <option key={item.advertiserId} value={item.advertiserId}>{item.businessName}</option>)}</select></label> : null}
          <label>Periodo<select value={days} onChange={(e) => setDays(Number(e.target.value) as 30 | 90 | 365)}><option value={30}>30 días</option><option value={90}>90 días</option><option value={365}>12 meses</option></select></label>
          <a className="ad-analytics-export" href={csvHref}>Descargar CSV</a>
        </div>
      </section>

      {error ? <div className="ad-analytics-error" role="alert">{error}</div> : null}
      {loading ? <section className="ad-analytics-loading" role="status">Cargando estadísticas…</section> : null}

      {data ? <>
        <section className="ad-analytics-kpis">
          <Kpi value={data.summary.impressions} label="Impresiones" />
          <Kpi value={data.summary.actions} label="Interacciones" />
          <Kpi value={pct(data.summary.actionRate)} label="Tasa de acción" />
          <Kpi value={data.summary.activeDays} label="Días con actividad" />
        </section>

        <section className="ad-analytics-card ad-analytics-chart-card">
          <div className="ad-analytics-title"><div><p className="eyebrow">Evolución</p><h2>{days === 30 ? 'Día a día' : days === 90 ? 'Por semanas' : 'Por meses'}</h2></div><div className="ad-analytics-legend"><span>Impresiones</span><span>Interacciones</span></div></div>
          {chart.length ? <div className="ad-analytics-chart" aria-label="Gráfico de impresiones e interacciones">
            {chart.map((point) => <div className="ad-analytics-column" key={point.bucket} title={`${point.bucket}: ${point.impressions} impresiones · ${point.actions} interacciones`}><div className="ad-analytics-bars"><i style={{ height: `${Math.max(3, point.impressions / maxValue * 100)}%` }} /><b style={{ height: `${Math.max(3, point.actions / maxValue * 100)}%` }} /></div><small>{point.bucket.slice(5)}</small></div>)}
          </div> : <p className="ad-analytics-empty">Todavía no hay eventos suficientes para dibujar la evolución.</p>}
        </section>

        <section className="ad-analytics-grid">
          <article className="ad-analytics-card"><div className="ad-analytics-title"><div><p className="eyebrow">Acciones</p><h2>Qué hace el usuario</h2></div></div><div className="ad-analytics-list">{data.breakdown.actions.map((item) => <div key={item.event_type}><span>{labelForAction(item.event_type)}</span><strong>{item.total}</strong></div>)}</div></article>
          <article className="ad-analytics-card"><div className="ad-analytics-title"><div><p className="eyebrow">Zona</p><h2>Rendimiento por municipio</h2></div></div><div className="ad-analytics-table">{data.breakdown.municipalities.map((item) => <div key={item.municipality}><span>{item.municipality}</span><small>{item.impressions} imp.</small><strong>{item.actions} acc.</strong></div>)}</div></article>
          <article className="ad-analytics-card"><div className="ad-analytics-title"><div><p className="eyebrow">Ubicación</p><h2>Dónde funciona mejor</h2></div></div><div className="ad-analytics-table">{data.breakdown.placements.map((item) => <div key={item.placement}><span>{item.placement}</span><small>{item.impressions} imp.</small><strong>{item.actions} acc.</strong></div>)}</div></article>
          <article className="ad-analytics-card"><div className="ad-analytics-title"><div><p className="eyebrow">Campañas</p><h2>Histórico de rendimiento</h2></div></div><div className="ad-analytics-campaigns">{data.campaigns.map((item) => <div key={item.id}><div><strong>{item.planCode}</strong><span>{item.status}</span></div><small>{shortDate(item.startsAt)} → {shortDate(item.endsAt)}</small><p>{item.impressions} impresiones · {item.actions} acciones · {pct(item.actionRate)}</p></div>)}</div></article>
        </section>

        <p className="ad-analytics-privacy">{data.privacy} La exportación CSV contiene únicamente agregados diarios del propio anunciante.</p>
      </> : null}
    </main>
  );
}

function Kpi({ value, label }: { value: number | string; label: string }) {
  return <article className="ad-analytics-kpi"><strong>{value}</strong><span>{label}</span></article>;
}
