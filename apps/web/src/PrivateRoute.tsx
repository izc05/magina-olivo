import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api, cachedOwnerUserId } from './api';
import { ConnectivityStatus } from './ConnectivityStatus';
import { NoticeCenter } from './NoticeCenter';
import { OfflineColdStart } from './OfflineColdStart';
import { PilotAlerts } from './PilotAlerts';
import { PrivateAccessGate } from './PrivateAccessGate';
import { privateRouteFailureState, type PrivateRouteState } from './private-route-state';

export function PrivateRoute({ returnTo, children }: { returnTo: string; children: ReactNode }) {
  const [state, setState] = useState<PrivateRouteState>('checking');

  const verify = useCallback(() => {
    let cancelled = false;
    setState('checking');
    void api.me().then(() => {
      if (!cancelled) setState('allowed');
    }).catch((reason: unknown) => {
      if (!cancelled) setState(privateRouteFailureState(reason, {
        hasKnownLocalOwner: Boolean(cachedOwnerUserId()),
        offline: typeof navigator !== 'undefined' && navigator.onLine === false,
      }));
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => verify(), [verify]);

  if (state === 'checking') return <main className="loading-screen" role="status" aria-live="polite">Comprobando tu acceso…</main>;
  if (state === 'denied') return <PrivateAccessGate returnTo={returnTo} />;
  if (state === 'offline_locked') return <OfflineColdStart onRetry={verify} />;
  if (state === 'unavailable') return <main className="access-gate-shell" id="main-content"><section className="access-gate-card" aria-labelledby="private-unavailable-title"><p className="eyebrow">Área privada</p><h1 id="private-unavailable-title">No podemos comprobar tu acceso ahora</h1><p>Tu sesión no se ha cerrado. Vuelve a intentarlo cuando el servicio esté disponible.</p><button className="primary-button" type="button" onClick={verify}>Reintentar</button></section></main>;
  return <><ConnectivityStatus /><NoticeCenter /><PilotAlerts />{children}</>;
}
