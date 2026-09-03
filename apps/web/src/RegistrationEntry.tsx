import { useEffect, useState } from 'react';

type SessionState = 'checking' | 'signed_out' | 'signed_in' | 'unavailable';

export function RegistrationEntry() {
  const [state, setState] = useState<SessionState>('checking');

  useEffect(() => {
    const controller = new AbortController();

    void fetch('/api/v1/me', {
      credentials: 'include',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    }).then((response) => {
      if (response.ok) {
        setState('signed_in');
        return;
      }
      if (response.status === 401 || response.status === 403) {
        setState('signed_out');
        return;
      }
      setState('unavailable');
    }).catch(() => {
      setState('unavailable');
    });

    return () => controller.abort();
  }, []);

  if (state === 'signed_in') {
    return (
      <aside className="registration-entry" aria-label="Accesos personales">
        <a className="text-button" href="/calendario">Calendario</a>
        <a className="account-entry" href="/cuenta" aria-label="Abrir Mi Cuenta">Mi cuenta</a>
      </aside>
    );
  }

  if (state === 'checking') return null;

  return (
    <aside className="registration-entry" aria-label="Crear una cuenta nueva">
      <span>¿Aún no tienes cuenta?</span>
      <a className="text-button" href="/register">Crear cuenta</a>
    </aside>
  );
}
