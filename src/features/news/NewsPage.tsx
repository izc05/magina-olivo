import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Bookmark,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Euro,
  MapPin,
  Newspaper,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Wheat,
} from 'lucide-react';
import type { AppNavigate, MaginaTarget } from '../../app/navigation';
import { Brand } from '../../components/Brand';
import { BottomNav } from '../../components/BottomNav';
import { CommunityPanel } from './CommunityPanel';
import { CooperativesPanel } from './CooperativesPanel';
import { LocalDiscoverPanel } from './LocalDiscoverPanel';
import '../../styles/news.css';

type NewsPageProps = {
  onNavigate: AppNavigate;
  initialTab?: MaginaTarget;
};

type Story = {
  id: number;
  category: string;
  title: string;
  excerpt: string;
  source: string;
  age: string;
  hero?: boolean;
};

type EventItem = {
  day: string;
  month: string;
  title: string;
  place: string;
  time: string;
  category: string;
  description: string;
  organizer: string;
};

const stories: Story[] = [
  {
    id: 1,
    category: 'Agricultura',
    title: 'La campaña entra en una fase clave para el olivar de Mágina',
    excerpt: 'Seguimiento de campo, humedad y estado del fruto concentran la atención en las próximas semanas.',
    source: 'Mágina Olivo',
    age: 'Hace 2 h',
    hero: true,
  },
  {
    id: 2,
    category: 'Ayudas',
    title: 'Nueva guía rápida para preparar documentación de ayudas agrarias',
    excerpt: 'Un resumen práctico para localizar plazos, documentos y requisitos sin perderse entre trámites.',
    source: 'Mágina Olivo',
    age: 'Hace 5 h',
  },
  {
    id: 3,
    category: 'Cooperativas',
    title: 'Las cooperativas preparan servicios y recepción para la próxima campaña',
    excerpt: 'Horarios, avisos y documentación podrán consultarse desde una única ficha dentro de la app.',
    source: 'Mágina Olivo',
    age: 'Ayer',
  },
];

const events: EventItem[] = [
  {
    day: '12', month: 'SEP', title: 'Jornada técnica de poda', place: 'Bedmar', time: '09:30', category: 'Formación',
    description: 'Sesión práctica orientada a criterios de poda, seguridad y planificación de labores en olivar tradicional.',
    organizer: 'Agenda Mágina · información de demostración',
  },
  {
    day: '21', month: 'SEP', title: 'Encuentro del aceite de Sierra Mágina', place: 'Huelma', time: '10:00', category: 'Sector',
    description: 'Encuentro comarcal dedicado a aceite, cooperativas, calidad y actualidad del sector oleícola.',
    organizer: 'Agenda Mágina · información de demostración',
  },
  {
    day: '03', month: 'OCT', title: 'Ruta del olivar y el paisaje', place: 'Cambil', time: '10:00', category: 'Territorio',
    description: 'Actividad divulgativa para recorrer paisaje de olivar y conocer claves naturales y culturales de Sierra Mágina.',
    organizer: 'Agenda Mágina · información de demostración',
  },
];

export function NewsPage({ onNavigate, initialTab = 'actualidad' }: NewsPageProps) {
  const [tab, setTab] = useState<MaginaTarget>(initialTab);
  const [selectedStoryId, setSelectedStoryId] = useState<number | null>(null);
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(null);
  const selectedStory = useMemo(() => stories.find((story) => story.id === selectedStoryId) ?? null, [selectedStoryId]);
  const selectedEvent = selectedEventIndex === null ? null : events[selectedEventIndex] ?? null;

  if (selectedStory) {
    return (
      <div className="app-shell">
        <main className="mobile-page">
          <header className="topbar news-detail-topbar">
            <button className="icon-button" type="button" aria-label="Volver" onClick={() => setSelectedStoryId(null)}><ChevronLeft size={20} /></button>
            <Brand compact />
            <button className="icon-button" type="button" aria-label="Guardar noticia"><Bookmark size={19} /></button>
          </header>

          <article className="story-detail">
            <div className="story-detail__image"><Newspaper size={34} /></div>
            <div className="story-detail__body">
              <span className="eyebrow">{selectedStory.category}</span>
              <h1>{selectedStory.title}</h1>
              <div className="story-meta"><span>{selectedStory.source}</span><span>·</span><span>{selectedStory.age}</span><span>·</span><span>4 min</span></div>
              <p className="story-detail__lead">{selectedStory.excerpt}</p>
              <p>Esta vista fija la estructura editorial de Mágina Olivo: lectura limpia, imagen protagonista, fuente visible y contenido relacionado sin convertir la pantalla en un portal saturado.</p>
              <p>Cuando conectemos fuentes reales, cada noticia conservará esta misma jerarquía y podrá incluir enlaces oficiales, documentos relacionados, avisos de contexto y guardado en Mi Mágina.</p>
              <div className="story-context-card"><Sparkles size={19} /><div><strong>Por qué te puede interesar</strong><span>Relacionado con tu municipio, tu cooperativa o la gestión de tu explotación.</span></div></div>
            </div>
          </article>
        </main>
        <BottomNav active="news" onNavigate={onNavigate} />
      </div>
    );
  }

  if (selectedEvent) {
    return (
      <div className="app-shell">
        <main className="mobile-page">
          <header className="topbar news-detail-topbar">
            <button className="icon-button" type="button" aria-label="Volver a agenda" onClick={() => setSelectedEventIndex(null)}><ChevronLeft size={20} /></button>
            <Brand compact />
            <button className="icon-button" type="button" aria-label="Guardar evento"><Bookmark size={19} /></button>
          </header>

          <article className="story-detail">
            <div className="story-detail__image"><CalendarDays size={36} /></div>
            <div className="story-detail__body">
              <span className="eyebrow">{selectedEvent.category}</span>
              <h1>{selectedEvent.title}</h1>
              <div className="story-meta"><span>{selectedEvent.day} {selectedEvent.month}</span><span>·</span><span>{selectedEvent.time} h</span></div>
              <p className="story-detail__lead">{selectedEvent.description}</p>
              <div className="story-context-card"><MapPin size={19} /><div><strong>{selectedEvent.place}</strong><span>La ubicación exacta y el enlace oficial aparecerán cuando conectemos la fuente real del evento.</span></div></div>
              <div className="story-context-card"><CalendarDays size={19} /><div><strong>Información del evento</strong><span>{selectedEvent.organizer}</span></div></div>
              <button className="primary-button primary-button--wide" type="button">Guardar en Mi Mágina</button>
            </div>
          </article>
        </main>
        <BottomNav active="news" onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="mobile-page">
        <header className="topbar">
          <Brand />
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Buscar"><Search size={19} /></button>
            <button className="icon-button" type="button" aria-label="Alertas" onClick={() => setTab('alertas')}><Bell size={20} /></button>
          </div>
        </header>

        <section className="magina-heading">
          <span className="eyebrow">Sierra Mágina</span>
          <h1>Mágina al día</h1>
          <p>Campo, cooperativas, mercado, servicios, comunidad y territorio en una sola pantalla.</p>
        </section>

        <nav className="hub-tabs" aria-label="Secciones de Mágina">
          <button className={tab === 'actualidad' ? 'hub-tab hub-tab--active' : 'hub-tab'} type="button" onClick={() => setTab('actualidad')}>Noticias</button>
          <button className={tab === 'cooperativas' ? 'hub-tab hub-tab--active' : 'hub-tab'} type="button" onClick={() => setTab('cooperativas')}>Cooperativas</button>
          <button className={tab === 'mercado' ? 'hub-tab hub-tab--active' : 'hub-tab'} type="button" onClick={() => setTab('mercado')}>Mercado</button>
          <button className={tab === 'local' ? 'hub-tab hub-tab--active' : 'hub-tab'} type="button" onClick={() => setTab('local')}>Mágina Local</button>
          <button className={tab === 'discover' ? 'hub-tab hub-tab--active' : 'hub-tab'} type="button" onClick={() => setTab('discover')}>Descubre</button>
          <button className={tab === 'community' ? 'hub-tab hub-tab--active' : 'hub-tab'} type="button" onClick={() => setTab('community')}>Comunidad</button>
          <button className={tab === 'agenda' ? 'hub-tab hub-tab--active' : 'hub-tab'} type="button" onClick={() => setTab('agenda')}>Agenda</button>
          <button className={tab === 'alertas' ? 'hub-tab hub-tab--active' : 'hub-tab'} type="button" onClick={() => setTab('alertas')}>Alertas</button>
        </nav>

        {tab === 'actualidad' && (
          <>
            <button className="news-hero-card" type="button" onClick={() => setSelectedStoryId(stories[0].id)}>
              <div className="news-hero-card__image"><Wheat size={38} /></div>
              <div className="news-hero-card__overlay" />
              <div className="news-hero-card__copy">
                <span>{stories[0].category}</span>
                <h2>{stories[0].title}</h2>
                <small>{stories[0].source} · {stories[0].age}</small>
              </div>
            </button>

            <section className="section-block">
              <div className="section-heading"><div><span className="eyebrow">Actualidad</span><h2>Lo último</h2></div><button className="text-action" type="button">Ver todo</button></div>
              <div className="story-list">
                {stories.slice(1).map((story) => (
                  <button key={story.id} className="story-row" type="button" onClick={() => setSelectedStoryId(story.id)}>
                    <div className="story-row__image"><Newspaper size={22} /></div>
                    <div className="story-row__copy"><span>{story.category}</span><strong>{story.title}</strong><small>{story.age}</small></div>
                    <ChevronRight size={18} />
                  </button>
                ))}
              </div>
            </section>

            <section className="section-block section-block--last">
              <button className="local-pulse-card local-pulse-card--button" type="button" onClick={() => setTab('local')}>
                <div><span className="eyebrow">Pulso local</span><h2>Bedmar</h2><p>Servicios, avisos, oportunidades y novedades de tu municipio y la comarca.</p></div>
                <MapPin size={26} />
              </button>
              <button className="discover-entry-card" type="button" onClick={() => setTab('discover')}>
                <div><span className="eyebrow">Descubre</span><strong>Rutas, pueblos y cultura del aceite</strong><small>Explora Sierra Mágina</small></div>
                <ChevronRight size={19} />
              </button>
            </section>
          </>
        )}

        {tab === 'cooperativas' && <CooperativesPanel />}

        {tab === 'mercado' && (
          <section className="section-block hub-panel hub-panel--flush">
            <div className="section-heading"><div><span className="eyebrow">Aceite</span><h2>Mercado</h2></div><span className="market-place">Jaén</span></div>
            <div className="market-grid">
              <article><span>AOVE</span><strong>5,35 €</strong><small className="market-up"><TrendingUp size={13} /> +3,4%</small></article>
              <article><span>Virgen</span><strong>4,91 €</strong><small className="market-up"><TrendingUp size={13} /> +1,8%</small></article>
              <article><span>Lampante</span><strong>4,32 €</strong><small>Estable</small></article>
            </div>
            <div className="market-chart-card">
              <div className="market-chart-card__head"><div><strong>Evolución semanal</strong><span>Referencia visual de precio</span></div><Euro size={21} /></div>
              <svg viewBox="0 0 520 210" role="img" aria-label="Evolución semanal de precio">
                <g stroke="#ded8c9" strokeWidth="1"><line x1="25" y1="35" x2="500" y2="35"/><line x1="25" y1="85" x2="500" y2="85"/><line x1="25" y1="135" x2="500" y2="135"/><line x1="25" y1="185" x2="500" y2="185"/></g>
                <path d="M25 166L90 150L155 155L220 125L285 114L350 79L415 90L500 49" fill="none" stroke="#5C7A46" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M25 166L90 150L155 155L220 125L285 114L350 79L415 90L500 49L500 190L25 190Z" fill="#A7B497" opacity=".18"/>
              </svg>
            </div>
            <div className="market-note"><AlertTriangle size={18} /><span>Los valores mostrados en esta fase son datos de demostración visual. La versión real indicará fuente y fecha de actualización.</span></div>
          </section>
        )}

        {tab === 'local' && <LocalDiscoverPanel mode="local" />}
        {tab === 'discover' && <LocalDiscoverPanel mode="discover" />}
        {tab === 'community' && <CommunityPanel />}

        {tab === 'agenda' && (
          <section className="section-block hub-panel hub-panel--flush">
            <div className="section-heading"><div><span className="eyebrow">Comarca</span><h2>Agenda</h2></div><CalendarDays size={21} /></div>
            <div className="event-list">
              {events.map((event, index) => (
                <button className="event-card" type="button" key={`${event.day}-${event.title}`} onClick={() => setSelectedEventIndex(index)}>
                  <div className="event-date"><span>{event.month}</span><strong>{event.day}</strong></div>
                  <div className="event-card__copy"><strong>{event.title}</strong><span><MapPin size={14} /> {event.place}</span><small><Clock3 size={13} /> {event.time} h</small></div>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === 'alertas' && (
          <section className="section-block hub-panel hub-panel--flush section-block--last">
            <div className="section-heading"><div><span className="eyebrow">Prioridad</span><h2>Alertas</h2></div><button className="text-action" type="button">Marcar leídas</button></div>
            <div className="hub-alert-list">
              <article className="hub-alert hub-alert--weather"><AlertTriangle size={20} /><div><strong>Riesgo meteorológico</strong><span>Revisa la previsión antes de planificar tratamientos en zonas altas.</span><small>Campo · Hoy</small></div></article>
              <article className="hub-alert hub-alert--plant"><ShieldAlert size={20} /><div><strong>Aviso fitosanitario</strong><span>Condiciones compatibles con mayor presión de repilo en parcelas húmedas.</span><small>Sanidad vegetal · Hoy</small></div></article>
              <article className="hub-alert"><Building2 size={20} /><div><strong>Novedad de cooperativa</strong><span>Hay nueva información disponible en la ficha de tu cooperativa favorita.</span><small>Cooperativa · Ayer</small></div></article>
            </div>
          </section>
        )}
      </main>

      <BottomNav active="news" onNavigate={onNavigate} />
    </div>
  );
}
