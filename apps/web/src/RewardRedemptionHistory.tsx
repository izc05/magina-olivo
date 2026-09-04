import type { RedemptionSummary } from './reward-api';
import { groupRewardRedemptions } from './reward-redemption-history';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatOlives(value: number): string {
  return new Intl.NumberFormat('es-ES').format(Math.max(0, Math.round(value)));
}

type Props = {
  redemptions: RedemptionSummary[];
  workingRewardId: string | null;
  onReissue: (redemption: RedemptionSummary) => void;
};

function HistoryCard({
  redemption,
  kind,
  workingRewardId,
  onReissue,
}: {
  redemption: RedemptionSummary;
  kind: 'pending' | 'redeemed' | 'expired' | 'other';
  workingRewardId: string | null;
  onReissue: (redemption: RedemptionSummary) => void;
}) {
  const statusLabel = kind === 'pending'
    ? 'Pendiente'
    : kind === 'redeemed'
      ? 'Recogido'
      : kind === 'expired'
        ? 'Caducado'
        : 'Finalizado';

  return (
    <article className={`redemption-history-card redemption-history-card--${kind}`}>
      <div className="redemption-history-main">
        <div className="redemption-history-title-row">
          <div>
            <strong>{redemption.rewardTitle}</strong>
            <span>{redemption.partnerName ?? 'Mágina Olivo'}</span>
          </div>
          <span className={`redemption-status-badge redemption-status-badge--${kind}`}>{statusLabel}</span>
        </div>

        <dl className="redemption-history-meta">
          <div>
            <dt>Reservado</dt>
            <dd>{formatDate(redemption.reservedAt)}</dd>
          </div>
          <div>
            <dt>Coste</dt>
            <dd>{formatOlives(redemption.olivesCost)} 🫒</dd>
          </div>
          {redemption.pickupPoint ? (
            <div>
              <dt>Recogida</dt>
              <dd>{redemption.pickupPoint.name}</dd>
            </div>
          ) : null}
          {kind === 'pending' ? (
            <div>
              <dt>Caduca</dt>
              <dd>{formatDate(redemption.expiresAt)}</dd>
            </div>
          ) : null}
          {kind === 'redeemed' && redemption.redeemedAt ? (
            <div>
              <dt>Entregado</dt>
              <dd>{formatDate(redemption.redeemedAt)}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {kind === 'pending' ? (
        <button
          type="button"
          onClick={() => onReissue(redemption)}
          disabled={workingRewardId === redemption.rewardId}
        >
          {workingRewardId === redemption.rewardId ? 'Generando…' : 'Mostrar QR nuevo'}
        </button>
      ) : null}

      {kind === 'redeemed' ? (
        <details className="redemption-receipt">
          <summary>Ver justificante digital</summary>
          <div className="redemption-receipt-body">
            <span className="rewards-kicker">Justificante de entrega</span>
            <dl>
              <div>
                <dt>Referencia</dt>
                <dd><code>{redemption.id}</code></dd>
              </div>
              <div>
                <dt>Recompensa</dt>
                <dd>{redemption.rewardTitle}</dd>
              </div>
              <div>
                <dt>Cooperativa / entidad</dt>
                <dd>{redemption.partnerName ?? 'Mágina Olivo'}</dd>
              </div>
              {redemption.pickupPoint ? (
                <div>
                  <dt>Punto de recogida</dt>
                  <dd>{redemption.pickupPoint.name} · {redemption.pickupPoint.address}</dd>
                </div>
              ) : null}
              <div>
                <dt>Coste del canje</dt>
                <dd>{formatOlives(redemption.olivesCost)} 🫒</dd>
              </div>
              {redemption.redeemedAt ? (
                <div>
                  <dt>Entrega confirmada</dt>
                  <dd>{formatDateTime(redemption.redeemedAt)}</dd>
                </div>
              ) : null}
            </dl>
            <small>Este justificante se genera a partir de los datos registrados en el canje.</small>
          </div>
        </details>
      ) : null}

      {kind === 'expired' ? (
        <p className="redemption-history-note">Este canje ya no está disponible.</p>
      ) : null}
    </article>
  );
}

function HistoryGroup({
  title,
  description,
  items,
  kind,
  workingRewardId,
  onReissue,
}: {
  title: string;
  description: string;
  items: RedemptionSummary[];
  kind: 'pending' | 'redeemed' | 'expired' | 'other';
  workingRewardId: string | null;
  onReissue: (redemption: RedemptionSummary) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="redemption-history-group" aria-labelledby={`redemption-history-${kind}`}>
      <div className="redemption-history-group-heading">
        <div>
          <h3 id={`redemption-history-${kind}`}>{title}</h3>
          <p>{description}</p>
        </div>
        <span>{items.length}</span>
      </div>
      <div className="redemption-history-list">
        {items.map((redemption) => (
          <HistoryCard
            key={redemption.id}
            redemption={redemption}
            kind={kind}
            workingRewardId={workingRewardId}
            onReissue={onReissue}
          />
        ))}
      </div>
    </section>
  );
}

export function RewardRedemptionHistory({ redemptions, workingRewardId, onReissue }: Props) {
  const groups = groupRewardRedemptions(redemptions);
  const total = redemptions.length;

  return (
    <section className="rewards-section redemption-history-section">
      <div className="rewards-section-heading">
        <div>
          <span className="rewards-kicker">Mis canjes</span>
          <h2>Historial de recompensas</h2>
        </div>
        <span>{total} {total === 1 ? 'canje' : 'canjes'}</span>
      </div>

      {total === 0 ? (
        <article className="redemption-history-empty">
          <strong>Aún no has realizado ningún canje.</strong>
          <span>Cuando reserves una recompensa aparecerá aquí su seguimiento.</span>
        </article>
      ) : (
        <>
          <div className="redemption-history-summary" aria-label="Resumen de canjes">
            <span><b>{groups.pending.length}</b><small>Pendientes</small></span>
            <span><b>{groups.redeemed.length}</b><small>Recogidos</small></span>
            <span><b>{groups.expired.length}</b><small>Caducados</small></span>
          </div>

          <HistoryGroup
            title="Pendientes de recoger"
            description="Canjes que todavía tienen un QR válido o regenerable."
            items={groups.pending}
            kind="pending"
            workingRewardId={workingRewardId}
            onReissue={onReissue}
          />
          <HistoryGroup
            title="Recogidos"
            description="Entregas confirmadas con justificante digital consultable."
            items={groups.redeemed}
            kind="redeemed"
            workingRewardId={workingRewardId}
            onReissue={onReissue}
          />
          <HistoryGroup
            title="Caducados"
            description="Canjes que terminaron sin recogida dentro de su vigencia."
            items={groups.expired}
            kind="expired"
            workingRewardId={workingRewardId}
            onReissue={onReissue}
          />
          <HistoryGroup
            title="Otros estados"
            description="Canjes finalizados por cancelación u otro estado no activo."
            items={groups.other}
            kind="other"
            workingRewardId={workingRewardId}
            onReissue={onReissue}
          />
        </>
      )}
    </section>
  );
}
