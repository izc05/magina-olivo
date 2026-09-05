import { useCallback, useEffect, useState } from 'react';
import { cachedOwnerUserId } from './api';
import { listPendingOperations, syncPendingOperations } from './offline/outbox';

type PendingSummary = {
  total: number;
  deliveries: number;
  activities: number;
  failed: number;
  lastError: string | null;
};

const emptyPending: PendingSummary = { total: 0, deliveries: 0, activities: 0, failed: 0, lastError: null };

function pendingCopy(summary: PendingSummary): string {
  const parts: string[] = [];
  if (summary.deliveries > 0) parts.push(`${summary.deliveries} entrega${summary.deliveries === 1 ? '' : 's'}`);
  if (summary.activities > 0) parts.push(`${summary.activities} labor${summary.activities === 1 ? '' : 'es'}`);
  return parts.length ? `${parts.join(' · ')} guardada${summary.total === 1 ? '' : 's'} en este móvil` : 'Puedes seguir consultando lo que ya está disponible.';
}

export function ConnectivityStatus() {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [pending, setPending] = useState<PendingSummary>(emptyPending);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const refreshPending = useCallback(async () => {
    const ownerUserId = cachedOwnerUserId();
    if (!ownerUserId) {
      setPending(emptyPending);
      return;
    }
    const operations = await listPendingOperations(ownerUserId);
    const failedOperations = operations.filter((operation) => operation.attempts > 0);
    setPending({
      total: operations.length,
      deliveries: operations.filter((operation) => operation.kind === 'delivery.create').length,
      activities: operations.filter((operation) => operation.kind === 'activity.create').length,
      failed: failedOperations.length,
      lastError: failedOperations.at(-1)?.lastError ?? null,
    });
  }, []);

  const sync = useCallback(async () => {
    const ownerUserId = cachedOwnerUserId();
    if (!ownerUserId || typeof navigator !== 'undefined' && !navigator.onLine) {
      await refreshPending();
      return;
    }

    setSyncing(true);
    setSyncError(null);
    try {
      const result = await syncPendingOperations(ownerUserId);
      await refreshPending();
      if (result.synced > 0) window.dispatchEvent(new CustomEvent('magina:sync-complete'));
      if (result.pending > 0) setSyncError('Quedan cambios pendientes. Puedes reintentar sin perder los datos guardados en este móvil.');
    } catch {
      setSyncError('No se ha podido completar la sincronización. Los cambios siguen guardados en este móvil.');
      await refreshPending();
    } finally {
      setSyncing(false);
    }
  }, [refreshPending]);

  useEffect(() => {
    void refreshPending();
    const timer = window.setInterval(() => void refreshPending(), 1500);
    const handleOnline = () => {
      setOnline(true);
      void sync();
    };
    const handleOffline = () => {
      setOnline(false);
      setSyncError(null);
      void refreshPending();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshPending, sync]);

  if (online && pending.total === 0 && !syncError) return null;

  const hasSyncFailure = online && (pending.failed > 0 || Boolean(syncError));
  const detail = hasSyncFailure
    ? syncError ?? `No se pudo sincronizar ${pending.failed} cambio${pending.failed === 1 ? '' : 's'}. ${pending.lastError ?? 'Reintenta cuando la conexión sea estable.'}`
    : pendingCopy(pending);

  return (
    <div className={`connectivity-banner${online ? hasSyncFailure ? ' error' : ' pending' : ' offline'}`} role="status" aria-live="polite">
      <div>
        <strong>{online ? hasSyncFailure ? 'Sincronización pendiente' : 'Pendiente de sincronizar' : 'Sin conexión'}</strong>
        <span>{detail}</span>
      </div>
      {online && pending.total > 0 ? <button type="button" onClick={() => void sync()} disabled={syncing}>{syncing ? 'Sincronizando…' : hasSyncFailure ? 'Reintentar' : 'Sincronizar'}</button> : null}
    </div>
  );
}
