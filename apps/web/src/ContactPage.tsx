import { useState, type FormEvent } from 'react';

const categories = [
  'Problema técnico',
  'Sugerencia',
  'Información incorrecta',
  'Cooperativas',
  'Noticias',
  'Mercado del aceite',
  'Privacidad y datos',
  'Otro',
];

export function ContactPage() {
  const contactEmail = import.meta.env.VITE_CONTACT_EMAIL?.trim() ?? '';
  const [category, setCategory] = useState(categories[0]);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!contactEmail) {
      setStatus('El canal de contacto está preparado, pero falta configurar el correo público antes de publicar esta versión.');
      return;
    }

    const subject = `[Mágina Olivo] ${category}`;
    const body = `Correo de respuesta: ${email.trim()}\n\n${message.trim()}`;
    window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <main className="support-shell">
      <header className="support-header">
        <a className="support-brand" href="/">Mágina Olivo</a>
        <a className="support-back" href="/">Volver al inicio</a>
      </header>

      <section className="support-hero">
        <p className="support-eyebrow">Contacto y ayuda</p>
        <h1>Cuéntanos qué necesitas.</h1>
        <p>Problemas, sugerencias, correcciones o dudas sobre tus datos. Queremos que exista siempre una vía clara para comunicarse con Mágina Olivo.</p>
      </section>

      <section className="support-grid">
        <form className="support-card support-form" onSubmit={submit}>
          <label>
            <span>Motivo</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label>
            <span>Tu correo</span>
            <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@correo.es" />
          </label>

          <label>
            <span>Mensaje</span>
            <textarea required minLength={10} rows={7} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Explícanos brevemente qué ha ocurrido o qué quieres proponernos." />
          </label>

          <p className="support-privacy-note">
            Usaremos estos datos únicamente para gestionar tu consulta. Consulta cómo tratamos tus datos en la <a href="/privacidad">Política de privacidad</a>.
          </p>

          {status ? <div className="support-status" role="status">{status}</div> : null}
          <button className="support-submit" type="submit">Preparar mensaje</button>
        </form>

        <aside className="support-card support-aside">
          <p className="support-eyebrow">Antes de escribir</p>
          <h2>También puedes revisar</h2>
          <a href="/fuentes">Fuentes y metodología <span>→</span></a>
          <a href="/privacidad">Privacidad y datos <span>→</span></a>
          <a href="/terminos">Términos de uso <span>→</span></a>
          <p className="support-aside-copy">No incluyas contraseñas, documentos de identidad ni información sensible que no sea necesaria para resolver la consulta.</p>
        </aside>
      </section>
    </main>
  );
}
