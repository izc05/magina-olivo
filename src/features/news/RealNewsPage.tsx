import { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronRight, ExternalLink, Newspaper, RefreshCw, Search } from 'lucide-react';
import type { AppNavigate, MaginaTarget } from '../../app/navigation';
import { BottomNav } from '../../components/BottomNav';
import { Brand } from '../../components/Brand';
import { NewsPage } from './NewsPage';
import { formatNewsAge, loadRealNews, type RealNewsStory } from './newsFeed';
import '../../styles/news-real.css';

type Props = {
  onNavigate: AppNavigate;
  initialTab?: MaginaTarget;
};

type FeedState = 'loading' | 'ready' | 'error';

export function RealNewsPage({ onNavigate, initialTab = 'actualidad' }: Props) {
  const [mode, setMode] = useState<MaginaTarget>(initialTab);
  const [stories, setStories] = useState<RealNewsStory[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string>('');
  const [state, setState] = useState<FeedState>('loading');
  const [query, setQuery] = useState('');

  const refresh = async () => {
    setState('loading');
    try {
      const payload = await loadRealNews();
      setStories(payload.stories);
      setGeneratedAt(payload.generatedAt);
      setState('ready');
    } catch {
      setState('error');
    }
  };

  useEffect(() => {
    if (mode === 'actualidad') void refresh();
  }, [mode]);

  const filteredStories = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('es');
    if (!needle) return stories;

    return stories.filter((story) =>
      `${story.title} ${story.excerpt} ${story.source} ${story.category}`
        .toLocaleLowerCase('es')
        .includes(needle),
    );
  }, [query, stories]);

  if (mode !== 'actualidad') {
    return <NewsPage onNavigate={onNavigate} initialTab={mode} />;
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
          <p>Noticias reales del olivar, aceite, agricultura, Jaén y Sierra Mágina.</p>
        </section>

        <nav className="hub-tabs hub-tabs--primary" aria-label="Secciones principales de Mágina">
          <button className="hub-tab hub-tab--active" type="button">Noticias</button>
          <button className="hub-tab" type="button" onClick={() => setMode('cooperativas')}>Cooperativas</button>
          <button className="hub-tab" type="button" onClick={() => setMode('mercado')}>Mercado</button>
          <button className="hub-tab" type="button" onClick={() => setMode('discover')}>Descubre</button>
          <button className="hub-tab" type="button" onClick={() => setMode('local')}>Más</button>
        </nav>

        <section className="real-news-toolbar" aria-label="Buscar noticias">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar olivar, ayudas, Mágina..."
            aria-label="Buscar noticias"
          />
        </section>

        {state === 'loading' && (
          <section className="real-news-status">
            <RefreshCw size={22} className="real-news-spin" />
            <div><strong>Actualizando noticias</strong><span>Consultando el feed de Mágina Olivo.</span></div>
          </section>
        )}

        {state === 'error' && (
          <section className="real-news-status real-news-status--error">
            <Newspaper size={22} />
            <div><strong>No se ha podido actualizar</strong><span>Conservamos el módulo preparado. Prueba de nuevo en unos minutos.</span></div>
            <button type="button" className="text-action" onClick={() => void refresh()}>Reintentar</button>
          </section>
        )}

        {state === 'ready' && hero && (
          <>
            <a className="news-hero-card real-news-hero" href={hero.url} target="_blank" rel="noreferrer">
              <div className="news-hero-card__image"><Newspaper size={38} /></div>
              <div className="news-hero-card__overlay" />
              <div className="news-hero-card__copy">
                <span>{hero.category}</span>
                <h2>{hero.title}</h2>
                <small>{hero.source} · {formatNewsAge(hero.publishedAt)}</small>
              </div>
            </a>

            <section className="section-block">
              <div className="section-heading">
                <div><span className="eyebrow">Actualidad real</span><h2>Lo último</h2></div>
                <span className="real-news-live">● En directo</span>
              </div>

              <div className="story-list">
                {rest.map((story) => (
                  <a key={story.id} className="story-row real-news-row" href={story.url} target="_blank" rel="noreferrer">
                    <div className="story-row__image"><Newspaper size={22} /></div>
                    <div className="story-row__copy">
                      <span>{story.category}</span>
                      <strong>{story.title}</strong>
                      <small>{story.source} · {formatNewsAge(story.publishedAt)}</small>
                    </div>
                    <ChevronRight size={18} />
                  </a>
                ))}
              </div>
            </section>

            <section className="section-block section-block--last real-news-source-note">
              <ExternalLink size={18} />
              <div>
                <strong>Fuente visible y enlace original</strong>
                <span>Cada titular abre la publicación original. Mágina Olivo no copia el artículo completo.</span>
                {generatedAt && <small>Feed generado: {new Date(generatedAt).toLocaleString('es-ES')}</small>}
              </div>
            </section>
          </>
        )}

        {state === 'ready' && !hero && (
          <section className="real-news-status">
            <Newspaper size={22} />
            <div><strong>Sin resultados</strong><span>Prueba con otra búsqueda.</span></div>
          </section>
        )}
      </main>

      <BottomNav active="news" onNavigate={onNavigate} />
    </div>
  );
}
