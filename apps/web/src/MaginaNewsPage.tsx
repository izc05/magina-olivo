import { useEffect, useState } from 'react';

type NewsFreshness = {
  status: 'fresh' | 'aging' | 'archive' | 'unknown';
  ageDays: number | null;
};

type PublicNewsItem = {
  id: string;
  externalId: string;
  title: string;
  publishedAt: string;
  topic: string | null;
  sourceUrl: string;
  freshness: NewsFreshness;
};

type PublicNewsResponse = {
  source: {
    label: string;
    provider: string;
    sourceUrl: string | null;
    sourceUpdatedAt: string | null;
    lastCheckedAt: string | null;
    lastSuccessAt: string | null;
    hasError: boolean;
  };
  items: PublicNewsItem[];
  policy: string;
};

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Fecha por revisar'
    : date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

function freshnessLabel(freshness: NewsFreshness): string {
  switch (freshness.status) {
    case 'fresh': return 'Reciente';
    case 'aging': return 'En seguimiento';
    case 'archive': return 'Archivo';
    default: return 'Fecha por revisar';
  }
}

function topicLabel(topic: string | null): string {
  const labels: Record<string, string> = {
    'mercado-aceite': 'Aceite y mercado',
    'pac-olivar': 'PAC y olivar',
    'exportaciones-aove': 'AOVE y exportaciones',
    'estrategia-olivar': 'Sector del olivar',
  };
  return topic ? labels[topic] ?? 'Actualidad agraria' : 'Actualidad agraria';
}

export function MaginaNewsPage() {
  const [data, setData] = useState<PublicNewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/v1/public/news', {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<PublicNewsResponse>;
    }).then((result) => {
      setData(result);
      setError(false);
    }).catch((reason) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(true);
    }).finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  return (
    <main className="magina-hub-shell" id="main-content">
      <header className="directory-header">
        <a className="directory-brand" href="/magina" aria-label="Volver a Mágina">
          <img src="/brand/magina-olivo-mark.svg" alt="" />
          <span><strong>Mágina Olivo</strong><small>Sierra Mágina · Jaén</small></span>
        </a>
        <a className="directory-back" href="/magina">Mágina</a>
      </header>

      <section className="magina-hub-hero" aria-labelledby="magina-news-title">
        <p className="eyebrow">Noticias</p>
        <h1 id="magina-news-title">Olivar y sector, con fuente y fecha</h1>
        <p>Actualidad pública verificada para el olivar. Mostramos título, fecha, tema y procedencia; el artículo completo permanece en su fuente original.</p>
      </section>

      {loading ? <div className="alert" role="status">Consultando noticias verificadas…</div> : null}
      {error ? <div className="alert" role="alert">No se han podido cargar ahora las noticias verificadas.</div> : null}

      {data ? (
        <section className="magina-source-section" aria-labelledby="verified-news-title">
          <div className="magina-source-heading">
            <div>
              <p className="eyebrow page-eyebrow">Fuente pública</p>
              <h2 id="verified-news-title">Actualidad verificada</h2>
            </div>
            <span className="badge">{data.source.provider}</span>
          </div>

          <div className="magina-source-list">
            {data.items.length === 0 ? (
              <div className="alert" role="status">No hay noticias recientes verificadas dentro de la ventana de publicación.</div>
            ) : data.items.map((item) => (
              <article className="card magina-source-row" key={item.id}>
                <div>
                  <p className="eyebrow page-eyebrow">{topicLabel(item.topic)}</p>
                  <h3>{item.title}</h3>
                  <p>{dateLabel(item.publishedAt)} · {data.source.provider}</p>
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer">Leer en la fuente oficial →</a>
                </div>
                <div className="magina-source-meta">
                  <span className={`source-health${item.freshness.status === 'aging' ? ' warning' : ''}`}>
                    {freshnessLabel(item.freshness)}
                  </span>
                  {item.freshness.ageDays !== null ? <small>Publicada hace {item.freshness.ageDays} días</small> : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="directory-footer">
        <p>No copiamos el texto de los artículos. Mágina Olivo conserva únicamente metadatos verificados y enlaza a la publicación original.</p>
      </footer>
    </main>
  );
}
