const services = [
  ['Tiempo', 'Predicción AEMET por municipio y ventana de trabajo.', '/magina/tiempo'],
  ['Campo', 'Alertas generales y contexto fitosanitario con fuente visible.', '/magina/campo'],
  ['Noticias', 'Actualidad verificada del olivar y Sierra Mágina.', '/magina/noticias'],
  ['Mercado', 'Contexto de aceite y fecha de comprobación.', '/magina/mercado'],
];

export function PublicHomePage() {
  return (
    <main className="public-home" id="main-content">
      <section className="public-home-hero" aria-labelledby="public-home-title">
        <img src="/brand/magina-olivo-mark.svg" alt="" />
        <p className="eyebrow">Sierra Mágina · Jaén</p>
        <h1 id="public-home-title">El olivar, más cerca de ti</h1>
        <p>Información útil para tu comarca y una forma clara de gestionar tus fincas cuando decidas crear tu cuenta.</p>
        <div className="public-home-actions"><a className="primary-button" href="/magina">Explorar Mágina</a><a className="secondary-button" href="/login?next=%2Fmi-campo">Gestionar mi olivar</a></div>
      </section>
      <section className="public-service-section" aria-labelledby="public-services-title">
        <div><p className="eyebrow">Información pública</p><h2 id="public-services-title">Hoy en Sierra Mágina</h2></div>
        <div className="public-service-grid">{services.map(([title, copy, href]) => <a className="card public-service-card" href={href} key={title}><h3>{title}</h3><p>{copy}</p><span>Ver información</span></a>)}</div>
      </section>
      <section className="public-access-card card"><p className="eyebrow">Tu cuaderno de campo</p><h2>Cuando quieras, lleva tu olivar contigo.</h2><p>Fincas, parcelas, campañas, entregas y rendimientos permanecen siempre en tu área privada.</p><a className="text-button" href="/mi-campo">Conocer Mi Campo</a></section>
    </main>
  );
}
