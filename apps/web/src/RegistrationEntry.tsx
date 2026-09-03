import { useEffect, useState } from 'react';

export function RegistrationEntry() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    void fetch('/api/v1/me', {
      credentials: 'include',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    }).then((response) => {
      if (response.status === 401 || response.status === 403) setVisible(true);
    }).catch(() => {
      // Do not advertise registration while the API is unavailable.
    });

    return () => controller.abort();
  }, []);

  if (!visible) return null;

  return (
    <aside className="registration-entry" aria-label="Crear una cuenta nueva">
      <span>¿Primera vez en Mágina Olivo?</span>
      <a className="text-button" href="/register">Crear cuenta</a>
    </aside>
  );
}
