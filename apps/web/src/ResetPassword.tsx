import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

export function ResetPassword() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token'), []);
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : 'El enlace de recuperación no es válido o está incompleto.');
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    if (password.length < 10) {
      setError('La contraseña debe tener al menos 10 caracteres.');
      return;
    }
    if (password !== repeatPassword) {
      setError('Las dos contraseñas no coinciden.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        credentials: 'include',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ newPassword: password, token }),
      });

      if (!response.ok) {
        setError('El enlace ha caducado o ya se ha utilizado. Solicita uno nuevo.');
        return;
      }
      setDone(true);
    } catch {
      setError('No se ha podido completar el cambio. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  function backToLogin() {
    window.history.replaceState({}, '', '/');
    window.location.reload();
  }

  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="reset-title">
        <div className="login-brand">
          <span className="brand-title">Mágina Olivo</span>
          <span className="brand-kicker">Recuperación de acceso</span>
        </div>
        <h1 id="reset-title" className="login-title">Nueva contraseña</h1>
        {done ? (
          <>
            <div className="alert success" role="status">Contraseña actualizada. Las sesiones anteriores han quedado revocadas.</div>
            <button className="primary-button reset-login-button" type="button" onClick={backToLogin}>Volver a entrar</button>
          </>
        ) : (
          <form className="form-grid" onSubmit={submit}>
            <div className="field"><label htmlFor="new-password">Nueva contraseña</label><input id="new-password" type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
            <div className="field"><label htmlFor="repeat-password">Repite la contraseña</label><input id="repeat-password" type="password" autoComplete="new-password" minLength={10} required value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} /></div>
            {error ? <div className="alert" role="alert">{error}</div> : null}
            <button className="primary-button" type="submit" disabled={busy || !token}>{busy ? 'Actualizando…' : 'Guardar contraseña'}</button>
          </form>
        )}
      </section>
    </main>
  );
}
