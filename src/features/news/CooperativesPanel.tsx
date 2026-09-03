import { useEffect, useMemo, useState } from 'react';
import { Building2, ChevronRight, ExternalLink, LoaderCircle, MapPin, Search, ShieldCheck } from 'lucide-react';
import { CooperativeDetail, type CooperativeSummary } from './CooperativeDetail';
import { loadCooperatives, type CooperativeRecord } from './cooperativesFeed';
import '../../styles/cooperatives-v24.css';

type LoadState = 'loading' | 'ready' | 'error';

export function CooperativesPanel() {
  const [selected, setSelected] = useState<CooperativeSummary | null>(null);
  const [cooperatives, setCooperatives] = useState<CooperativeRecord[]>([]);
  const [sourceLabel, setSourceLabel] = useState('D.O.P. Sierra Mágina');
  const [sourceUrl, setSourceUrl] = useState('https://aove.sierramagina.org/marcas/');
  const [query, setQuery] = useState('');
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    void loadCooperatives()
      .then((payload) => {
        setCooperatives(payload.cooperatives);
        setSourceLabel(payload.sourceLabel);
        setSourceUrl(payload.sourceUrl);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('es');
    if (!needle) return cooperatives;
    return cooperatives.filter((coop) => `${coop.name} ${coop.town} ${coop.brand}`.toLocaleLowerCase('es').includes(needle));
  }, [cooperatives, query]);

  if (selected) {
    return <CooperativeDetail cooperative={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <section className="section-block hub-panel hub-panel--flush cooperatives-v24">
      <div className="section-heading">
        <div><span className="eyebrow">Directorio verificado</span><h2>Cooperativas</h2></div>
        <span className="coop-verified-count"><ShieldCheck size={15} /> {cooperatives.length}</span>
      </div>

      <div className="coop-search">
        <Search size={17} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar municipio, cooperativa o marca" aria-label="Buscar cooperativas" />
      </div>

      {state === 'loading' && (
        <div className="coop-state"><LoaderCircle size={21} className="real-news-spin" /><span>Cargando directorio oficial…</span></div>
      )}

      {state === 'error' && (
        <div className="coop-state"><Building2 size={21} /><span>No se ha podido cargar el directorio. La fuente oficial sigue disponible.</span></div>
      )}

      {state === 'ready' && (
        <div className="coop-list coop-list--verified">
          {visible.map((coop, index) => (
            <article className="coop-card coop-card--territorial" key={coop.id}>
              <div className={`coop-card__photo coop-card__photo--${(index % 3) + 1}`}>
                <div className="coop-card__photo-shade" />
                <span><MapPin size={13} /> {coop.town}</span>
              </div>

              <div className="coop-card__body">
                <div className="coop-card__head">
                  <div className="coop-card__mark"><Building2 size={22} /></div>
                  <div><strong>{coop.name}</strong><span>D.O.P. Sierra Mágina</span></div>
                  <small><ShieldCheck size={13} /> Verificada</small>
                </div>

                <div className="coop-card__metrics coop-card__metrics--single">
                  <div><span>Marca vinculada</span><strong>{coop.brand}</strong></div>
                </div>

                <button type="button" className="secondary-button" onClick={() => setSelected({ ...coop, sourceLabel, sourceUrl })}>
                  Ver ficha <ChevronRight size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {state === 'ready' && visible.length === 0 && (
        <div className="coop-state"><Search size={20} /><span>No hay coincidencias para esa búsqueda.</span></div>
      )}

      <a className="coop-demo-note coop-demo-note--verified" href={sourceUrl} target="_blank" rel="noreferrer">
        <ShieldCheck size={17} />
        <span>Directorio basado en {sourceLabel}. No se muestran precios, horarios ni estados operativos sin verificar.</span>
        <ExternalLink size={15} />
      </a>
    </section>
  );
}
