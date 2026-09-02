import { Bell, Newspaper, UserRound } from 'lucide-react';
import { Brand } from '../../components/Brand';
import { BottomNav, MainSection } from '../../components/BottomNav';

type PlaceholderPageProps = {
  section: Exclude<MainSection, 'home' | 'field'>;
  onNavigate: (section: MainSection) => void;
};

const copy = {
  news: {
    eyebrow: 'Mágina / Actualidad',
    title: 'Noticias y servicios de la comarca',
    text: 'Esta sección ya está conectada a la navegación. La siguiente pasada incorporará noticias, cooperativas, mercado, alertas y eventos con el diseño V2.',
    icon: Newspaper,
  },
  profile: {
    eyebrow: 'Mi Mágina',
    title: 'Tu espacio personal',
    text: 'Aquí reuniremos favoritos, documentos, alertas, preferencias, seguridad y plan manteniendo la misma identidad visual.',
    icon: UserRound,
  },
};

export function PlaceholderPage({ section, onNavigate }: PlaceholderPageProps) {
  const data = copy[section];
  const Icon = data.icon;

  return (
    <div className="app-shell">
      <main className="mobile-page">
        <header className="topbar">
          <Brand />
          <button className="icon-button" type="button" aria-label="Notificaciones"><Bell size={20} /></button>
        </header>

        <section className="placeholder-page">
          <div className="placeholder-page__icon"><Icon size={34} /></div>
          <span className="eyebrow">{data.eyebrow}</span>
          <h1>{data.title}</h1>
          <p>{data.text}</p>
          <button className="primary-button" type="button" onClick={() => onNavigate('home')}>Volver a Inicio</button>
        </section>
      </main>
      <BottomNav active={section} onNavigate={onNavigate} onCreate={() => onNavigate('field')} />
    </div>
  );
}
