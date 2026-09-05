import type { ReactNode } from 'react';
import type { Campaign, CampaignSummary } from './api';

type CampaignDashboardV2Props = {
  campaigns: Campaign[];
  selectedCampaignId: string;
  selectedCampaign: Campaign | null;
  summary: CampaignSummary | null;
  onSelectCampaign: (id: string) => void;
  createCampaign: ReactNode;
  deliveryEntry: ReactNode;
  deliveries: ReactNode;
  documents: ReactNode;
};

function formatKg(value: string | number | null | undefined): string {
  const number = Number(value ?? 0);
  return Number.isFinite(number)
    ? `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(number)} kg`
    : '—';
}

function formatPercent(value: string | number | null | undefined): string {
  if (value == null) return '—';
  const number = Number(value);
  return Number.isFinite(number)
    ? `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(number)} %`
    : '—';
}

function coverageValue(summary: CampaignSummary | null): number {
  const value = Number(summary?.coveragePercent ?? 0);
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function campaignLabel(campaign: Campaign | null): string {
  if (!campaign) return 'Campaña';
  return `${campaign.seasonStartYear}/${String(campaign.seasonEndYear).slice(-2)}`;
}

export function CampaignDashboardV2({
  campaigns,
  selectedCampaignId,
  selectedCampaign,
  summary,
  onSelectCampaign,
  createCampaign,
  deliveryEntry,
  deliveries,
  documents,
}: CampaignDashboardV2Props) {
  const coverage = coverageValue(summary);
  const pending = summary?.pendingResultCount ?? 0;
  const deliveriesCount = summary?.deliveriesCount ?? 0;

  return (
    <div className="campaign-dashboard-v2">
      <section className="campaign-v2-hero" aria-labelledby="campaign-v2-title">
        <div className="campaign-v2-hero-topline">
          <div>
            <span className="campaign-v2-kicker">Campaña activa</span>
            <h1 id="campaign-v2-title">{campaignLabel(selectedCampaign)}</h1>
            <p>{selectedCampaign?.name ?? 'Entregas, rendimiento y documentos de tu campaña'}</p>
          </div>
          {selectedCampaign ? (
            <span className={`campaign-v2-status ${selectedCampaign.status === 'active' ? 'active' : ''}`}>
              {selectedCampaign.status === 'active' ? 'En curso' : 'Histórico'}
            </span>
          ) : null}
        </div>

        <dl className="campaign-v2-metrics">
          <div><dt>Aceituna</dt><dd>{formatKg(summary?.totalKilograms)}</dd></div>
          <div><dt>Rendimiento</dt><dd>{formatPercent(summary?.weightedYieldPercent)}</dd></div>
          <div><dt>Entregas</dt><dd>{deliveriesCount}</dd></div>
          <div><dt>Pendientes</dt><dd>{pending}</dd></div>
        </dl>

        <div className="campaign-v2-coverage" aria-label={`Cobertura de rendimiento ${Math.round(coverage)} por ciento`}>
          <div>
            <span>Cobertura de rendimiento</span>
            <strong>{formatPercent(summary?.coveragePercent)}</strong>
          </div>
          <div className="campaign-v2-coverage-track" aria-hidden="true">
            <span style={{ width: `${coverage}%` }} />
          </div>
        </div>
      </section>

      {campaigns.length ? (
        <section className="campaign-v2-selector" aria-label="Seleccionar campaña">
          <label htmlFor="campaign-v2-select">Campaña</label>
          <select id="campaign-v2-select" value={selectedCampaignId} onChange={(event) => onSelectCampaign(event.target.value)}>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
            ))}
          </select>
        </section>
      ) : null}

      {!selectedCampaign ? (
        <section className="campaign-v2-empty">
          <p className="eyebrow page-eyebrow">Campaña</p>
          <h2 className="section-title">Crea tu primera campaña</h2>
          <p className="section-copy">Cuando abras una campaña podrás registrar entregas, rendimientos y documentación sin perder el histórico.</p>
          {createCampaign}
        </section>
      ) : null}

      {selectedCampaign ? (
        <>
          <section className="campaign-v2-section campaign-v2-entry-section" aria-labelledby="campaign-v2-entry-title">
            <div className="campaign-v2-section-heading">
              <div>
                <span className="eyebrow page-eyebrow">Nueva entrada</span>
                <h2 id="campaign-v2-entry-title">Registrar entrega</h2>
                <p>Guarda kilos, destino, parcela y ticket desde el mismo flujo privado.</p>
              </div>
              <span className="campaign-v2-step">01</span>
            </div>
            {deliveryEntry}
          </section>

          <section className="campaign-v2-section" aria-labelledby="campaign-v2-deliveries-title">
            <div className="campaign-v2-section-heading">
              <div>
                <span className="eyebrow page-eyebrow">Trazabilidad</span>
                <h2 id="campaign-v2-deliveries-title">Entregas</h2>
                <p>{deliveriesCount} registrada{deliveriesCount === 1 ? '' : 's'} · {pending} pendiente{pending === 1 ? '' : 's'} de rendimiento</p>
              </div>
              <span className="campaign-v2-step">02</span>
            </div>
            {deliveries}
          </section>

          <section className="campaign-v2-section campaign-v2-documents-section" aria-labelledby="campaign-v2-documents-title">
            <div className="campaign-v2-section-heading">
              <div>
                <span className="eyebrow page-eyebrow">Archivo privado</span>
                <h2 id="campaign-v2-documents-title">Documentos de campaña</h2>
                <p>Tickets, exportaciones y documentos siguen vinculados a tus datos reales.</p>
              </div>
              <span className="campaign-v2-step">03</span>
            </div>
            {documents}
          </section>
        </>
      ) : null}
    </div>
  );
}
