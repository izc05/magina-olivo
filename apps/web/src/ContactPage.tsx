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

type ContactResponse = { accepted: boolean };

async function sendContact(payload: { category: string; email: string; message: string; website: string }): Promise<ContactResponse> {
  const response = await fetch('/api/v1/public/contact', {
    method: 'POST',
    credentials: 'include',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = 'No se ha podido enviar la consulta.';
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      message = body.error?.message ?? message;
    } catch {
      // Keep a generic message for non-JSON failures.
    }
    throw new Error(message);
  }

  return response.json() as Promise<ContactResponse>;
}

export function ContactPage() {
  const [category, setCategory] = useState(categories[0]);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setError(null);
    setBusy(true);

    try {
      const result = await sendContact({
        category,
        email: email.trim(),
        message: message.trim(),
        website,
      });

      if (!result.accepted) throw new Error('No se ha podido registrar la consulta.');

      setStatus('Hemos recibido tu consulta. La revisaremos utilizando únicamente los datos necesarios para poder responderte.');
      setMessage('');
      setWebsite('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido enviar la consulta.');
    } finally {
      setBusy(false);
    }
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
        <form className="support-card support-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>Motivo</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} disabled={busy}>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label>
            <span>Tu correo</span>
            <input type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@correo.es" disabled={busy} />
          </label>

          <label>
            <span>Mensaje</span>
            <textarea required minLength={10} maxLength={4000} rows={7} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Explícanos brevemente qué ha ocurrido o qué quieres proponernos." disabled={busy} />
          </label>

          <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
            <label htmlFor="contact-website">Sitio web</label>
            <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
          </div>

          <p className="support-privacy-note">
            Usaremos estos datos únicamente para gestionar tu consulta. Consulta cómo tratamos tus datos en la <a href="/privacidad">Política de privacidad</a>.
          </p>

          {status ? <div className="support-status" role="status">{status}</div> : null}
          {error ? <div className="support-status" role="alert">{error}</div> : null}
          <button className="support-submit" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar consulta'}</button>
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
