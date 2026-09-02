import { useCallback, useEffect, useState } from 'react';
import { cachedOwnerUserId } from './api';
import { listPendingOperations, syncPendingOperations } from './offline/outbox';

export function ConnectivityStatus() {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPending = useCallback(async () => {
    const ownerUserId = cachedOwnerUserId();
    if (!ownerUserId) {
      setPending(0);
      return;
    }
    const operations = await listPendingOperations(ownerUserId);
    setPending(operations.length);
  }, []);

  const sync = useCallback(async () => {
    const ownerUserId = cachedOwnerUserId();
    if (!ownerUserId || typeof navigator !== 'undefined' && !navigator.onLine) {
      await refreshPending();
      return;
    }

    setSyncing(true);
    try {
      const result = await syncPendingOperations(ownerUserId);
      setPending(result.pending);
      if (result.synced > 0) window.dispatchEvent(new CustomEvent('magina:sync-complete'));
    } finally {
      setSyncing(false);
    }
  }, [refreshPending]);

  useEffect(() => {
    void refreshPending();
    const handleOnline = () => {
      setOnline(true);
      void sync();
    };
    const handleOffline = () => {
      setOnline(false);
      void refreshPending();
    };
    const handleOutboxChange = () => void refreshPending();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('magina:outbox-change', handleOutboxChange);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('magina:outbox-change', handleOutboxChange);
    };
  }, [refreshPending, sync]);

  if (online && pending === 0) return null;

  return (
    <div className={`connectivity-banner${online ? ' pending' : ' offline'}`} role="status" aria-live="polite">
      <div>
        <strong>{online ? 'Pendiente de sincronizar' : 'Sin conexión'}</strong>
        <span>{pending > 0 ? `${pending} operación${pending === 1 ? '' : 'es'} guardada${pending === 1 ? '' : 's'} en este móvil` : 'Puedes seguir consultando lo que ya está disponible.'}</span>
      </div>
      {online && pending > 0 ? <button type="button" onClick={() => void sync()} disabled={syncing}>{syncing ? 'Sincronizando…' : 'Sincronizar'}</button> : null}
    </div>
  );
}
