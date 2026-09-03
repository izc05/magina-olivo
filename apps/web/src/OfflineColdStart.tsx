import { useEffect, useState } from 'react';
import { cachedOwnerUserId } from './api.ts';
import { listPendingOperations } from './offline/outbox.ts';

type PendingCounts = {
  deliveries: number;
  activities: number;
};

export function OfflineColdStart({ onRetry }: { onRetry: () => void }) {
  const [counts, setCounts] = useState<PendingCounts>({ deliveries: 0, activities: 0 });
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const ownerUserId = cachedOwnerUserId();
    if (ownerUserId) {
      void listPendingOperations(ownerUserId).then((operations) => {
        setCounts({
          deliveries: operations.filter((operation) => operation.kind === 'delivery.create').length,
          activities: operations.filter((operation) => operation.kind === 'activity.create').length,
        });
      });
    }

    const handleOnline = () => {
      setChecking(true);
      onRetry();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [onRetry]);

  function retry() {
    setChecking(true);
    onRetry();
  }

  const pending = counts.deliveries + counts.activities;

  return (
    <main className="offline-start-shell">
      <section className="offline-start-card" aria-labelledby="offline-start-title">
        <div className="offline-start-mark" aria-hidden="true">⌁</div>
        <p className="eyebrow page-eyebrow">Modo protegido</p>
        <h1 id="offline-start-title" className="login-title">Estás sin conexión</h1>
        <p className="offline-start-copy">
          La aplicación está instalada y tus cambios pendientes siguen guardados en este móvil. Para proteger tus datos, Mágina Olivo no conserva en claro una copia completa de tus fincas y campañas después de cerrar la app.
        </p>

        {pending > 0 ? (
          <div className="offline-start-pending" role="status">
            <strong>{pending} cambio{pending === 1 ? '' : 's'} pendiente{pending === 1 ? '' : 's'}</strong>
            <span>
              {counts.deliveries > 0 ? `${counts.deliveries} entrega${counts.deliveries === 1 ? '' : 's'}` : ''}
              {counts.deliveries > 0 && counts.activities > 0 ? ' · ' : ''}
              {counts.activities > 0 ? `${counts.activities} labor${counts.activities === 1 ? '' : 'es'}` : ''}
            </span>
          </div>
        ) : null}

        <div className="offline-start-note">
          <strong>Qué sí está protegido</strong>
          <span>La cola offline no se borra al cerrar la PWA. Cuando vuelva Internet podrás entrar y sincronizarla.</span>
        </div>

        <button className="primary-button offline-start-button" type="button" onClick={retry} disabled={checking}>
          {checking ? 'Comprobando…' : 'Comprobar conexión'}
        </button>
        <p className="offline-start-footnote">En el piloto V1 no se permite acceso cold-start a datos privados sin validar primero la sesión online.</p>
      </section>
    </main>
  );
}
