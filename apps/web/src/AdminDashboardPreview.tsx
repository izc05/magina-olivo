import { useState } from 'react';
import { Activity, Bell, Building2, ChevronRight, CircleAlert, Crown, Gift, House, MapPin, Newspaper, Settings, ShieldCheck, Sprout, Users, type LucideIcon } from 'lucide-react';
import { VisualHeader } from './VisualChrome';

type AdminMetric = { label: string; value: string; detail: string; change?: string; icon: LucideIcon; tone?: 'gold' | 'alert' };

const metrics: AdminMetric[] = [
  { label: 'Usuarios registrados', value: '1.482', detail: 'este mes', change: '+12 %', icon: Users },
  { label: 'Parcelas registradas', value: '356', detail: 'este mes', change: '+8 %', icon: Sprout },
  { label: 'Cooperativas', value: '12', detail: 'fichas activas', change: '+1', icon: Building2 },
  { label: 'Noticias publicadas', value: '48', detail: 'este mes', change: '+6', icon: Newspaper },
  { label: 'Canjes pendientes', value: '17', detail: 'de 52 este mes', change: '+6', icon: Gift, tone: 'gold' },
  { label: 'Incidencias abiertas', value: '5', detail: 'de 12 este mes', change: '−38 %', icon: CircleAlert, tone: 'alert' },
];

const navigation = [
  { label: 'Resumen', icon: House },
  { label: 'Usuarios', icon: Users },
  { label: 'Cooperativas', icon: Building2 },
  { label: 'Contenido', icon: Newspaper },
  { label: 'Recompensas', icon: Gift },
  { label: 'Sistema', icon: Settings },
];

const activity = [
  ['Nuevo usuario registrado', 'María López · Bedmar', 'Hace 12 min', Users],
  ['Ficha de cooperativa actualizada', 'S.C.A. San Isidro · Bedmar', 'Hace 35 min', Building2],
  ['Noticia publicada', 'Ayudas PAC 2026', 'Hace 1 h', Newspaper],
  ['Canje de recompensa solicitado', '250 puntos · Juan Pérez', 'Hace 2 h', Gift],
];

const municipalities = [
  ['Bedmar', 312], ['Mancha Real', 284], ['Jódar', 198], ['Jimena', 142], ['Torres', 98], ['Otros', 448],
];

function AdminAccessGate() {
  return (
    <main className="admin-access-gate" id="main-content">
      <VisualHeader />
      <section className="admin-access-card card" aria-labelledby="admin-access-title">
        <span className="admin-icon"><ShieldCheck aria-hidden="true" /></span>
        <p className="eyebrow">Administración interna</p>
        <h1 id="admin-access-title">Acceso pendiente de configurar</h1>
        <p>Este espacio requiere un rol de plataforma independiente de los permisos de cada explotación. No se habilita por el rol <em>admin</em> de Mi Campo.</p>
        <a className="primary-button" href="/">Volver a Mágina Olivo</a>
      </section>
    </main>
  );
}

export function AdminDashboardPreview({ preview = false }: { preview?: boolean }) {
  const [activeSection, setActiveSection] = useState('Resumen');
  const [notice, setNotice] = useState('');

  if (!preview) return <AdminAccessGate />;

  return (
    <main className="admin-preview" id="main-content">
      <VisualHeader><div className="admin-preview-header-actions"><span><Crown aria-hidden="true" /> Administrador</span><button type="button" aria-label="Notificaciones de administración"><Bell aria-hidden="true" /></button><b aria-label="Administrador de demostración">AD</b></div></VisualHeader>
      <div className="admin-preview-banner" role="status">Vista local de diseño · cifras y actividad de ejemplo · sin acceso administrativo ni escrituras reales</div>

      <section className="admin-preview-hero" aria-labelledby="admin-dashboard-title">
        <div><p className="eyebrow">Panel de administración</p><h1 id="admin-dashboard-title">Gestiona hoy un olivar más fuerte</h1><p>Mágina Olivo al servicio del campo, las cooperativas y el territorio.</p></div>
        <span><MapPin aria-hidden="true" /> Sierra Mágina<small>Bedmar · Jaén</small></span>
      </section>

      <nav className="admin-preview-nav" aria-label="Secciones de administración">
        {navigation.map(({ label, icon: Icon }) => <button type="button" className={activeSection === label ? 'active' : ''} key={label} onClick={() => setActiveSection(label)} aria-pressed={activeSection === label}><Icon aria-hidden="true" /><span>{label}</span></button>)}
      </nav>

      <section className="admin-preview-heading" aria-labelledby="admin-section-title">
        <div><p className="eyebrow">Administración · vista de diseño</p><h2 id="admin-section-title">{activeSection === 'Resumen' ? 'Panel de administración' : activeSection}</h2><p>Control visual de plataforma para una futura consola interna.</p></div>
        <button className="primary-button" type="button" onClick={() => setNotice('Acción de demostración: todavía no crea ni modifica datos.')}>Acción rápida</button>
      </section>
      {notice ? <p className="admin-preview-notice" role="status">{notice}<button type="button" aria-label="Cerrar aviso" onClick={() => setNotice('')}>×</button></p> : null}

      <section className="admin-preview-metrics" aria-label="Métricas de demostración">
        {metrics.map(({ label, value, detail, change, icon: Icon, tone }) => <article className={`admin-metric-card ${tone ?? ''}`} key={label}><span className="admin-icon"><Icon aria-hidden="true" /></span><div><small>{label}</small><strong>{value}</strong><em>{change ? <b>{change}</b> : null}{detail}</em></div></article>)}
      </section>

      <section className="admin-preview-grid">
        <article className="admin-panel card" aria-labelledby="admin-activity-title">
          <header><span><Activity aria-hidden="true" /><h2 id="admin-activity-title">Actividad reciente</h2></span><button type="button" onClick={() => setActiveSection('Usuarios')}>Ver toda <ChevronRight aria-hidden="true" /></button></header>
          <ul>{activity.map(([title, detail, time, Icon]) => {
            const ActivityIcon = Icon as LucideIcon;
            return <li key={String(title)}><span className="admin-icon"><ActivityIcon aria-hidden="true" /></span><div><strong>{String(title)}</strong><small>{String(detail)}</small></div><time>{String(time)}</time></li>;
          })}</ul>
        </article>
        <article className="admin-panel card" aria-labelledby="admin-municipalities-title">
          <header><span><Building2 aria-hidden="true" /><h2 id="admin-municipalities-title">Usuarios por municipio</h2></span><button type="button" onClick={() => setActiveSection('Usuarios')}>Ver más <ChevronRight aria-hidden="true" /></button></header>
          <div className="admin-bar-list">{municipalities.map(([name, total]) => <div key={String(name)}><span>{String(name)}</span><meter min="0" max="450" value={Number(total)} aria-label={`${String(name)}: ${String(total)} usuarios`} /><strong>{String(total)}</strong></div>)}</div>
        </article>
        <article className="admin-panel card admin-panel-system" aria-labelledby="admin-system-title">
          <header><span><ShieldCheck aria-hidden="true" /><h2 id="admin-system-title">Avisos y sistema</h2></span></header>
          <ul>{['Sistema operativo', 'Copias de seguridad', 'APIs externas', 'Cola de notificaciones'].map((item) => <li key={item}><span className="admin-system-dot" aria-hidden="true" /><div><strong>{item}</strong><small>{item === 'Cola de notificaciones' ? '0 pendientes' : 'Estado de demostración'}</small></div></li>)}</ul>
        </article>
      </section>
    </main>
  );
}
