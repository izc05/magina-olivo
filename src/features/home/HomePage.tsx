import { useState } from 'react';
import { AlertTriangle, Bell, BookOpen, CalendarCheck2, CloudSun, Droplets, Newspaper, Sprout } from 'lucide-react';
import { Brand } from '../../components/Brand';
import { BottomNav, MainSection } from '../../components/BottomNav';
import { WeatherPage } from '../weather/WeatherPage';

type HomePageProps = {
  onNavigate: (section: MainSection) => void;
};

const quickActions = [
  { label: 'Cuaderno', icon: BookOpen, action: 'field' as const },
  { label: 'Tareas', icon: CalendarCheck2, action: 'field' as const },
  { label: 'Alertas', icon: Bell, action: 'news' as const },
  { label: 'Meteorología', icon: CloudSun, action: 'weather' as const },
];

export function HomePage({ onNavigate }: HomePageProps) {
  const [weatherOpen, setWeatherOpen] = useState(false);

  if (weatherOpen) {
    return <WeatherPage onBack={() => setWeatherOpen(false)} onNavigate={onNavigate} />;
  }

  return (
    <div className="app-shell">
      <main className="mobile-page">
        <header className="topbar">
          <Brand />
          <button className="icon-button" type="button" aria-label="Notificaciones" onClick={() => onNavigate('news')}><Bell size={20} /></button>
        </header>

        <button className="hero-photo hero-photo--home hero-photo--button" type="button" onClick={() => setWeatherOpen(true)} aria-label="Abrir meteorología detallada">
          <div className="hero-photo__overlay" />
          <div className="weather-card">
            <span>Bedmar</span>
            <strong>22°</strong>
            <small>Soleado · Máx. 26° · Mín. 14°</small>
          </div>
        </button>

        <section className="section-block">
          <div className="section-heading"><div><span className="eyebrow">Hoy en tu campo</span><h1>Tu olivar, de un vistazo</h1></div><button type="button" className="text-action" onClick={() => onNavigate('field')}>Ver todo</button></div>
          <button type="button" className="field-status-card field-status-card--button" onClick={() => onNavigate('field')}>
            <div className="field-status-card__thumb"><Sprout size={28} /></div>
            <div className="field-status-card__copy"><strong>Parcela 3 · Los Llanos</strong><span>Riego pendiente</span></div>
            <Droplets size={22} className="field-status-card__accent" />
          </button>
        </section>

        <section className="quick-grid" aria-label="Accesos rápidos">
          {quickActions.map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              className="quick-card"
              type="button"
              onClick={() => action === 'weather' ? setWeatherOpen(true) : onNavigate(action)}
            >
              <Icon size={20} /><span>{label}</span>
            </button>
          ))}
        </section>

        <section className="section-block">
          <div className="section-heading"><div><span className="eyebrow">Alertas</span><h2>Lo importante ahora</h2></div><button type="button" className="text-action" onClick={() => onNavigate('news')}>Ver todas</button></div>
          <button type="button" className="notice-card notice-card--warning notice-card--button" onClick={() => onNavigate('news')}><AlertTriangle size={20} /><div><strong>Riesgo medio de repilo</strong><span>Revisa las parcelas con mayor humedad antes del próximo tratamiento.</span></div></button>
        </section>

        <section className="section-block section-block--last">
          <div className="section-heading"><div><span className="eyebrow">Noticias destacadas</span><h2>Mágina al día</h2></div><button type="button" className="text-action" onClick={() => onNavigate('news')}>Más noticias</button></div>
          <button type="button" className="news-card news-card--button" onClick={() => onNavigate('news')}><div className="news-card__image"><Newspaper size={30} /></div><div><strong>Aceite de Mágina, entre los mejores del mundo</strong><span>Sector · Hace 2 h</span></div></button>
        </section>
      </main>
      <BottomNav active="home" onNavigate={onNavigate} onCreate={() => onNavigate('field')} />
    </div>
  );
}
