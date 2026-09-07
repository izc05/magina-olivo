import { VisualHeader } from './VisualChrome';
import { useEffect, useState } from 'react';

type MarketMetadata = {
  currentness?: string;
  latestEditorialOilPublication?: string;
  latestEditorialOilPublicationDate?: string;
  catalogLastUpdatedAt?: string;
  catalogDeclaredFrequency?: string;
  usage?: string;
};

type PublicSource = {
  key: string;
  provider: string;
  label: string;
  sourceUrl: string | null;
  licenseLabel: string | null;
  updateFrequency: string | null;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  hasError: boolean;
  metadata?: MarketMetadata | null;
};

type MarketSeries = {
  series: Array<{ week: string; priceEurKg: number }>;
  fetchedAt: string;
  source: { label: string; url: string; scope: string };
  freshness: { status: 'fresh' | 'aging' | 'stale'; ageDays: number | null };
};

function dateLabel(value?: string | null): string {
  if (!value) return 'Pendiente';
  const date = new Date(`${value.length === 10 ? `${value}T00:00:00Z` : value}`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-ES');
}

export function MaginaMarketPage() {
  const [source, setSource] = useState<PublicSource | null>(null);
  const [marketSeries, setMarketSeries] = useState<MarketSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/v1/public/sources', {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{ items: PublicSource[] }>;
    }).then((result) => {
      setSource(result.items.find((item) => item.key === 'observatorio-agricultural-prices') ?? null);
    }).catch((reason) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(true);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/v1/public/market/olive-oil', { headers: { accept: 'application/json' }, signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<MarketSeries> : Promise.reject(new Error('market')))
      .then(setMarketSeries).catch(() => undefined);
    return () => controller.abort();
  }, []);

  const metadata = source?.metadata ?? null;
  const structuredVerified = metadata?.currentness === 'verified-current-content';
  const points = marketSeries?.series ?? [];
  const latestPoint = points.at(-1);
  const low = Math.min(...points.map((point) => point.priceEurKg));
  const high = Math.max(...points.map((point) => point.priceEurKg));
  const range = Math.max(.1, high - low);
  const graphPoints = points.map((point, index) => `${index * (100 / Math.max(1, points.length - 1))},${90 - ((point.priceEurKg - low) / range) * 72}`).join(' ');

  return (
    <main className="market-shell" id="main-content">
      <VisualHeader />

      <section className="market-hero" aria-labelledby="market-title">
        <p className="eyebrow">Mágina · Aceite y mercado</p>
        <h1 id="market-title">Contexto de mercado, con fecha y procedencia</h1>
        <p>Información pública para entender tendencias del aceite. Nunca se presenta como la liquidación que una cooperativa pagará a un socio.</p>
      </section>

      {error ? <div className="alert" role="alert">No se ha podido consultar ahora el estado de la fuente oficial.</div> : null}
      {source?.hasError ? (
        <div className="alert" role="status">
          La última comprobación automática de esta fuente registró una incidencia. Mágina Olivo mantiene bloqueada la publicación de precios estructurados hasta recuperar y verificar la fuente.
        </div>
      ) : null}

      <section className="market-grid" aria-busy={loading}>
        <article className="card market-card editorial-card">
          <span className="badge gold">Publicación oficial</span>
          <h2>{metadata?.latestEditorialOilPublication ?? 'Informe semanal de aceite'}</h2>
          <p className="market-date">{dateLabel(metadata?.latestEditorialOilPublicationDate)}</p>
          <p>El Observatorio de Precios y Mercados publica informes semanales de aceite. Esta fecha es editorial y se conserva separada de cualquier feed estructurado.</p>
        </article>

        <article className={`card market-card ${structuredVerified ? 'verified' : 'pending'}`}>
          <span className="badge">{structuredVerified ? 'Datos verificados' : 'Verificación pendiente'}</span>
          <h2>Precios estructurados</h2>
          {structuredVerified ? (
            <p>La fuente estructurada ha superado el control de frescura. Los valores podrán mostrarse con fecha, unidad y posición comercial.</p>
          ) : (
            <p><strong>No publicamos todavía ningún €/kg.</strong> El catálogo declara frecuencia diaria, pero la vigencia del CSV/JSON debe verificarse en staging antes de usar sus valores.</p>
          )}
          <dl className="market-facts">
            <div><dt>Catálogo actualizado</dt><dd>{dateLabel(metadata?.catalogLastUpdatedAt)}</dd></div>
            <div><dt>Frecuencia declarada</dt><dd>{metadata?.catalogDeclaredFrequency ?? 'Pendiente'}</dd></div>
            <div><dt>Última inspección técnica</dt><dd>{dateLabel(source?.lastSuccessAt ?? source?.lastCheckedAt)}</dd></div>
          </dl>
        </article>
      </section>

      {points.length >= 2 ? <section className="card market-chart-card" aria-labelledby="market-chart-title">
        <div className="market-chart-heading"><div><p className="eyebrow">EVOLUCIÓN PUBLICADA</p><h2 id="market-chart-title">Aceites de oliva</h2><p>Precio público semanal en €/kg.</p></div><div className="market-latest"><small>Última semana</small><strong>{latestPoint?.priceEurKg.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/kg</strong><span>{latestPoint?.week}</span></div></div>
        <svg className="market-line-chart" viewBox="0 0 100 100" role="img" aria-label={`Evolución publicada, última semana ${latestPoint?.week}: ${latestPoint?.priceEurKg.toLocaleString('es-ES')} euros por kilogramo`} preserveAspectRatio="none"><path d="M0 90H100" className="market-chart-baseline" /><polyline points={graphPoints} className="market-chart-line" vectorEffect="non-scaling-stroke" />{points.map((point, index) => <circle key={point.week} cx={index * (100 / Math.max(1, points.length - 1))} cy={90 - ((point.priceEurKg - low) / range) * 72} r="1.5" className="market-chart-dot" vectorEffect="non-scaling-stroke" />)}</svg>
        <div className="market-chart-labels">{points.map((point) => <span key={point.week}>{point.week}</span>)}</div>
        <p className={`market-chart-source ${marketSeries?.freshness.status ?? 'stale'}`}>Fuente: <a href={marketSeries?.source.url} target="_blank" rel="noreferrer noopener">{marketSeries?.source.label}</a> · consultada {dateLabel(marketSeries?.fetchedAt)}{marketSeries?.freshness.ageDays != null ? ` · dato de hace ${marketSeries.freshness.ageDays} días` : ''}. {marketSeries?.source.scope}</p>
      </section> : null}

      <section className="card market-rule-card">
        <p className="eyebrow page-eyebrow">Regla de producto</p>
        <h2>Mercado ≠ liquidación de tu cooperativa</h2>
        <p>Los precios públicos son contexto de mercado y pueden corresponder a posiciones comerciales, calidades y periodos distintos. Tus rendimientos, anticipos, liquidaciones y pagos pertenecen a tu histórico privado y se registrarán por separado.</p>
      </section>

      <footer className="directory-footer">
        <p>
          Fuente registrada: {source?.provider ?? 'Observatorio de Precios y Mercados · Junta de Andalucía'}{source?.licenseLabel ? ` · ${source.licenseLabel}` : ''}.
          {source?.sourceUrl ? <> <a href={source.sourceUrl} target="_blank" rel="noreferrer noopener">Consultar fuente oficial</a>.</> : null}
        </p>
      </footer>
    </main>
  );
}
