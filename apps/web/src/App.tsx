import { useCallback, useEffect, useState } from 'react';

type ApiStatus = 'checking' | 'ready' | 'not_ready';

export function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');

  const checkApi = useCallback(async () => {
    setApiStatus('checking');

    try {
      const response = await fetch('/health/ready', {
        credentials: 'include',
        headers: { accept: 'application/json' },
      });
      setApiStatus(response.ok ? 'ready' : 'not_ready');
    } catch {
      setApiStatus('not_ready');
    }
  }, []);

  useEffect(() => {
    void checkApi();
  }, [checkApi]);

  return (
    <main>
      <h1>Mágina Olivo</h1>
      <p>Technical spike — la identidad visual se integra por separado.</p>
      <dl>
        <dt>PWA shell</dt>
        <dd>activa</dd>
        <dt>API + PostgreSQL</dt>
        <dd>{apiStatus}</dd>
      </dl>
      <button type="button" onClick={() => void checkApi()} disabled={apiStatus === 'checking'}>
        {apiStatus === 'checking' ? 'Comprobando…' : 'Comprobar API'}
      </button>
    </main>
  );
}
