import { useEffect, useState } from 'react';
import { startGoogleSignIn } from './google-auth.ts';

type AuthProviders = {
  emailPassword: boolean;
  google: boolean;
};

export function RegistrationEntry() {
  const [visible, setVisible] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void Promise.all([
      fetch('/api/v1/me', {
        credentials: 'include',
        headers: { accept: 'application/json' },
        signal: controller.signal,
      }),
      fetch('/api/v1/auth/providers', {
        credentials: 'include',
        headers: { accept: 'application/json' },
        signal: controller.signal,
      }),
    ]).then(async ([sessionResponse, providersResponse]) => {
      if (sessionResponse.status === 401 || sessionResponse.status === 403) setVisible(true);
      if (providersResponse.ok) {
        const providers = (await providersResponse.json()) as AuthProviders;
        setGoogleEnabled(providers.google === true);
      }
    }).catch(() => {
      // Do not advertise registration while the API is unavailable.
    });

    return () => controller.abort();
  }, []);

  async function useGoogle() {
    setBusy(true);
    setError(null);
    try {
      await startGoogleSignIn({ callbackURL: '/', newUserCallbackURL: '/onboarding' });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido iniciar el acceso con Google.');
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <aside className="registration-entry" aria-label="Opciones de acceso y registro">
      {googleEnabled ? (
        <>
          <button className="google-auth-button compact" type="button" onClick={() => void useGoogle()} disabled={busy}>
            <span className="google-auth-mark" aria-hidden="true">G</span>
            {busy ? 'Abriendo Google…' : 'Continuar con Google'}
          </button>
          <span className="registration-entry-separator" aria-hidden="true">·</span>
        </>
      ) : null}
      <span>¿Primera vez?</span>
      <a className="text-button" href="/register">Crear cuenta con correo</a>
      {error ? <span className="registration-entry-error" role="alert">{error}</span> : null}
    </aside>
  );
}
