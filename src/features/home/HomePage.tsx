import { useEffect, useState } from 'react';
import { AlertTriangle, Bell, BookOpen, CalendarCheck2, CloudSun, Droplets, Newspaper, Sprout, TrendingUp } from 'lucide-react';
import { Brand } from '../../components/Brand';
import { BottomNav } from '../../components/BottomNav';
import type { AppNavigate, NavigationTarget } from '../../app/navigation';
import type { AppDataRepositories } from '../../data/contracts';
import { demoRepositories } from '../../data/demo/repositories';
import { loadHomeDashboard, type HomeDashboardData } from '../../data/homeDashboard';
import { WeatherPage } from '../weather/WeatherPage';
import '../../styles/home.css';

type HomePageProps = {
  onNavigate: AppNavigate;
  repositories?: AppDataRepositories;
};

type QuickAction = {
  label: string;
  icon: typeof BookOpen;
  action: 'field' | 'news' | 'weather';
  target?: NavigationTarget;
};

const quickActions: QuickAction[] = [
  { label: 'Cuaderno', icon: BookOpen, action: 'field', target: 'journal' },
  { label: 'Tareas', icon: CalendarCheck2, action: 'field', target: 'overview' },
  { label: 'Alertas', icon: Bell, action: 'news', target: 'alertas' },
  { label: 'Meteorología', icon: CloudSun, action: 'weather' },
];

function formatTemperature(value: number | undefined) {
  return value === undefined ? null : `${Math.round(value)}°`;
}

function formatWeatherSummary(dashboard: HomeDashboardData) {
  const weather = dashboard.weather;
  if (!weather) return 'Sin datos meteorológicos';

  const parts = [
    weather.conditionLabel,
    weather.maxTemperatureC === undefined ? null : `Máx. ${formatTemperature(weather.maxTemperatureC)}`,
    weather.minTemperatureC === undefined ? null : `Mín. ${formatTemperature(weather.minTemperatureC)}`,
  ].filter((part): part is string => Boolean(part));

  return parts.join(' · ');
}

function formatMarketPrice(value: number | undefined) {
  if (value === undefined) return '—';
  return `${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/kg`;
}

function formatMarketChange(value: number | undefined) {
  if (value === undefined) return 'Sin variación disponible';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% esta semana`;
}

function formatRelativeTime(publishedAt: string) {
  const elapsedMs = Math.max(0, Date.now() - new Date(publishedAt).getTime());
  const elapsedHours = Math.floor(elapsedMs / (60 * 60 * 1000));

  if (elapsedHours < 1) return 'Ahora';
  if (elapsedHours === 1) return 'Hace 1 h';
  if (elapsedHours < 24) return `Hace ${elapsedHours} h`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return elapsedDays === 1 ? 'Hace 1 día' : `Hace ${elapsedDays} días`;
}

function getFieldStatusLabel(dashboard: HomeDashboardData) {
  const entry = dashboard.fieldStatus?.entry;
  if (!entry) return 'Todo al día';
  if (entry.status === 'planned') return `${entry.title} pendiente`;
  return entry.title;
}

export function HomePage({ onNavigate, repositories = demoRepositories }: HomePageProps) {
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [dashboard, setDashboard] = useState<HomeDashboardData | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setDashboard(null);
    setLoadFailed(false);

    loadHomeDashboard(repositories)
      .then((data) => {
        if (active) setDashboard(data);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });

    return () => {
      active = false;
    };
  }, [repositories]);

  if (weatherOpen) {
    return <WeatherPage onBack={() => setWeatherOpen(false)} onNavigate={onNavigate} />;
  }

  if (!dashboard) {
    return (
      <div className="app-shell">
        <main className="mobile-page" aria-busy={!loadFailed}>
          <header className="topbar">
            <Brand />
            <button className="icon-button" type="button" aria-label="Notificaciones" onClick={() => onNavigate('news', 'alertas')}><Bell size={20} /></button>
          </header>
          <section className="section-block">
            <div className={loadFailed ? 'notice-card notice-card--warning' : 'notice-card'}>
              {loadFailed ? <AlertTriangle size={20} /> : <CloudSun size={20} />}
              <div>
                <strong>{loadFailed ? 'No se pudo cargar Inicio' : 'Preparando tu información'}</strong>
                <span>{loadFailed ? 'Revisa la conexión o la fuente de datos.' : 'Cargando el resumen de tu olivar.'}</span>
              </div>
            </div>
          </section>
        </main>
        <BottomNav active="home" onNavigate={onNavigate} onCreate={() => onNavigate('field', 'journal')} />
      </div>
    );
  }

  const weather = dashboard.weather;
  const fieldStatus = dashboard.fieldStatus;
  const market = dashboard.market;
  const alert = dashboard.alert;
  const article = dashboard.news;
  const marketSource = market?.source.origin === 'demo'
    ? 'dato de demostración'
    : market?.source.provider ?? 'dato actualizado';

  return (
    <div className="app-shell">
      <main className="mobile-page">
        <header className="topbar">
          <Brand />
          <button className="icon-button" type="button" aria-label="Notificaciones" onClick={() => onNavigate('news', 'alertas')}><Bell size={20} /></button>
        </header>

        <button className="hero-photo hero-photo--home hero-photo--button" type="button" onClick={() => setWeatherOpen(true)} aria-label="Abrir meteorología detallada">
          <div className="hero-photo__overlay" />
          <div className="weather-card">
            <span>{weather?.locationLabel ?? dashboard.profile?.municipality ?? 'Sin ubicación'}</span>
            <strong>{formatTemperature(weather?.temperatureC) ?? '—'}</strong>
            <small>{formatWeatherSummary(dashboard)}</small>
          </div>
        </button>

        <section className="section-block">
          <div className="section-heading"><div><span className="eyebrow">Hoy en tu campo</span><h1>Tu olivar, de un vistazo</h1></div><button type="button" className="text-action" onClick={() => onNavigate('field', 'overview')}>Ver todo</button></div>
          <button type="button" className="field-status-card field-status-card--button" onClick={() => onNavigate('field', 'overview')}>
            <div className="field-status-card__thumb"><Sprout size={28} /></div>
            <div className="field-status-card__copy">
              <strong>{fieldStatus ? `${fieldStatus.parcel?.name ?? 'Finca'} · ${fieldStatus.farm.name}` : 'Sin tareas pendientes'}</strong>
              <span>{getFieldStatusLabel(dashboard)}</span>
            </div>
            <Droplets size={22} className="field-status-card__accent" />
          </button>
        </section>

        <section className="quick-grid" aria-label="Accesos rápidos">
          {quickActions.map(({ label, icon: Icon, action, target }) => (
            <button
              key={label}
              className="quick-card"
              type="button"
              onClick={() => action === 'weather' ? setWeatherOpen(true) : onNavigate(action, target)}
            >
              <Icon size={20} /><span>{label}</span>
            </button>
          ))}
        </section>

        <section className="section-block">
          <div className="section-heading"><div><span className="eyebrow">Aceite y mercado</span><h2>Referencia AOVE</h2></div><button type="button" className="text-action" onClick={() => onNavigate('news', 'mercado')}>Mercado</button></div>
          <button className="home-market-card" type="button" onClick={() => onNavigate('news', 'mercado')}>
            <div className="home-market-card__copy">
              <span>{market?.marketLabel ?? 'Jaén'} · {marketSource}</span>
              <strong>{formatMarketPrice(market?.priceEurKg)}</strong>
              <small><TrendingUp size={13} /> {formatMarketChange(market?.weeklyChangePct)}</small>
            </div>
            <svg viewBox="0 0 170 62" role="img" aria-label="Tendencia semanal de precio AOVE"><path d="M5 50L30 44L53 46L79 34L103 37L128 22L164 14" fill="none" stroke="#5C7A46" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 50L30 44L53 46L79 34L103 37L128 22L164 14L164 57L5 57Z" fill="#A7B497" opacity=".18"/></svg>
          </button>
        </section>

        <section className="section-block">
          <div className="section-heading"><div><span className="eyebrow">Alertas</span><h2>Lo importante ahora</h2></div><button type="button" className="text-action" onClick={() => onNavigate('news', 'alertas')}>Ver todas</button></div>
          <button type="button" className="notice-card notice-card--warning notice-card--button" onClick={() => onNavigate('news', 'alertas')}><AlertTriangle size={20} /><div><strong>{alert?.title ?? 'Sin alertas activas'}</strong><span>{alert?.detail ?? 'No hay avisos prioritarios para tu campo.'}</span></div></button>
        </section>

        <section className="section-block section-block--last">
          <div className="section-heading"><div><span className="eyebrow">Noticias destacadas</span><h2>Mágina al día</h2></div><button type="button" className="text-action" onClick={() => onNavigate('news', 'actualidad')}>Más noticias</button></div>
          <button type="button" className="news-card news-card--button" onClick={() => onNavigate('news', 'actualidad')}><div className="news-card__image"><Newspaper size={30} /></div><div><strong>{article?.title ?? 'Sin noticias destacadas'}</strong><span>{article ? `${article.category} · ${formatRelativeTime(article.publishedAt)}` : 'Actualidad'}</span></div></button>
        </section>
      </main>
      <BottomNav active="home" onNavigate={onNavigate} onCreate={() => onNavigate('field', 'journal')} />
    </div>
  );
}
