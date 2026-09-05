import { useState } from 'react';
import type { FormEvent } from 'react';

type AuthErrorBody = {
  message?: string;
  error?: { message?: string };
};

async function createAccount(name: string, email: string, password: string): Promise<void> {
  const response = await fetch('/api/auth/sign-up/email', {
    method: 'POST',
    credentials: 'include',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });

  if (!response.ok) {
    let detail = 'No se ha podido crear la cuenta.';
    try {
      const body = (await response.json()) as AuthErrorBody;
      detail = body.error?.message ?? body.message ?? detail;
    } catch {
      // Keep a useful generic message when the backend response is not JSON.
    }
    throw new Error(detail);
  }
}

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      setError('Escribe un nombre de al menos 2 caracteres.');
      return;
    }
    if (password.length < 10) {
      setError('La contraseña debe tener al menos 10 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setBusy(true);
    try {
      await createAccount(cleanName, cleanEmail, password);
      window.location.assign('/onboarding');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido crear la cuenta.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card auth-flow-card" aria-labelledby="register-title">
        <div className="login-brand">
          <span className="brand-title">Mágina Olivo</span>
          <span className="brand-kicker">Tu olivar, campaña tras campaña</span>
        </div>
        <p className="eyebrow page-eyebrow">Primer acceso</p>
        <h1 id="register-title" className="login-title">Crear cuenta</h1>
        <p className="login-copy">Empieza con lo mínimo. Después podrás completar fincas, parcelas y preferencias con calma.</p>

        <form className="form-grid" onSubmit={submit} aria-busy={busy}>
          <div className="field">
            <label htmlFor="register-name">Nombre</label>
            <input id="register-name" name="name" autoComplete="name" required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="register-email">Correo electrónico</label>
            <input id="register-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="register-password">Contraseña</label>
            <input id="register-password" name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} aria-describedby="register-password-help" value={password} onChange={(event) => setPassword(event.target.value)} />
            <small id="register-password-help">Mínimo 10 caracteres.</small>
          </div>
          <div className="field">
            <label htmlFor="register-password-confirm">Repite la contraseña</label>
            <input id="register-password-confirm" name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </div>

          {error ? <div className="alert" role="alert">{error}</div> : null}
          <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Creando cuenta…' : 'Crear cuenta y continuar'}</button>
        </form>

        <div className="login-footer auth-flow-footer">
          <a className="text-button" href="/">Ya tengo cuenta</a>
        </div>
      </section>
    </main>
  );
}
