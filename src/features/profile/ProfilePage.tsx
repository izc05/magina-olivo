import { useState } from 'react';
import {
  Bell,
  Bookmark,
  Building2,
  ChevronRight,
  FileText,
  LockKeyhole,
  MapPin,
  Settings,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Brand } from '../../components/Brand';
import { BottomNav, MainSection } from '../../components/BottomNav';
import { TechnicalStatesPage } from '../technical/TechnicalStatesPage';
import '../../styles/profile.css';

type ProfilePageProps = {
  onNavigate: (section: MainSection) => void;
};

type ProfileTab = 'resumen' | 'guardados' | 'documentos' | 'ajustes';

const savedItems = [
  { type: 'Ruta', title: 'Mar de Olivos', subtitle: 'Bedmar · 7,8 km' },
  { type: 'Noticia', title: 'Ayudas para modernización', subtitle: 'Agricultura' },
  { type: 'Oleoturismo', title: 'Visita a almazara', subtitle: 'Sierra Mágina' },
];

const documents = [
  { title: 'Liquidación campaña 2025/26', meta: 'Cooperativa · PDF' },
  { title: 'Análisis de suelo', meta: 'Parcela 3 · PDF' },
  { title: 'Factura fertilizante', meta: 'Gastos · Imagen' },
];

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const [tab, setTab] = useState<ProfileTab>('resumen');
  const [technicalOpen, setTechnicalOpen] = useState(false);

  if (technicalOpen) {
    return <TechnicalStatesPage onBack={() => setTechnicalOpen(false)} />;
  }

  return (
    <div className="app-shell">
      <main className="mobile-page">
        <header className="topbar">
          <Brand />
          <button className="icon-button" type="button" aria-label="Ajustes" onClick={() => setTab('ajustes')}><Settings size={20} /></button>
        </header>

        <section className="profile-hero">
          <div className="profile-avatar"><span>IS</span></div>
          <div className="profile-hero__copy"><span className="eyebrow">Mi Mágina</span><h1>Isi</h1><p>Sierra Mágina · Jaén</p></div>
          <button className="profile-edit-button" type="button">Editar perfil</button>
          <div className="profile-hero__stats"><div><span>Fincas</span><strong>1</strong></div><div><span>Guardados</span><strong>14</strong></div><div><span>Documentos</span><strong>8</strong></div></div>
        </section>

        <nav className="profile-tabs" aria-label="Secciones personales">
          <button type="button" className={tab === 'resumen' ? 'profile-tab profile-tab--active' : 'profile-tab'} onClick={() => setTab('resumen')}>Resumen</button>
          <button type="button" className={tab === 'guardados' ? 'profile-tab profile-tab--active' : 'profile-tab'} onClick={() => setTab('guardados')}>Guardados</button>
          <button type="button" className={tab === 'documentos' ? 'profile-tab profile-tab--active' : 'profile-tab'} onClick={() => setTab('documentos')}>Documentos</button>
          <button type="button" className={tab === 'ajustes' ? 'profile-tab profile-tab--active' : 'profile-tab'} onClick={() => setTab('ajustes')}>Ajustes</button>
        </nav>

        {tab === 'resumen' && (
          <>
            <section className="profile-card-grid">
              <article className="profile-info-card"><MapPin size={21} /><div><span>Mi municipio</span><strong>Bedmar</strong><small>Noticias, eventos y servicios locales</small></div><ChevronRight size={18} /></article>
              <article className="profile-info-card"><Building2 size={21} /><div><span>Cooperativa favorita</span><strong>S.C.A. San Isidro</strong><small>Acceso rápido a avisos y entregas</small></div><ChevronRight size={18} /></article>
            </section>

            <section className="section-block">
              <div className="section-heading"><div><span className="eyebrow">Preferencias</span><h2>Lo que quieres ver primero</h2></div></div>
              <div className="preference-list">
                <label><div><strong>Precio del AOVE</strong><span>Mostrar en Inicio</span></div><input type="checkbox" defaultChecked /></label>
                <label><div><strong>Alertas meteorológicas</strong><span>Prioridad alta</span></div><input type="checkbox" defaultChecked /></label>
                <label><div><strong>Noticias locales</strong><span>Bedmar y comarca</span></div><input type="checkbox" defaultChecked /></label>
              </div>
            </section>

            <section className="section-block section-block--last">
              <div className="premium-card"><div><span>Plan actual</span><strong>Mágina Premium</strong><p>Gestión de fincas, cuaderno, campaña, documentos y alertas avanzadas.</p></div><ShieldCheck size={28} /></div>
            </section>
          </>
        )}

        {tab === 'guardados' && (
          <section className="section-block profile-panel">
            <div className="section-heading"><div><span className="eyebrow">Mi selección</span><h2>Guardados</h2></div><Bookmark size={20} /></div>
            <div className="saved-list">
              {savedItems.map((item) => (
                <button type="button" className="saved-row" key={`${item.type}-${item.title}`}>
                  <div className="saved-row__icon"><Bookmark size={18} /></div>
                  <div><span>{item.type}</span><strong>{item.title}</strong><small>{item.subtitle}</small></div>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === 'documentos' && (
          <section className="section-block profile-panel">
            <div className="section-heading"><div><span className="eyebrow">Archivo personal</span><h2>Documentos</h2></div><button type="button" className="text-action">+ Añadir</button></div>
            <div className="document-list">
              {documents.map((document) => (
                <button type="button" className="document-row" key={document.title}>
                  <div className="document-row__icon"><FileText size={19} /></div>
                  <div><strong>{document.title}</strong><span>{document.meta}</span></div>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === 'ajustes' && (
          <section className="section-block profile-panel section-block--last">
            <div className="section-heading"><div><span className="eyebrow">Cuenta</span><h2>Ajustes</h2></div><Settings size={20} /></div>
            <div className="settings-list">
              <button type="button"><UserRound size={19} /><div><strong>Datos personales</strong><span>Nombre, municipio y preferencias</span></div><ChevronRight size={18} /></button>
              <button type="button"><Bell size={19} /><div><strong>Notificaciones</strong><span>Clima, fitosanitarios, mercado y noticias</span></div><ChevronRight size={18} /></button>
              <button type="button"><LockKeyhole size={19} /><div><strong>Seguridad</strong><span>Contraseña y dispositivos</span></div><ChevronRight size={18} /></button>
              <button type="button"><ShieldCheck size={19} /><div><strong>Privacidad y datos</strong><span>Exportación y permisos</span></div><ChevronRight size={18} /></button>
              <button type="button" onClick={() => setTechnicalOpen(true)}><Settings size={19} /><div><strong>Estados de acceso y sistema</strong><span>Login, onboarding, offline, errores y confirmaciones V2</span></div><ChevronRight size={18} /></button>
            </div>
          </section>
        )}
      </main>

      <BottomNav active="profile" onNavigate={onNavigate} />
    </div>
  );
}
