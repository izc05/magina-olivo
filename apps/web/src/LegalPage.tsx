type LegalSection = 'legal' | 'privacy' | 'cookies' | 'terms' | 'sources';

const pageCopy: Record<LegalSection, { eyebrow: string; title: string; intro: string; sections: Array<{ title: string; body: string }> }> = {
  legal: {
    eyebrow: 'Información legal',
    title: 'Aviso legal',
    intro: 'Identificación del responsable de Mágina Olivo y condiciones generales de acceso al servicio.',
    sections: [
      { title: 'Titular del servicio', body: 'Los datos identificativos definitivos del titular, domicilio o medio de contacto directo y, cuando corresponda, datos registrales o fiscales se completarán antes de la publicación pública.' },
      { title: 'Objeto', body: 'Mágina Olivo ofrece información pública relacionada con Sierra Mágina y herramientas privadas para que cada usuario gestione sus propios datos agrícolas.' },
      { title: 'Responsabilidad sobre la información', body: 'Las fuentes, fecha de actualización y alcance de la información se muestran siempre que sea posible. La aplicación no sustituye asesoramiento técnico, administrativo, agronómico o jurídico profesional.' },
    ],
  },
  privacy: {
    eyebrow: 'Privacidad',
    title: 'Política de privacidad',
    intro: 'Qué datos tratamos, para qué los usamos y qué control mantiene cada usuario sobre su información.',
    sections: [
      { title: 'Datos tratados', body: 'Cuenta, preferencias, explotaciones, fincas, parcelas, campañas, entregas, rendimientos, documentos, tareas, alertas y mensajes de contacto, únicamente cuando sean necesarios para las funciones solicitadas.' },
      { title: 'Finalidades', body: 'Prestar la zona privada Mi Campo, sincronizar información, generar alertas configuradas, responder consultas, mantener la seguridad y permitir la portabilidad o supresión de la cuenta.' },
      { title: 'Derechos', body: 'El usuario podrá solicitar acceso, rectificación, supresión, oposición, limitación y portabilidad cuando resulten aplicables. La aplicación incorporará acceso directo a exportación y baja desde Mi Cuenta.' },
      { title: 'Conservación y seguridad', body: 'Los plazos de conservación, proveedores y medidas técnicas definitivas se documentarán con la infraestructura real antes de producción. Se aplicarán minimización, aislamiento por usuario y acceso autenticado a los datos privados.' },
    ],
  },
  cookies: {
    eyebrow: 'Privacidad',
    title: 'Política de cookies',
    intro: 'La V1 se diseña para funcionar únicamente con tecnologías técnicas necesarias siempre que sea posible.',
    sections: [
      { title: 'Cookies técnicas', body: 'Podrán utilizarse mecanismos estrictamente necesarios para mantener sesión, seguridad, preferencias solicitadas y funcionamiento de la PWA.' },
      { title: 'Analítica y publicidad', body: 'No se incorporarán cookies de publicidad o seguimiento no esencial en V1 sin una decisión explícita, documentación previa y el mecanismo de consentimiento correspondiente.' },
      { title: 'Cambios futuros', body: 'Si se añaden tecnologías no esenciales, esta política y el sistema de consentimiento se actualizarán antes de activarlas.' },
    ],
  },
  terms: {
    eyebrow: 'Condiciones',
    title: 'Términos de uso',
    intro: 'Reglas básicas para utilizar Mágina Olivo de forma segura y responsable.',
    sections: [
      { title: 'Uso público', body: 'La consulta de información general no requiere cuenta. El usuario debe revisar la fuente y fecha de actualización antes de tomar decisiones basadas en datos externos.' },
      { title: 'Zona privada', body: 'La cuenta es necesaria para guardar y sincronizar datos propios. Cada usuario es responsable de mantener seguras sus credenciales y de introducir únicamente información que tenga derecho a tratar.' },
      { title: 'Disponibilidad', body: 'La aplicación puede necesitar mantenimiento, actualización o cambios de fuentes externas. Las funciones críticas deben degradar de forma visible cuando una fuente no esté disponible.' },
    ],
  },
  sources: {
    eyebrow: 'Transparencia',
    title: 'Fuentes y metodología',
    intro: 'Cómo distinguimos la información pública externa de los datos privados introducidos por cada agricultor.',
    sections: [
      { title: 'Meteorología y alertas', body: 'Cada módulo debe indicar proveedor, alcance geográfico, fecha y frescura. Un aviso general nunca se presentará como diagnóstico exacto de una parcela.' },
      { title: 'Noticias, mercado y cooperativas', body: 'Se priorizan fuentes oficiales o verificables, se enlaza al origen y no se presentan como propios contenidos de terceros.' },
      { title: 'Datos del usuario', body: 'Fincas, parcelas, campañas, documentos, tareas y preferencias permanecen separados de los módulos públicos y solo se muestran dentro del contexto autorizado de la cuenta.' },
    ],
  },
};

export function LegalPage({ section }: { section: LegalSection }) {
  const page = pageCopy[section];

  return (
    <main className="legal-shell">
      <header className="support-header">
        <a className="support-brand" href="/">Mágina Olivo</a>
        <a className="support-back" href="/">Volver al inicio</a>
      </header>

      <section className="legal-hero">
        <p className="support-eyebrow">{page.eyebrow}</p>
        <h1>{page.title}</h1>
        <p>{page.intro}</p>
        <div className="legal-draft-note" role="note">
          Borrador de prepublicación: los datos del titular, dominio, proveedores, plazos de conservación y canales definitivos se completarán antes de producción y se someterán a revisión jurídica.
        </div>
      </section>

      <section className="legal-content">
        {page.sections.map((item) => (
          <article className="legal-card" key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </article>
        ))}
      </section>

      <nav className="legal-nav" aria-label="Información legal">
        <a href="/aviso-legal">Aviso legal</a>
        <a href="/privacidad">Privacidad</a>
        <a href="/cookies">Cookies</a>
        <a href="/terminos">Términos</a>
        <a href="/fuentes">Fuentes</a>
        <a href="/contacto">Contacto</a>
      </nav>
    </main>
  );
}
