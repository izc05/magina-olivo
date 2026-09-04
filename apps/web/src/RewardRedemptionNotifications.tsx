import { useMemo, useState } from 'react';
import type { RedemptionSummary } from './reward-api';
import { buildRewardRedemptionNotifications } from './reward-redemption-notifications';

type Props = {
  redemptions: RedemptionSummary[];
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function RewardRedemptionNotifications({ redemptions }: Props) {
  const notifications = useMemo(
    () => buildRewardRedemptionNotifications(redemptions),
    [redemptions],
  );
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  const visible = notifications.filter((item) => !dismissed.has(item.id));
  if (visible.length === 0) return null;

  return (
    <section className="reward-alerts" aria-labelledby="reward-alerts-title">
      <div className="reward-alerts-heading">
        <div>
          <span className="rewards-kicker">Avisos de canje</span>
          <h2 id="reward-alerts-title">No dejes una recompensa atrás</h2>
        </div>
        <span>{visible.length}</span>
      </div>

      <div className="reward-alerts-list">
        {visible.slice(0, 4).map((notification) => (
          <article
            className={`reward-alert reward-alert--${notification.tone}`}
            key={notification.id}
          >
            <div className="reward-alert-icon" aria-hidden="true">
              {notification.kind === 'expiring' ? '⏳' : notification.kind === 'redeemed' ? '✓' : '🫒'}
            </div>
            <div className="reward-alert-copy">
              <strong>{notification.title}</strong>
              <p>{notification.detail}</p>
              <small>
                {notification.kind === 'expiring'
                  ? `Caduca: ${formatDateTime(notification.occurredAt)}`
                  : `Actualizado: ${formatDateTime(notification.occurredAt)}`}
              </small>
              {notification.kind === 'expiring' ? <a href="#mis-canjes">Ver canje pendiente</a> : null}
            </div>
            <button
              type="button"
              className="reward-alert-dismiss"
              aria-label={`Ocultar aviso: ${notification.title}`}
              onClick={() => setDismissed((current) => {
                const next = new Set(current);
                next.add(notification.id);
                return next;
              })}
            >
              ×
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
