import { useEffect, useState } from 'react';
import { PublicHeader } from './publicNavigation';

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

function dateLabel(value?: string | null): string {
  if (!value) return 'Pendiente';
  const date = new Date(`${value.length === 10 ? `${value}T00:00:00Z` : value}`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-ES');
}

export function MaginaMarketPage() {
  const [source, setSource] = useState<PublicSource | null>(null);
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

  const metadata = source?.metadata ?? null;
  const structuredVerified = metadata?.currentness === 'verified-current-content';

  return (
    <main className="market-shell" id="main-content">
      <PublicHeader backHref="/magina" backLabel="Volver a Mágina" />

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
