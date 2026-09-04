import { useEffect, useState } from 'react';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushClientState,
  type PushClientState,
} from './push-notifications';

function stateCopy(state: PushClientState): { title: string; detail: string } {
  if (!state.supported) {
    return {
      title: 'Avisos fuera de la app no disponibles',
      detail: 'Este navegador no admite Web Push. El Centro de avisos seguirá funcionando dentro de Mágina Olivo.',
    };
  }
  if (!state.configured) {
    return {
      title: 'Avisos al móvil preparados',
      detail: 'Web Push todavía no está configurado en este entorno. Tus avisos dentro de la app siguen funcionando con normalidad.',
    };
  }
  if (state.permission === 'denied') {
    return {
      title: 'Avisos del navegador bloqueados',
      detail: 'Puedes volver a permitirlos desde los ajustes del navegador o del sistema para este sitio.',
    };
  }
  if (state.subscribed) {
    return {
      title: 'Avisos al móvil activados',
      detail: 'Este dispositivo puede recibir un aviso cuando aparezca una nueva alarma automática de lluvia.',
    };
  }
  return {
    title: 'Recibe avisos importantes en este dispositivo',
    detail: 'Actívalos cuando quieras. Mágina Olivo no solicitará permiso hasta que pulses el botón.',
  };
}

export function PushNotificationPrompt() {
  const [state, setState] = useState<PushClientState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getPushClientState()
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch((reason: unknown) => {
        const status = (reason as Error & { status?: number })?.status;
        if (!cancelled && status !== 401 && status !== 403) {
          setError('No se ha podido comprobar el estado de los avisos del dispositivo.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state && !error) return null;
  if (!state && error) return <div className="push-notification-prompt push-notification-prompt--error" role="status">{error}</div>;
  if (!state) return null;

  const copy = stateCopy(state);
  const canEnable = state.supported && state.configured && state.permission !== 'denied' && !state.subscribed;
  const canDisable = state.supported && state.configured && state.subscribed;

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      setState(await enablePushNotifications());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se han podido activar los avisos.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      setState(await disablePushNotifications());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se han podido desactivar los avisos.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="push-notification-prompt" aria-live="polite">
      <div className="push-notification-prompt__icon" aria-hidden="true">🔔</div>
      <div className="push-notification-prompt__copy">
        <span className="eyebrow">Avisos al dispositivo</span>
        <strong>{copy.title}</strong>
        <p>{copy.detail}</p>
        <small>El push no contiene datos de tu explotación: solo avisa de que hay algo nuevo y abre el Centro de avisos para consultar el detalle autenticado.</small>
        {state.configured ? <small>V1: el disparador externo activo es la alarma automática de lluvia. El resto de categorías continúa dentro del Centro de avisos hasta conectar sus disparadores de servidor.</small> : null}
        {error ? <span className="push-notification-prompt__error" role="alert">{error}</span> : null}
        <div className="push-notification-prompt__actions">
          {canEnable ? (
            <button className="primary-button" type="button" onClick={() => void enable()} disabled={busy}>
              {busy ? 'Activando…' : 'Activar avisos en este dispositivo'}
            </button>
          ) : null}
          {canDisable ? (
            <button className="secondary-button" type="button" onClick={() => void disable()} disabled={busy}>
              {busy ? 'Desactivando…' : 'Desactivar en este dispositivo'}
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
