import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, MapPinned, Mountain, RefreshCw } from 'lucide-react';
import { loadDiscover, resolveDiscoverAsset, type DiscoverPayload } from './discoverFeed';
import '../../styles/discover-real.css';

type LoadState = 'loading' | 'ready' | 'error';

export function DiscoverPanel() {
  const [state, setState] = useState<LoadState>('loading');
  const [payload, setPayload] = useState<DiscoverPayload | null>(null);

  const refresh = async () => {
    setState('loading');
    try {
      const next = await loadDiscover();
      setPayload(next);
      setState('ready');
    } catch {
      setState('error');
    }
  };

  useEffect(() => { void refresh(); }, []);

  if (state === 'loading') {
    return <section className="discover-real__state"><RefreshCw size={20} className="real-news-spin" /><span>Cargando lugares verificados…</span></section>;
  }

  if (state === 'error' || !payload) {
    return <section className="discover-real__state"><MapPinned size={20} /><span>No se ha podido cargar Descubre.</span><button type="button" className="text-action" onClick={() => void refresh()}>Reintentar</button></section>;
  }

  return (
    <section className="discover-real section-block section-block--last">
      <div className="discover-real__hero">
        <img src={resolveDiscoverAsset(payload.heroImage)} alt="Paisaje de Sierra Mágina" />
        <div className="discover-real__hero-overlay" />
        <div className="discover-real__hero-copy">
          <span className="eyebrow">Naturaleza · patrimonio · pueblos</span>
          <h2>Sierra Mágina para descubrir</h2>
          <p>Selección inicial con fichas turísticas oficiales. Cada lugar abre su información original.</p>
        </div>
      </div>

      <div className="discover-real__list">
        {payload.places.map((place) => (
          <a key={place.id} className="discover-real__card" href={place.url} target="_blank" rel="noreferrer">
            <div className="discover-real__icon"><Mountain size={21} /></div>
            <div className="discover-real__copy">
              <div className="discover-real__meta"><span>{place.kind}</span><span>{place.municipality}</span>{place.official && <span>Oficial</span>}</div>
              <strong>{place.name}</strong>
              <p>{place.summary}</p>
            </div>
            <ExternalLink size={16} />
          </a>
        ))}
      </div>

      <a className="discover-real__source" href={payload.sourceUrl} target="_blank" rel="noreferrer">
        <CheckCircle2 size={17} />
        <div><strong>Fuente turística verificada</strong><span>{payload.sourceLabel}</span></div>
        <ExternalLink size={15} />
      </a>
    </section>
  );
}
