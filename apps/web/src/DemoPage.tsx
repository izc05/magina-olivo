import { useState } from 'react';

type DemoTab = 'home' | 'field' | 'campaign' | 'magina' | 'more';

const basePath = import.meta.env.BASE_URL;

export function DemoPage() {
  const [tab, setTab] = useState<DemoTab>('home');

  return (
    <div className="app-shell demo-shell">
      <header className="app-header demo-header">
        <div className="demo-brand-lockup" aria-label="Mágina Olivo">
          <img className="demo-brand-mark" src={`${basePath}brand/magina-olivo-mark.svg`} alt="" />
          <div className="brand-lockup">
            <span className="brand-title">Mágina Olivo</span>
            <span className="brand-kicker">Sierra Mágina · Jaén</span>
          </div>
        </div>
        <span className="demo-badge">DEMO</span>
      </header>

      <main className="page demo-page">
        <div className="demo-notice" role="status">
          Modo demostración · Los datos son de ejemplo y no se guardan.
        </div>

        {tab === 'home' ? <DemoHome onNavigate={setTab} /> : null}
        {tab === 'field' ? <DemoField /> : null}
        {tab === 'campaign' ? <DemoCampaign /> : null}
        {tab === 'magina' ? <DemoMagina /> : null}
        {tab === 'more' ? <DemoMore /> : null}
      </main>

      <nav className="bottom-nav bottom-nav-v2" aria-label="Navegación principal de demostración">
        <DemoNavButton active={tab === 'home'} icon="⌂" label="Inicio" onClick={() => setTab('home')} />
        <DemoNavButton active={tab === 'field'} icon="◒" label="Mi Campo" onClick={() => setTab('field')} />
        <button type="button" className={`nav-plus${tab === 'campaign' ? ' active' : ''}`} onClick={() => setTab('campaign')} aria-label="Campaña de demostración"><span aria-hidden="true">+</span></button>
        <DemoNavButton active={tab === 'magina'} icon="◇" label="Mágina" onClick={() => setTab('magina')} />
        <DemoNavButton active={tab === 'more'} icon="•••" label="Mi Mágina" onClick={() => setTab('more')} />
      </nav>
    </div>
  );
}

function DemoNavButton({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return <button type="button" className={`nav-button${active ? ' active' : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined}><span aria-hidden="true">{icon}</span>{label}</button>;
}

function DemoHome({ onNavigate }: { onNavigate: (tab: DemoTab) => void }) {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">Campaña 2026/27</p>
        <h1>Olivar La Umbría</h1>
        <p className="hero-sub">Un vistazo rápido a la campaña, sin perder de vista lo importante.</p>
        <div className="metrics">
          <DemoMetric value="18.420 kg" label="entregados" />
          <DemoMetric value="21,74 %" label="rendimiento" />
          <DemoMetric value="7" label="entregas" />
          <DemoMetric value="1" label="sin rendimiento" />
        </div>
        <div className="coverage">Cobertura de rendimiento · 86 %<div className="coverage-track"><div className="coverage-fill" style={{ width: '86%' }} /></div></div>
      </section>

      <section className="quick-actions" aria-label="Acciones rápidas de demostración">
        <button type="button" className="quick-button" onClick={() => onNavigate('campaign')}>+ Entrega</button>
        <button type="button" className="quick-button" onClick={() => onNavigate('field')}>+ Parcela</button>
        <button type="button" className="quick-button" onClick={() => onNavigate('campaign')}>Rendimientos</button>
        <button type="button" className="quick-button" onClick={() => onNavigate('magina')}>Información Mágina</button>
      </section>

      <section className="section">
        <div className="section-heading"><div><h2 className="section-title">Hoy en tu olivar</h2><p className="section-copy">Prioridades reales de campaña, sin ruido.</p></div></div>
        <article className="card list-card"><div className="list-card-main"><p className="list-card-title">Posible lluvia esta tarde</p><p className="list-card-meta">Probabilidad alta en Huelma. Revisa labores previstas antes de tratar.</p></div><span className="badge gold">Alerta</span></article>
        <article className="card list-card"><div className="list-card-main"><p className="list-card-title">Rendimiento pendiente</p><p className="list-card-meta">Entrega del 2 de septiembre · Cooperativa de ejemplo.</p></div><span className="badge">1</span></article>
      </section>
    </>
  );
}

function DemoField() {
  return (
    <>
      <DemoIntro eyebrow="Mi Campo" title="Fincas y parcelas" copy="Tu estructura agrícola es la base de todo el histórico." />
      <section className="section">
        <div className="section-heading"><div><h2 className="section-title">Fincas</h2><p className="section-copy">Huelma · Jaén</p></div></div>
        <article className="card list-card"><div className="list-card-main"><p className="list-card-title">La Umbría</p><p className="list-card-meta">3,82 ha · 462 olivos</p></div><span className="badge gold">Activa</span></article>
        <article className="card list-card"><div className="list-card-main"><p className="list-card-title">El Barranco</p><p className="list-card-meta">1,65 ha · 198 olivos</p></div><span className="badge">Ver</span></article>
      </section>
      <section className="section">
        <div className="section-heading"><div><h2 className="section-title">Parcelas de La Umbría</h2><p className="section-copy">SIGPAC, superficie, olivos y tipo de riego.</p></div></div>
        <article className="card list-card"><div className="list-card-main"><p className="list-card-title">Parcela Norte</p><p className="list-card-meta">2,14 ha · 264 olivos · secano</p></div><span className="badge">SIGPAC</span></article>
        <article className="card list-card"><div className="list-card-main"><p className="list-card-title">Parcela Sur</p><p className="list-card-meta">1,68 ha · 198 olivos · regadío</p></div><span className="badge">SIGPAC</span></article>
      </section>
    </>
  );
}

function DemoCampaign() {
  return (
    <>
      <DemoIntro eyebrow="Campaña" title="Entregas y rendimiento" copy="El núcleo productivo del olivar, con trazabilidad por entrega." />
      <section className="section card card-body">
        <div className="metrics" style={{ marginTop: 0 }}>
          <DemoMetric value="18.420 kg" label="kilos" />
          <DemoMetric value="21,74 %" label="rendimiento" />
        </div>
      </section>
      <section className="section">
        <div className="section-heading"><div><h2 className="section-title">Entregas</h2><p className="section-copy">7 registradas en esta campaña.</p></div></div>
        <DemoDelivery kilos="3.240 kg" date="02/09/2026" destination="Cooperativa de ejemplo" yieldValue="Pendiente" />
        <DemoDelivery kilos="2.870 kg" date="30/08/2026" destination="Almazara Sierra Mágina" yieldValue="22,10 %" />
        <DemoDelivery kilos="3.110 kg" date="27/08/2026" destination="Almazara Sierra Mágina" yieldValue="21,55 %" />
      </section>
    </>
  );
}

function DemoMagina() {
  return (
    <>
      <DemoIntro eyebrow="Mágina" title="Información de Sierra Mágina" copy="Lo que necesitas consultar alrededor de tu olivar, en un solo lugar." />
      <section className="demo-grid">
        <DemoFeature icon="☀" title="Tiempo" copy="Predicción local, lluvia y avisos meteorológicos." />
        <DemoFeature icon="⚠" title="Alertas del campo" copy="Avisos fitosanitarios y riesgos relevantes para el olivar." />
        <DemoFeature icon="€" title="Aceite y mercado" copy="Evolución de precios por categorías de aceite." />
        <DemoFeature icon="▤" title="Noticias" copy="Actualidad agrícola y de Sierra Mágina." />
        <DemoFeature icon="⌂" title="Cooperativas" copy="Directorio y datos públicos verificados." />
        <DemoFeature icon="◉" title="Municipios" copy="Información útil de los pueblos de la comarca." />
      </section>
    </>
  );
}

function DemoMore() {
  return (
    <>
      <DemoIntro eyebrow="Mi Mágina" title="Cuenta y proyecto" />
      <section className="section card card-body"><p className="list-card-title">Agricultor de demostración</p><p className="list-card-meta">demo@maginaolivo.es</p><p className="list-card-meta">Explotación activa · Olivar La Umbría</p></section>
      <section className="section card card-body"><h2 className="section-title">Modo demostración</h2><p className="section-copy">Esta vista sirve para recorrer la interfaz publicada en GitHub Pages. El registro, inicio de sesión y guardado real se probarán en el servidor de staging.</p></section>
      <section className="section"><a className="ghost-button demo-exit" href="/">Salir de la demo</a></section>
    </>
  );
}

function DemoMetric({ value, label }: { value: string; label: string }) {
  return <div className="metric"><span className="metric-value">{value}</span><span className="metric-label">{label}</span></div>;
}

function DemoIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) {
  return <section><p className="eyebrow page-eyebrow">{eyebrow}</p><h1 className="section-title">{title}</h1>{copy ? <p className="section-copy">{copy}</p> : null}</section>;
}

function DemoDelivery({ kilos, date, destination, yieldValue }: { kilos: string; date: string; destination: string; yieldValue: string }) {
  return <article className="card delivery-row"><div><div className="delivery-kilos">{kilos}</div><div className="delivery-date">{date} · {destination}</div></div><span className={`badge${yieldValue === 'Pendiente' ? ' gold' : ''}`}>{yieldValue}</span></article>;
}

function DemoFeature({ icon, title, copy }: { icon: string; title: string; copy: string }) {
  return <article className="card demo-feature"><span className="demo-feature-icon" aria-hidden="true">{icon}</span><div><h2>{title}</h2><p>{copy}</p></div></article>;
}
