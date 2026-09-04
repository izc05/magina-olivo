import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, ChevronRight, ExternalLink, Landmark, Newspaper, RefreshCw, Search, TriangleAlert } from 'lucide-react';
import type { AppNavigate, MaginaTarget } from '../../app/navigation';
import type { MainSection } from '../../components/BottomNav';
import { BottomNav } from '../../components/BottomNav';
import { Brand } from '../../components/Brand';
import { AlertsPanel } from './AlertsPanel';
import { CooperativesPanel } from './CooperativesPanel';
import { DiscoverPanel } from './DiscoverPanel';
import { MarketPanel } from './MarketPanel';
import { NewsPage } from './NewsPage';
import { formatNewsAge, loadRealNews, type RealNewsStory } from './newsFeed';
import '../../styles/news-real.css';

type Props = {
  onNavigate: AppNavigate;
  initialTab?: MaginaTarget;
};

type FeedState = 'loading' | 'ready' | 'error';
type SourceFilter = 'Todos' | 'Ayuntamientos' | 'Cooperativas';

export function RealNewsPage({ onNavigate, initialTab = 'actualidad' }: Props) {
  const [mode, setMode] = useState<MaginaTarget>(initialTab);
  const [stories, setStories] = useState<RealNewsStory[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string>('');
  const [sourceCount, setSourceCount] = useState(0);
  const [healthySourceCount, setHealthySourceCount] = useState(0);
  const [municipalSourceCount, setMunicipalSourceCount] = useState(0);
  const [healthyMunicipalSourceCount, setHealthyMunicipalSourceCount] = useState(0);
  const [municipalStoryCount, setMunicipalStoryCount] = useState(0);
  const [collectorErrors, setCollectorErrors] = useState<string[]>([]);
  const [state, setState] = useState<FeedState>('loading');
  const [query, setQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState('Todos');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('Todos');

  const refresh = async () => {
    setState('loading');
    try {
      const payload = await loadRealNews();
      setStories(payload.stories);
      setGeneratedAt(payload.generatedAt);
      setSourceCount(payload.sourceCount ?? 0);
      setHealthySourceCount(payload.healthySourceCount ?? payload.sourceCount ?? 0);
      setMunicipalSourceCount(payload.municipalSourceCount ?? 0);
      setHealthyMunicipalSourceCount(payload.healthyMunicipalSourceCount ?? 0);
      setMunicipalStoryCount(payload.municipalStoryCount ?? payload.stories.filter((story) => story.municipalityId).length);
      setCollectorErrors(payload.collectorErrors ?? []);
      setState('ready');
    } catch {
      setState('error');
    }
  };

  useEffect(() => {
    if (mode === 'actualidad') void refresh();
  }, [mode]);

  const availableScopes = useMemo(() => {
    const preferred = ['Sierra Mágina', 'Jaén', 'Andalucía', 'Sector'];
    return preferred.filter((scope) => stories.some((story) => story.scope === scope));
  }, [stories]);

  const availableSourceFilters = useMemo<SourceFilter[]>(() => {
    const filters: SourceFilter[] = ['Todos'];
    if (stories.some((story) => story.municipalityId)) filters.push('Ayuntamientos');
    if (stories.some((story) => story.cooperativeId)) filters.push('Cooperativas');
    return filters;
  }, [stories]);

  const filteredStories = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('es');

    return stories.filter((story) => {
      const matchesScope = scopeFilter === 'Todos' || story.scope === scopeFilter;
      const matchesSource = sourceFilter === 'Todos'
        || (sourceFilter === 'Ayuntamientos' && Boolean(story.municipalityId))
        || (sourceFilter === 'Cooperativas' && Boolean(story.cooperativeId));
      if (!matchesScope || !matchesSource) return false;
      if (!needle) return true;

      return `${story.title} ${story.excerpt} ${story.source} ${story.category} ${story.scope ?? ''} ${story.municipalityName ?? ''}`
        .toLocaleLowerCase('es')
        .includes(needle);
    });
  }, [query, scopeFilter, sourceFilter, stories]);

  const handleBottomNavigate = (section: MainSection) => {
    if (section === 'news') setMode('actualidad');
    onNavigate(section);
  };

  const handleNestedNavigate: AppNavigate = (section, target) => {
    if (section === 'news') {
      setMode(target ? target as MaginaTarget : 'actualidad');
    }
    onNavigate(section, target);
  };

  const primaryTabs = (
    <nav className="hub-tabs hub-tabs--primary" aria-label="Secciones principales de Mágina">
      <button className={mode === 'actualidad' ? 'hub-tab hub-tab--active' : 'hub-tab'} type="button" onClick={() => setMode('actualidad')}>Noticias</button>
      <button className={mode === 'cooperativas' ? 'hub-tab hub-tab--active' : 'hub-tab'} type="button" onClick={() => setMode('cooperativas')}>Cooperativas</button>
      <button className={mode === 'mercado' ? 'hub-tab hub-tab--active' : 'hub-tab'} type="button" onClick={() => setMode('mercado')}>Mercado</button>
      <button className={mode === 'discover' ? 'hub-tab hub-tab--active' : 'hub-tab'} type="button" onClick={() => setMode('discover')}>Descubre</button>
      <button className={mode === 'local' || mode === 'community' || mode === 'agenda' ? 'hub-tab hub-tab--active' : 'hub-tab'} type="button" onClick={() => setMode('local')}>Más</button>
    </nav>
  );

  if (mode === 'alertas') {
    return (
      <div className="app-shell">
        <main className="mobile-page">
          <header className="topbar">
            <Brand />
            <button className="icon-button" type="button" aria-label="Volver a noticias" onClick={() => setMode('actualidad')}><Newspaper size={19} /></button>
          </header>
          <AlertsPanel onBack={() => setMode('actualidad')} />
        </main>
        <BottomNav active="news" onNavigate={handleBottomNavigate} />
      </div>
    );
  }

  if (mode === 'cooperativas') {
    return (
      <div className="app-shell">
        <main className="mobile-page">
          <header className="topbar">
            <Brand />
            <div className="topbar-actions">
              <button className="icon-button" type="button" aria-label="Volver a noticias" onClick={() => setMode('actualidad')}><Newspaper size={19} /></button>
              <button className="icon-button" type="button" aria-label="Alertas" onClick={() => setMode('alertas')}><Bell size={20} /></button>
            </div>
          </header>

          <section className="magina-heading">
            <span className="eyebrow">Sierra Mágina</span>
            <h1>Cooperativas</h1>
            <p>Directorio verificado de entidades y marcas de la D.O.P., preparado para incorporar servicios operativos trazables.</p>
          </section>

          {primaryTabs}
          <CooperativesPanel />
        </main>
        <BottomNav active="news" onNavigate={handleBottomNavigate} />
      </div>
    );
  }

  if (mode === 'mercado') {
    return (
      <div className="app-shell">
        <main className="mobile-page">
          <header className="topbar">
            <Brand />
            <div className="topbar-actions">
              <button className="icon-button" type="button" aria-label="Volver a noticias" onClick={() => setMode('actualidad')}><Newspaper size={19} /></button>
              <button className="icon-button" type="button" aria-label="Alertas" onClick={() => setMode('alertas')}><Bell size={20} /></button>
            </div>
          </header>

          <section className="magina-heading">
            <span className="eyebrow">Aceite de oliva</span>
            <h1>Mercado</h1>
            <p>Precio semanal en origen con fuente pública, evolución y contexto para leer el mercado sin confundirlo con una liquidación concreta.</p>
          </section>

          {primaryTabs}
          <MarketPanel onBack={() => setMode('actualidad')} />
        </main>
        <BottomNav active="news" onNavigate={handleBottomNavigate} />
      </div>
    );
  }

  if (mode === 'discover') {
    return (
      <div className="app-shell">
        <main className="mobile-page">
          <header className="topbar">
            <Brand />
            <div className="topbar-actions">
              <button className="icon-button" type="button" aria-label="Volver a noticias" onClick={() => setMode('actualidad')}><Newspaper size={19} /></button>
              <button className="icon-button" type="button" aria-label="Alertas" onClick={() => setMode('alertas')}><Bell size={20} /></button>
            </div>
          </header>

          <section className="magina-heading">
            <span className="eyebrow">Sierra Mágina</span>
            <h1>Descubre</h1>
            <p>Naturaleza, pueblos y patrimonio con fichas oficiales para explorar el territorio sin mezclar contenido de demostración.</p>
          </section>

          {primaryTabs}
          <DiscoverPanel />
        </main>
        <BottomNav active="news" onNavigate={handleBottomNavigate} />
      </div>
    );
  }

  if (mode !== 'actualidad') {
    return <NewsPage onNavigate={handleNestedNavigate} initialTab={mode} />;
  }

  const hero = filteredStories[0] ?? null;
  const rest = filteredStories.slice(1);

  return (
    <div className="app-shell">
      <main className="mobile-page">
        <header className="topbar">
          <Brand />
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Actualizar noticias" onClick={() => void refresh()}>
              <RefreshCw size={19} />
            </button>
            <button className="icon-button" type="button" aria-label="Alertas" onClick={() => setMode('alertas')}>
              <Bell size={20} />
            </button>
          </div>
        </header>

        <section className="magina-heading">
          <span className="eyebrow">Sierra Mágina</span>
          <h1>Mágina al día</h1>
          <p>Noticias del territorio, ayuntamientos, cooperativas, olivar y fuentes oficiales que realmente te afectan.</p>
        </section>

        {primaryTabs}

        <section className="real-news-toolbar" aria-label="Buscar noticias">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar pueblo, olivar, ayudas, Mágina..."
            aria-label="Buscar noticias"
          />
        </section>

        {state === 'ready' && availableScopes.length > 0 && (
          <div className="real-news-filters" aria-label="Filtrar noticias por ámbito">
            {['Todos', ...availableScopes].map((scope) => (
              <button
                key={scope}
                type="button"
                className={scopeFilter === scope ? 'real-news-filter real-news-filter--active' : 'real-news-filter'}
                onClick={() => setScopeFilter(scope)}
              >
                {scope}
              </button>
            ))}
          </div>
        )}

        {state === 'ready' && availableSourceFilters.length > 1 && (
          <div className="real-news-filters" aria-label="Filtrar noticias por tipo de fuente">
            {availableSourceFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={sourceFilter === filter ? 'real-news-filter real-news-filter--active' : 'real-news-filter'}
                onClick={() => setSourceFilter(filter)}
              >
                {filter === 'Ayuntamientos' && <Landmark size={14} aria-hidden="true" />}
                {filter}
              </button>
            ))}
          </div>
        )}

        {state === 'loading' && (
          <section className="real-news-status">
            <RefreshCw size={22} className="real-news-spin" />
            <div><strong>Actualizando noticias</strong><span>Consultando ayuntamientos, cooperativas, fuentes locales, oficiales y del sector.</span></div>
          </section>
        )}

        {state === 'error' && (
          <section className="real-news-status real-news-status--error">
            <Newspaper size={22} />
            <div><strong>No se ha podido actualizar</strong><span>El feed anterior sigue protegido. Prueba de nuevo en unos minutos.</span></div>
            <button type="button" className="text-action" onClick={() => void refresh()}>Reintentar</button>
          </section>
        )}

        {state === 'ready' && hero && (
          <>
            <a className="news-hero-card real-news-hero" href={hero.url} target="_blank" rel="noreferrer">
              <div className="news-hero-card__image">{hero.municipalityId ? <Landmark size={38} /> : <Newspaper size={38} />}</div>
              <div className="news-hero-card__overlay" />
              <div className="news-hero-card__copy">
                <div className="real-news-badges">
                  <span>{hero.category}</span>
                  {hero.municipalityName && <span className="real-news-scope">{hero.municipalityName}</span>}
                  {!hero.municipalityName && hero.scope && <span className="real-news-scope">{hero.scope}</span>}
                  {hero.official && <span className="real-news-official">Oficial</span>}
                </div>
                <h2>{hero.title}</h2>
                <small>{hero.source} · {formatNewsAge(hero.publishedAt)}</small>
              </div>
            </a>

            <section className="section-block">
              <div className="section-heading">
                <div><span className="eyebrow">Actualidad real</span><h2>Lo más relevante</h2></div>
                <span className="real-news-live">● En directo</span>
              </div>

              <div className="story-list">
                {rest.map((story) => (
                  <a key={story.id} className="story-row real-news-row" href={story.url} target="_blank" rel="noreferrer">
                    <div className="story-row__image">{story.municipalityId ? <Landmark size={22} /> : <Newspaper size={22} />}</div>
                    <div className="story-row__copy">
                      <div className="real-news-row-meta">
                        <span>{story.category}</span>
                        {story.municipalityName && <span className="real-news-scope real-news-scope--small">{story.municipalityName}</span>}
                        {!story.municipalityName && story.scope && <span className="real-news-scope real-news-scope--small">{story.scope}</span>}
                        {story.official && <span className="real-news-official real-news-official--small">Oficial</span>}
                      </div>
                      <strong>{story.title}</strong>
                      <small>{story.source} · {formatNewsAge(story.publishedAt)}</small>
                    </div>
                    <ChevronRight size={18} />
                  </a>
                ))}
              </div>
            </section>

            <section className="section-block section-block--last real-news-source-note">
              {collectorErrors.length === 0 ? <CheckCircle2 size={18} /> : <TriangleAlert size={18} />}
              <div>
                <strong>{collectorErrors.length === 0 ? 'Fuentes operativas' : 'Actualización parcial'}</strong>
                <span>
                  {sourceCount > 0
                    ? `${healthySourceCount}/${sourceCount} fuentes respondieron correctamente. Cada titular abre la publicación original.`
                    : 'Cada titular abre la publicación original. Mágina Olivo no copia el artículo completo.'}
                </span>
                {municipalSourceCount > 0 && (
                  <small>Ayuntamientos: {healthyMunicipalSourceCount}/{municipalSourceCount} fuentes · {municipalStoryCount} noticias municipales seleccionadas.</small>
                )}
                {generatedAt && <small>Última actualización: {new Date(generatedAt).toLocaleString('es-ES')}</small>}
              </div>
              <ExternalLink size={16} />
            </section>
          </>
        )}

        {state === 'ready' && !hero && (
          <section className="real-news-status">
            <Newspaper size={22} />
            <div><strong>Sin resultados</strong><span>Prueba con otra búsqueda o cambia el ámbito/tipo de fuente.</span></div>
          </section>
        )}
      </main>

      <BottomNav active="news" onNavigate={handleBottomNavigate} />
    </div>
  );
}
