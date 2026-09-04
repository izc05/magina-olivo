const publicSections = [
  {
    href: '/magina/tiempo',
    eyebrow: 'Tiempo',
    title: 'El tiempo en Sierra Mágina',
    copy: 'Consulta previsión, lluvia y contexto meteorológico sin crear una cuenta.',
  },
  {
    href: '/magina/campo',
    eyebrow: 'Campo',
    title: 'Avisos para el olivar',
    copy: 'Información y avisos generales con la fuente y la fecha siempre visibles.',
  },
  {
    href: '/magina/noticias',
    eyebrow: 'Actualidad',
    title: 'Noticias del olivar',
    copy: 'Accede a noticias verificadas y enlazadas a sus fuentes originales.',
  },
  {
    href: '/magina/mercado',
    eyebrow: 'Aceite',
    title: 'Mercado y precios',
    copy: 'Sigue la evolución del aceite y consulta la procedencia de los datos.',
  },
  {
    href: '/magina/directorio',
    eyebrow: 'Sierra Mágina',
    title: 'Cooperativas y almazaras',
    copy: 'Consulta el directorio público y sus canales oficiales.',
  },
];

export function PublicHomePage() {
  return (
    <main className="public-home">
      <header className="public-header">
        <a className="public-brand" href="/" aria-label="Mágina Olivo, inicio">
          <span className="public-brand-name">Mágina Olivo</span>
          <span className="public-brand-place">Sierra Mágina · Jaén</span>
        </a>
        <nav className="public-header-actions" aria-label="Cuenta">
          <a className="public-link-button" href="/mi-campo">Entrar</a>
          <a className="public-primary-button" href="/register">Crear cuenta</a>
        </nav>
      </header>

      <section className="public-hero" aria-labelledby="public-home-title">
        <p className="public-eyebrow">Información abierta · Tu campo privado</p>
        <h1 id="public-home-title">Gestiona tu olivar y consulta la información clave de Sierra Mágina.</h1>
        <p className="public-hero-copy">
          Tiempo, avisos, noticias, mercado y cooperativas están disponibles sin registro. Crea una cuenta solo cuando quieras guardar tus fincas, campañas, tareas y alertas personales.
        </p>
        <div className="public-hero-actions">
          <a className="public-primary-button public-primary-button-large" href="/magina">Explorar Mágina</a>
          <a className="public-secondary-button" href="/mi-campo">Abrir Mi Campo</a>
        </div>
        <p className="public-account-note">Mi Campo es privado y requiere una cuenta para guardar y sincronizar tus datos.</p>
      </section>

      <section className="public-section" aria-labelledby="public-sections-title">
        <div className="public-section-heading">
          <p className="public-eyebrow">Sin iniciar sesión</p>
          <h2 id="public-sections-title">Consulta primero. Regístrate cuando lo necesites.</h2>
        </div>
        <div className="public-card-grid">
          {publicSections.map((section) => (
            <a className="public-card" href={section.href} key={section.href}>
              <span className="public-card-eyebrow">{section.eyebrow}</span>
              <strong>{section.title}</strong>
              <span>{section.copy}</span>
              <span className="public-card-action">Consultar →</span>
            </a>
          ))}
        </div>
      </section>

      <section className="public-private-callout" aria-labelledby="private-area-title">
        <div>
          <p className="public-eyebrow">Zona personal</p>
          <h2 id="private-area-title">Tu olivar, campaña tras campaña</h2>
          <p>Guarda explotaciones, fincas, parcelas, entregas, rendimientos, documentos y tareas en una zona privada asociada a tu cuenta.</p>
        </div>
        <div className="public-private-actions">
          <a className="public-primary-button" href="/register">Crear mi cuenta</a>
          <a className="public-link-button" href="/mi-campo">Ya tengo cuenta</a>
        </div>
      </section>

      <footer className="public-footer">
        <div className="public-footer-copy">
          <strong>Mágina Olivo</strong>
          <span>Información pública separada de los datos privados de cada usuario.</span>
        </div>
        <nav className="public-footer-links" aria-label="Información y contacto">
          <a href="/contacto">Contacto</a>
          <a href="/aviso-legal">Aviso legal</a>
          <a href="/privacidad">Privacidad</a>
          <a href="/cookies">Cookies</a>
          <a href="/terminos">Términos</a>
          <a href="/fuentes">Fuentes</a>
        </nav>
      </footer>
    </main>
  );
}
