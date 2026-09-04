import { useEffect, useState } from 'react';
import { loyaltyApi, type LoyaltySummary } from './loyalty-api';
import {
  rewardApi,
  RewardApiError,
  type RedemptionSummary,
  type RewardCatalogItem,
} from './reward-api';
import { RewardPickupCodePanel } from './RewardPickupCodePanel';
import { RewardRedemptionHistory } from './RewardRedemptionHistory';
import {
  classifyRewardRedemptionStatus,
  rewardRedemptionStatusNotice,
} from './reward-redemption-status';

type ActiveCode = {
  redemption: RedemptionSummary;
  token: string;
};

const REDEMPTION_STATUS_POLL_MS = 20_000;

function formatOlives(value: number): string {
  return new Intl.NumberFormat('es-ES').format(Math.max(0, Math.round(value)));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function RewardCatalogPage() {
  const [catalog, setCatalog] = useState<RewardCatalogItem[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionSummary[]>([]);
  const [summary, setSummary] = useState<LoyaltySummary | null>(null);
  const [selectedPickup, setSelectedPickup] = useState<Record<string, string>>({});
  const [activeCode, setActiveCode] = useState<ActiveCode | null>(null);
  const [workingRewardId, setWorkingRewardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const [catalogItems, redemptionItems, loyalty] = await Promise.all([
      rewardApi.catalog(),
      rewardApi.myRedemptions(),
      loyaltyApi.summary(),
    ]);
    setCatalog(catalogItems);
    setRedemptions(redemptionItems);
    setSummary(loyalty);
    setSelectedPickup((current) => {
      const next = { ...current };
      for (const reward of catalogItems) {
        if (!next[reward.id] && reward.pickupPoints[0]) next[reward.id] = reward.pickupPoints[0].id;
      }
      return next;
    });
  }

  useEffect(() => {
    let active = true;
    void refresh()
      .catch((reason: unknown) => {
        if (!active) return;
        if (reason instanceof RewardApiError && reason.status === 401) {
          setAuthRequired(true);
          return;
        }
        setError(reason instanceof Error ? reason.message : 'No se han podido cargar las recompensas.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const redemptionId = activeCode?.redemption.id;
    if (!redemptionId) return;

    let disposed = false;
    let inFlight = false;

    async function syncActiveRedemption() {
      if (disposed || inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;

      try {
        const redemptionItems = await rewardApi.myRedemptions();
        if (disposed) return;
        setRedemptions(redemptionItems);

        const latest = redemptionItems.find((item) => item.id === redemptionId);
        if (latest && classifyRewardRedemptionStatus(latest.status) === 'active') {
          setActiveCode((current) => {
            if (!current || current.redemption.id !== redemptionId) return current;
            return {
              redemption: latest,
              token: current.token,
            };
          });
          return;
        }

        setActiveCode((current) => current?.redemption.id === redemptionId ? null : current);
        setNotice(latest
          ? rewardRedemptionStatusNotice(latest.status)
          : rewardRedemptionStatusNotice('missing'));
        void refresh().catch(() => undefined);
      } catch {
        // Background sync is best-effort: never invalidate a still-valid QR on network errors.
      } finally {
        inFlight = false;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') void syncActiveRedemption();
    }

    function handleFocus() {
      void syncActiveRedemption();
    }

    const intervalId = window.setInterval(() => void syncActiveRedemption(), REDEMPTION_STATUS_POLL_MS);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeCode?.redemption.id]);

  const availableOlives = summary?.availableBalance ?? 0;

  async function redeem(reward: RewardCatalogItem) {
    if (workingRewardId) return;
    setWorkingRewardId(reward.id);
    setError(null);
    setNotice(null);

    try {
      const pickupPointId = reward.pickupRequired ? selectedPickup[reward.id] : undefined;
      const result = await rewardApi.redeem(reward.id, pickupPointId, crypto.randomUUID());
      let token = result.qrToken;
      let redemption = result.redemption;

      if (!token) {
        const reissued = await rewardApi.reissueToken(redemption.id);
        token = reissued.qrToken;
        redemption = reissued.redemption;
      }

      setActiveCode({ redemption, token });
      setNotice(`Reserva confirmada: ${reward.title}.`);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido completar el canje.');
    } finally {
      setWorkingRewardId(null);
    }
  }

  async function reissue(redemption: RedemptionSummary) {
    setWorkingRewardId(redemption.rewardId);
    setError(null);
    try {
      const result = await rewardApi.reissueToken(redemption.id);
      setActiveCode({ redemption: result.redemption, token: result.qrToken });
      setNotice('Se ha generado un nuevo QR de recogida y el anterior ha quedado invalidado.');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido regenerar el código.');
    } finally {
      setWorkingRewardId(null);
    }
  }

  if (authRequired) {
    return (
      <main className="rewards-page rewards-state-page">
        <section className="rewards-state-card">
          <span className="rewards-kicker">Mis Aceitunas</span>
          <h1>Las recompensas son privadas</h1>
          <p>Inicia sesión para consultar tu saldo y realizar canjes.</p>
          <a href="/">Ir a iniciar sesión</a>
        </section>
      </main>
    );
  }

  if (loading) {
    return <main className="rewards-page rewards-state-page"><p role="status">Cargando recompensas…</p></main>;
  }

  return (
    <main className="rewards-page">
      <header className="rewards-topbar">
        <a href="/tu-olivo" className="rewards-back" aria-label="Volver a Tu Olivo">←</a>
        <div>
          <span className="rewards-kicker">Mágina Olivo</span>
          <strong>Recompensas</strong>
        </div>
        <div className="rewards-balance"><b>{formatOlives(availableOlives)}</b> 🫒</div>
      </header>

      <section className="rewards-hero">
        <span className="rewards-kicker">AOVE y ventajas locales</span>
        <h1>Convierte tus aceitunas en algo real</h1>
        <p>Cuando una cooperativa active una campaña con stock, podrás reservar aquí tu recompensa y recogerla en el punto indicado.</p>
      </section>

      {notice ? <p className="rewards-notice" role="status">{notice}</p> : null}
      {error ? <p className="rewards-error" role="alert">{error}</p> : null}

      {activeCode ? (
        <section className="rewards-code-card" aria-live="polite">
          <div>
            <span className="rewards-kicker">Canje reservado</span>
            <h2>{activeCode.redemption.rewardTitle}</h2>
            <p>
              {activeCode.redemption.pickupPoint
                ? `Recoge en ${activeCode.redemption.pickupPoint.name} · ${activeCode.redemption.pickupPoint.address}.`
                : 'Conserva este QR hasta completar la entrega.'}
            </p>
            <small>Válido hasta {formatDate(activeCode.redemption.expiresAt)}.</small>
          </div>
          <RewardPickupCodePanel
            token={activeCode.token}
            tokenHint={activeCode.redemption.tokenHint}
          />
        </section>
      ) : null}

      <section className="rewards-section">
        <div className="rewards-section-heading">
          <div>
            <span className="rewards-kicker">Catálogo</span>
            <h2>Disponibles ahora</h2>
          </div>
          <span>{catalog.length} recompensas activas</span>
        </div>

        {catalog.length === 0 ? (
          <article className="rewards-coming-card">
            <div className="rewards-bottle" aria-hidden="true">AOVE</div>
            <div>
              <span className="rewards-kicker">Próximamente</span>
              <h3>Botellas AOVE de cooperativas de Sierra Mágina</h3>
              <p>El sistema ya está preparado para stock real. Esta tarjeta no se activará como canje hasta que exista una campaña con botellas confirmadas.</p>
              <strong>Objetivo de referencia: 2.500 🫒 por botella de 500 ml</strong>
            </div>
          </article>
        ) : (
          <div className="rewards-grid">
            {catalog.map((reward) => {
              const canAfford = availableOlives >= reward.costOlives;
              const hasStock = reward.availableUnits > 0;
              const pickupReady = !reward.pickupRequired || Boolean(selectedPickup[reward.id]);
              const disabled = !canAfford || !hasStock || !pickupReady || workingRewardId === reward.id;

              return (
                <article className="reward-card" key={reward.id}>
                  <div className="reward-card-top">
                    <div className="rewards-bottle" aria-hidden="true">AOVE</div>
                    <div>
                      <span className="rewards-kicker">{reward.partner?.name ?? 'Mágina Olivo'}</span>
                      <h3>{reward.title}</h3>
                      {reward.productFormat ? <span>{reward.productFormat}</span> : null}
                    </div>
                  </div>
                  {reward.description ? <p>{reward.description}</p> : null}

                  <div className="reward-metrics">
                    <span><b>{formatOlives(reward.costOlives)} 🫒</b><small>Coste</small></span>
                    <span><b>{reward.availableUnits}</b><small>Unidades</small></span>
                  </div>

                  {reward.pickupRequired ? (
                    <label className="reward-pickup-label">
                      Punto de recogida
                      <select
                        value={selectedPickup[reward.id] ?? ''}
                        onChange={(event) => setSelectedPickup((current) => ({
                          ...current,
                          [reward.id]: event.target.value,
                        }))}
                      >
                        <option value="" disabled>Selecciona</option>
                        {reward.pickupPoints.map((point) => (
                          <option value={point.id} key={point.id}>
                            {point.name}{point.municipality ? ` · ${point.municipality}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  {reward.termsSummary ? <small className="reward-terms">{reward.termsSummary}</small> : null}

                  <button type="button" disabled={disabled} onClick={() => void redeem(reward)}>
                    {workingRewardId === reward.id
                      ? 'Reservando…'
                      : !hasStock
                        ? 'Agotado'
                        : !canAfford
                          ? `Te faltan ${formatOlives(reward.costOlives - availableOlives)} 🫒`
                          : 'Canjear recompensa'}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <RewardRedemptionHistory
        redemptions={redemptions}
        workingRewardId={workingRewardId}
        onReissue={(redemption) => void reissue(redemption)}
      />
    </main>
  );
}
