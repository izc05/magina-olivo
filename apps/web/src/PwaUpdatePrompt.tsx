import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { cachedOwnerUserId } from './api';
import { listPendingOperations } from './offline/outbox';
import { applyPwaUpdateWhenSafe } from './pwa/update-policy';

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;
type PromptState = 'idle' | 'ready' | 'deferred' | 'applying' | 'error';

export function PwaUpdatePrompt() {
  const [state, setState] = useState<PromptState>('idle');
  const [pendingOperations, setPendingOperations] = useState(0);
  const [updateServiceWorker, setUpdateServiceWorker] = useState<UpdateServiceWorker | null>(null);

  useEffect(() => {
    const update = registerSW({
      immediate: true,
      onOfflineReady() {
        console.info('Mágina Olivo app shell is available offline.');
      },
      onNeedRefresh() {
        setState('ready');
        setPendingOperations(0);
      },
    });
    setUpdateServiceWorker(() => update);
  }, []);

  useEffect(() => {
    const handleSyncComplete = () => {
      setState((current) => current === 'deferred' ? 'ready' : current);
      setPendingOperations(0);
    };

    window.addEventListener('magina:sync-complete', handleSyncComplete);
    return () => window.removeEventListener('magina:sync-complete', handleSyncComplete);
  }, []);

  async function applyUpdate() {
    if (!updateServiceWorker) return;

    setState('applying');
    try {
      const ownerUserId = cachedOwnerUserId();
      if (!ownerUserId) {
        await updateServiceWorker();
        return;
      }

      const result = await applyPwaUpdateWhenSafe({
        ownerUserId,
        applyUpdate: updateServiceWorker,
        getPendingOperationCount: async (ownerId) => (await listPendingOperations(ownerId)).length,
      });

      if (result.status === 'deferred') {
        setPendingOperations(result.pendingOperations);
        setState('deferred');
      }
    } catch {
      setState('error');
    }
  }

  if (state === 'idle') return null;

  const hasPendingOperations = state === 'deferred';
  const detail = hasPendingOperations
    ? `Hay ${pendingOperations} cambio${pendingOperations === 1 ? '' : 's'} pendiente${pendingOperations === 1 ? '' : 's'} de sincronizar. Actualiza cuando la cola esté vacía.`
    : state === 'error'
      ? 'No se ha podido aplicar la actualización. Puedes seguir trabajando y volver a intentarlo.'
      : 'Hay una versión nueva disponible. Actualiza cuando te venga bien.';

  return (
    <section className={`pwa-update-prompt${state === 'error' ? ' error' : ''}`} role="status" aria-live="polite" aria-atomic="true">
      <div>
        <strong>{hasPendingOperations ? 'Actualización pendiente' : state === 'error' ? 'Actualización no aplicada' : 'Nueva versión disponible'}</strong>
        <span>{detail}</span>
      </div>
      <button type="button" onClick={() => void applyUpdate()} disabled={state === 'applying' || hasPendingOperations}>
        {state === 'applying' ? 'Actualizando…' : 'Actualizar ahora'}
      </button>
    </section>
  );
}
