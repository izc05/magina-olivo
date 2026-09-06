import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, api } from './api';
import { safeReturnTo } from './private-access';

function Field({ name, label, type, autoComplete, value, onChange }: { name: string; label: string; type: string; autoComplete: string; value: string; onChange: (value: string) => void }) {
  return <div className="field"><label htmlFor={name}>{label}</label><input id={name} name={name} type={type} required autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

export function LoginPage({ returnTo }: { returnTo: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const destination = safeReturnTo(returnTo);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.signIn(email.trim(), password);
      window.location.assign(destination);
    } catch (reason) {
      setError('No se ha podido iniciar sesión. Revisa el correo y la contraseña.');
      console.warn('Sign in failed', reason instanceof ApiError ? reason.code : 'unknown');
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!email.trim()) {
      setError('Escribe primero tu correo para solicitar la recuperación.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.requestPasswordReset(email.trim());
    } catch {
      // Preserve the generic response to prevent account enumeration.
    } finally {
      setNotice('Si existe una cuenta con ese correo, recibirás instrucciones para recuperar el acceso.');
      setBusy(false);
    }
  }

  return (
    <main className="login-shell" id="main-content">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand"><span className="brand-title">Mágina Olivo</span><span className="brand-kicker">Sierra Mágina · Jaén</span></div>
        <p className="eyebrow">Área privada</p>
        <h1 id="login-title" className="login-title">Bienvenido de nuevo</h1>
        <p className="login-copy">Accede a tus fincas, entregas y rendimientos. Después volverás justo donde estabas.</p>
        <form className="form-grid" onSubmit={submit}>
          <Field name="email" label="Correo electrónico" type="email" autoComplete="email" value={email} onChange={setEmail} />
          <Field name="password" label="Contraseña" type="password" autoComplete="current-password" value={password} onChange={setPassword} />
          {error ? <div className="alert" role="alert">{error}</div> : null}
          {notice ? <div className="alert success" role="status">{notice}</div> : null}
          <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        </form>
        <div className="login-footer"><button className="text-button" type="button" onClick={() => void resetPassword()} disabled={busy}>He olvidado mi contraseña</button><a className="text-button" href="/register">Crear cuenta</a></div>
      </section>
    </main>
  );
}
