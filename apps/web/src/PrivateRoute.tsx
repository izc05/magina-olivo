import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from './api';
import { ConnectivityStatus } from './ConnectivityStatus';
import { NoticeCenter } from './NoticeCenter';
import { PilotAlerts } from './PilotAlerts';
import { PrivateAccessGate } from './PrivateAccessGate';

type State = 'checking' | 'allowed' | 'denied';

export function PrivateRoute({ returnTo, children }: { returnTo: string; children: ReactNode }) {
  const [state, setState] = useState<State>('checking');

  useEffect(() => {
    let cancelled = false;
    void api.me().then(() => {
      if (!cancelled) setState('allowed');
    }).catch(() => {
      if (!cancelled) setState('denied');
    });
    return () => { cancelled = true; };
  }, []);

  if (state === 'checking') return <main className="loading-screen" role="status" aria-live="polite">Comprobando tu acceso…</main>;
  if (state === 'denied') return <PrivateAccessGate returnTo={returnTo} />;
  return <><ConnectivityStatus /><NoticeCenter /><PilotAlerts />{children}</>;
}
