import { AlertTriangle, Bell, BookOpen, CalendarCheck2, CloudSun, Droplets, Newspaper, Sprout } from 'lucide-react';
import { Brand } from '../../components/Brand';
import { BottomNav } from '../../components/BottomNav';

const quickActions = [
  { label: 'Cuaderno', icon: BookOpen },
  { label: 'Tareas', icon: CalendarCheck2 },
  { label: 'Alertas', icon: Bell },
  { label: 'Meteorología', icon: CloudSun },
];

export function HomePage() {
  return (
    <div className="app-shell">
      <main className="mobile-page">
        <header className="topbar">
          <Brand />
          <button className="icon-button" type="button" aria-label="Notificaciones"><Bell size={20} /></button>
        </header>

        <section className="hero-photo hero-photo--home">
          <div className="hero-photo__overlay" />
          <div className="weather-card">
            <span>Bedmar</span>
            <strong>22°</strong>
            <small>Soleado · Máx. 26° · Mín. 14°</small>
          </div>
        </section>

        <section className="section-block">
          <div className="section-heading"><div><span className="eyebrow">Hoy en tu campo</span><h1>Tu olivar, de un vistazo</h1></div><button type="button" className="text-action">Ver todo</button></div>
          <article className="field-status-card">
            <div className="field-status-card__thumb"><Sprout size={28} /></div>
            <div className="field-status-card__copy"><strong>Parcela 3 · Los Llanos</strong><span>Riego pendiente</span></div>
            <Droplets size={22} className="field-status-card__accent" />
          </article>
        </section>

        <section className="quick-grid" aria-label="Accesos rápidos">
          {quickActions.map(({ label, icon: Icon }) => (
            <button key={label} className="quick-card" type="button"><Icon size={20} /><span>{label}</span></button>
          ))}
        </section>

        <section className="section-block">
          <div className="section-heading"><div><span className="eyebrow">Alertas</span><h2>Lo importante ahora</h2></div><button type="button" className="text-action">Ver todas</button></div>
          <article className="notice-card notice-card--warning"><AlertTriangle size={20} /><div><strong>Riesgo medio de repilo</strong><span>Revisa las parcelas con mayor humedad antes del próximo tratamiento.</span></div></article>
        </section>

        <section className="section-block section-block--last">
          <div className="section-heading"><div><span className="eyebrow">Noticias destacadas</span><h2>Mágina al día</h2></div><button type="button" className="text-action">Más noticias</button></div>
          <article className="news-card"><div className="news-card__image"><Newspaper size={30} /></div><div><strong>Aceite de Mágina, entre los mejores del mundo</strong><span>Sector · Hace 2 h</span></div></article>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
