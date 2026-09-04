import { useState } from 'react';
import type { FormEvent } from 'react';

type Category = 'support' | 'commercial' | 'privacy' | 'data_rights' | 'other';

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<Category>('support');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const response = await fetch('/api/v1/public/contact', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ name, email, category, subject, message }),
      });
      if (!response.ok) throw new Error(`No se ha podido enviar el mensaje (${response.status}).`);
      const body = await response.json() as { id: string };
      setResult(`Mensaje recibido. Referencia: ${body.id.slice(0, 8).toUpperCase()}`);
      setSubject('');
      setMessage('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido enviar el mensaje.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="contact-page">
      <header className="public-form-header">
        <a href="/" className="public-back-link">← Mágina Olivo</a>
        <p className="public-eyebrow">Contacto</p>
        <h1>¿En qué podemos ayudarte?</h1>
        <p>Utiliza este formulario para soporte, consultas comerciales, privacidad o ejercicio de derechos sobre tus datos.</p>
      </header>

      <form className="public-form-card" onSubmit={submit}>
        {result ? <div className="public-form-success" role="status">{result}</div> : null}
        {error ? <div className="public-form-error" role="alert">{error}</div> : null}
        <div className="public-form-row">
          <label>Nombre<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>
          <label>Correo electrónico<input required type="email" maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
        </div>
        <label>Motivo
          <select value={category} onChange={(event) => setCategory(event.target.value as Category)}>
            <option value="support">Ayuda con la aplicación</option>
            <option value="commercial">Publicidad o colaboración</option>
            <option value="privacy">Privacidad</option>
            <option value="data_rights">Derechos sobre mis datos</option>
            <option value="other">Otro</option>
          </select>
        </label>
        <label>Asunto<input required minLength={3} maxLength={180} value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
        <label>Mensaje<textarea required minLength={10} maxLength={5000} rows={7} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
        <p className="public-form-warning"><strong>No envíes contraseñas, códigos de acceso ni tokens.</strong> En esta primera versión el formulario tampoco admite adjuntos.</p>
        <button className="public-submit-button" disabled={busy} type="submit">{busy ? 'Enviando…' : 'Enviar mensaje'}</button>
      </form>
    </main>
  );
}
