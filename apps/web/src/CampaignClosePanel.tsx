import { useEffect, useMemo, useState } from 'react';
import { api, type CampaignSummary, type Holding } from './api.ts';
import {
  CampaignCloseError,
  closeCampaign,
  type CampaignCloseResult,
} from './campaign-close-api.ts';

type CampaignSnapshot = {
  id: string;
  name: string;
  status: string;
};

function closeErrorMessage(error: unknown): string {
  if (error instanceof CampaignCloseError) {
    if (error.code === 'CAMPAIGN_HAS_NO_CONFIRMED_DELIVERIES') {
      return 'Registra al menos una entrega confirmada antes de cerrar la campaña.';
    }
    if (error.code === 'CAMPAIGN_RESULTS_PENDING') {
      return 'Todavía faltan rendimientos por registrar. Completa todas las entregas antes de cerrar.';
    }
    if (error.code === 'CAMPAIGN_CLOSE_FORBIDDEN') {
      return 'Solo el propietario o un administrador puede cerrar la campaña.';
    }
    return error.message;
  }
  return error instanceof Error ? error.message : 'No se ha podido cerrar la campaña.';
}

export function CampaignClosePanel({
  holdingId,
  campaignId,
}: {
  holdingId: string;
  campaignId: string;
}) {
  const [holding, setHolding] = useState<Holding | null>(null);
  const [campaign, setCampaign] = useState<CampaignSnapshot | CampaignCloseResult | null>(null);
  const [summary, setSummary] = useState<CampaignSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [holdingResult, campaignResult, campaignSummary] = await Promise.all([
        api.holdings(),
        api.campaigns(holdingId),
        api.campaignSummary(campaignId),
      ]);
      setHolding(holdingResult.items.find((item) => item.id === holdingId) ?? null);
      setCampaign(campaignResult.items.find((item) => item.id === campaignId) ?? null);
      setSummary(campaignSummary);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido comprobar el cierre de campaña.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [holdingId, campaignId]);

  const canManageLifecycle = holding?.role === 'owner' || holding?.role === 'admin';
  const isClosed = campaign?.status === 'closed';
  const requirements = useMemo(() => {
    if (!summary) return [] as string[];
    const missing: string[] = [];
    if (summary.deliveriesCount < 1) missing.push('al menos una entrega confirmada');
    if (summary.pendingResultCount > 0) {
      missing.push(`${summary.pendingResultCount} rendimiento${summary.pendingResultCount === 1 ? '' : 's'} pendiente${summary.pendingResultCount === 1 ? '' : 's'}`);
    }
    return missing;
  }, [summary]);
  const eligible = Boolean(canManageLifecycle && !isClosed && summary && requirements.length === 0);

  async function submitClose() {
    setClosing(true);
    setError(null);
    setNotice(null);
    try {
      const result = await closeCampaign(campaignId);
      setCampaign(result);
      setNotice(result.alreadyClosed
        ? 'Campaña ya cerrada. La recompensa se ha verificado de forma segura.'
        : 'Campaña cerrada. +250 🫒 quedan registradas en Tu Olivo para recogerlas vareando.');
      window.dispatchEvent(new CustomEvent('magina:campaign-closed', { detail: { campaignId } }));
    } catch (reason) {
      setError(closeErrorMessage(reason));
      await load().catch(() => undefined);
    } finally {
      setClosing(false);
    }
  }

  if (loading) {
    return <section className="section card card-body" role="status">Comprobando cierre de campaña…</section>;
  }

  if (!campaign) return null;

  return (
    <section className="section card card-body" aria-labelledby="campaign-close-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow page-eyebrow">Ciclo de campaña</p>
          <h2 id="campaign-close-title" className="section-title">{isClosed ? 'Campaña cerrada' : 'Cerrar campaña'}</h2>
          <p className="section-copy">
            {isClosed
              ? 'El cierre queda registrado y la recompensa de campaña solo puede concederse una vez.'
              : 'Cierra la campaña cuando todas las entregas confirmadas tengan su rendimiento. El cierre válido genera +250 🫒 pendientes en Tu Olivo.'}
          </p>
        </div>
        <span className={`badge${isClosed ? ' gold' : ''}`}>{isClosed ? 'Cerrada' : 'Activa'}</span>
      </div>

      {notice ? <div className="alert success" role="status">{notice}</div> : null}
      {error ? <div className="alert" role="alert">{error}</div> : null}

      {!isClosed && requirements.length > 0 ? (
        <div className="alert" role="status">
          Antes de cerrar falta: {requirements.join(' y ')}.
        </div>
      ) : null}

      {!canManageLifecycle ? (
        <p className="section-copy">Solo propietario o administrador puede cerrar el ciclo de campaña.</p>
      ) : null}

      {canManageLifecycle ? (
        <div className="form-actions">
          <button
            type="button"
            className={isClosed ? 'text-button' : 'primary-button'}
            disabled={closing || (!isClosed && !eligible)}
            onClick={() => void submitClose()}
          >
            {closing
              ? 'Comprobando…'
              : isClosed
                ? 'Verificar recompensa'
                : 'Cerrar campaña · +250 🫒'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
