import { useEffect, useState } from 'react';

type PublicSource = {
  key: string;
  label: string;
  provider: string;
  updateFrequency: string | null;
  sourceUpdatedAt: string | null;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  hasError: boolean;
};

function dateLabel(value: string | null): string {
  if (!value) return 'Pendiente de comprobación';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleDateString('es-ES');
}

export function MaginaHubPage() {
  const [sources, setSources] = useState<PublicSource[]>([]);
  const [sourceError, setSourceError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/v1/public/sources', {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{ items: PublicSource[] }>;
    }).then((result) => setSources(result.items)).catch((reason) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setSourceError(true);
    });
    return () => controller.abort();
  }, []);

  return (
    <main className="magina-hub-shell" id="main-content">
      <header className="directory-header">
        <a className="directory-brand" href="/" aria-label="Volver a Mágina Olivo">
          <img src="/brand/magina-olivo-mark.svg" alt="" />
          <span><strong>Mágina Olivo</strong><small>Sierra Mágina · Jaén</small></span>
        </a>
        <a className="directory-back" href="/">Mi Mágina Olivo</a>
      </header>

      <section className="magina-hub-hero" aria-labelledby="magina-hub-title">
        <p className="eyebrow">Mágina</p>
        <h1 id="magina-hub-title">Tu territorio, en un solo lugar</h1>
        <p>Información pública útil para el olivar de Sierra Mágina, separada de tus fincas, entregas y documentos privados.</p>
      </section>

      <section className="magina-hub-grid" aria-label="Servicios públicos de Mágina">
        <a className="card magina-hub-card ready" href="/magina/tiempo">
          <span className="badge gold">Disponible</span>
          <h2>Tiempo</h2>
          <p>Predicción oficial AEMET por municipio, con lluvia, temperatura y viento.</p>
          <strong>Ver predicción →</strong>
        </a>

        <a className="card magina-hub-card ready" href="/magina/directorio">
          <span className="badge gold">23 entidades</span>
          <h2>Cooperativas y almazaras</h2>
          <p>Directorio público por municipio y tipo jurídico, con procedencia y fecha de revisión.</p>
          <strong>Abrir directorio →</strong>
        </a>

        <article className="card magina-hub-card pending">
          <span className="badge">En preparación</span>
          <h2>Estado fitosanitario</h2>
          <p>RAIF · seguimiento público del olivar. La ingesta está preparada con trazabilidad antes de convertirla en señales locales.</p>
          <strong>No diagnostica tu parcela</strong>
        </article>

        <article className="card magina-hub-card pending">
          <span className="badge">Siguiente fase</span>
          <h2>Mercado y noticias</h2>
          <p>Información del aceite, cooperativas y actualidad local con fuentes verificadas y fecha visible.</p>
          <strong>Sin datos privados</strong>
        </article>
      </section>

      <section className="magina-source-section" aria-labelledby="source-health-title">
        <div className="magina-source-heading">
          <div>
            <p className="eyebrow page-eyebrow">Transparencia</p>
            <h2 id="source-health-title">De dónde sale la información</h2>
          </div>
          <span className="badge">Fuentes públicas</span>
        </div>

        {sourceError ? <div className="alert" role="status">No se ha podido consultar ahora el estado de las fuentes.</div> : null}

        <div className="magina-source-list">
          {sources.map((source) => (
            <article className="card magina-source-row" key={source.key}>
              <div>
                <h3>{source.provider}</h3>
                <p>{source.label}</p>
              </div>
              <div className="magina-source-meta">
                <span className={`source-health${source.hasError ? ' warning' : ''}`}>
                  {source.hasError ? 'Revisión necesaria' : 'Fuente registrada'}
                </span>
                <small>Fuente actualizada: {dateLabel(source.sourceUpdatedAt)}</small>
                <small>Comprobada: {dateLabel(source.lastSuccessAt ?? source.lastCheckedAt)}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="directory-footer">
        <p>La información pública se muestra con procedencia y fecha. Tus datos de campo, campañas y documentos permanecen en el área privada y no se publican aquí.</p>
      </footer>
    </main>
  );
}
