const publicServices = [
  {
    href: '/magina/tiempo',
    eyebrow: 'AEMET',
    title: 'Tiempo',
    copy: 'Predicción oficial por municipio con lluvia, temperatura y viento.',
    action: 'Ver predicción',
  },
  {
    href: '/magina/campo',
    eyebrow: 'RAIF',
    title: 'Campo y alertas',
    copy: 'Estado de la fuente fitosanitaria del olivar y accesos oficiales de Jaén.',
    action: 'Ver estado del campo',
  },
  {
    href: '/magina/noticias',
    eyebrow: 'Junta de Andalucía',
    title: 'Noticias',
    copy: 'Actualidad agraria verificada con título, fecha, tema y enlace a la fuente oficial.',
    action: 'Ver actualidad',
  },
  {
    href: '/magina/mercado',
    eyebrow: 'Observatorio',
    title: 'Aceite y mercado',
    copy: 'Contexto de mercado con procedencia y control de frescura de la información.',
    action: 'Ver mercado',
  },
  {
    href: '/magina/directorio',
    eyebrow: 'Directorio',
    title: 'Cooperativas y almazaras',
    copy: 'Entidades de Sierra Mágina organizadas por municipio y tipo jurídico.',
    action: 'Abrir directorio',
  },
] as const;

export function MaginaPrivateHub() {
  return (
    <>
      <section className="magina-private-intro">
        <p className="eyebrow page-eyebrow">Mágina</p>
        <h1 className="section-title">Tu territorio</h1>
        <p className="section-copy">Información pública útil para el olivar, separada de tus fincas, campañas y documentos privados.</p>
      </section>

      <section className="section magina-private-grid" aria-label="Información pública de Sierra Mágina">
        {publicServices.map((service) => (
          <a className="card magina-private-card" href={service.href} key={service.href}>
            <span className="badge gold">{service.eyebrow}</span>
            <h2>{service.title}</h2>
            <p>{service.copy}</p>
            <strong>{service.action} →</strong>
          </a>
        ))}
      </section>

      <section className="section card card-body magina-private-note">
        <span className="badge">Datos públicos</span>
        <h2 className="section-title">Fuentes visibles y separadas</h2>
        <p className="section-copy">Tiempo, RAIF, noticias, mercado y directorio se consultan desde fuentes públicas. Tus datos de explotación continúan dentro del área privada y no se publican al abrir estas pantallas.</p>
        <a className="text-button magina-private-all" href="/magina">Ver todas las fuentes y su estado →</a>
      </section>
    </>
  );
}
