import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  api,
  type ActivityCreateBody,
  type ActivityType,
  type Campaign,
  type Plot,
  type PlotTimelineItem,
} from './api.ts';
import { PlotMapPanel } from './PlotMapPanel.tsx';

const activityLabels: Record<ActivityType, string> = {
  treatment: 'Tratamiento',
  fertilization: 'Abonado',
  pruning: 'Poda',
  mowing: 'Desbroce',
  tillage: 'Laboreo',
  irrigation: 'Riego',
  harvest: 'Recolección',
  maintenance: 'Mantenimiento',
  planting: 'Plantación / reposición',
  sampling: 'Análisis / muestreo',
  observation: 'Observación',
  other: 'Otra',
};

type TimelineFilter = 'all' | 'activity' | 'delivery' | 'yield_result';

function localDateTimeValue(): string {
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return now.toISOString().slice(0, 16);
}

function timelineTitle(item: PlotTimelineItem): string {
  if (item.type === 'delivery') return `Entrega · ${item.kilograms ?? '—'} kg`;
  if (item.type === 'yield_result') return `Rendimiento · ${item.yieldPercent ?? '—'} %`;
  return activityLabels[item.activityType ?? 'other'];
}

function timelineDetail(item: PlotTimelineItem): string | null {
  if (item.type === 'delivery') {
    return [item.destination, item.ticketNumber ? `Ticket ${item.ticketNumber}` : null].filter(Boolean).join(' · ') || null;
  }
  if (item.type === 'yield_result') return 'Resultado asociado a una entrega';
  return [item.notes, item.costEur ? `${item.costEur} €` : null].filter(Boolean).join(' · ') || null;
}

function filterLabel(filter: TimelineFilter): string {
  if (filter === 'activity') return 'Labores';
  if (filter === 'delivery') return 'Entregas';
  if (filter === 'yield_result') return 'Rendimientos';
  return 'Todo';
}

export function FieldNotebook({
  holdingId,
  farmId,
  plots,
}: {
  holdingId: string;
  farmId: string;
  plots: Plot[];
}) {
  const [selectedPlotId, setSelectedPlotId] = useState(plots[0]?.id ?? '');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState('');
  const [timeline, setTimeline] = useState<PlotTimelineItem[]>([]);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('all');
  const [activityType, setActivityType] = useState<ActivityType>('observation');
  const [busy, setBusy] = useState(false);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedPlot = useMemo(
    () => plots.find((plot) => plot.id === selectedPlotId) ?? null,
    [plots, selectedPlotId],
  );

  const harvestReportUrl = selectedPlotId && campaignId
    ? `/api/v1/campaigns/${campaignId}/plots/${selectedPlotId}/harvest-report.pdf`
    : null;
  const holdingHarvestReportUrl = campaignId
    ? `/api/v1/campaigns/${campaignId}/harvest-report.pdf`
    : null;
  const holdingHarvestComparisonUrl = campaignId
    ? `/api/v1/campaigns/${campaignId}/harvest-comparison.pdf`
    : null;

  const timelineCounts = useMemo(() => ({
    all: timeline.length,
    activity: timeline.filter((item) => item.type === 'activity').length,
    delivery: timeline.filter((item) => item.type === 'delivery').length,
    yield_result: timeline.filter((item) => item.type === 'yield_result').length,
  }), [timeline]);

  const filteredTimeline = useMemo(() => (
    timelineFilter === 'all' ? timeline : timeline.filter((item) => item.type === timelineFilter)
  ), [timeline, timelineFilter]);

  const lastTimelineDate = timeline[0]?.occurredAt
    ? new Date(timeline[0].occurredAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
    : '—';

  useEffect(() => {
    if (!plots.some((plot) => plot.id === selectedPlotId)) setSelectedPlotId(plots[0]?.id ?? '');
  }, [plots, selectedPlotId]);

  useEffect(() => {
    let cancelled = false;
    void api.campaigns(holdingId).then((result) => {
      if (cancelled) return;
      setCampaigns(result.items);
      setCampaignId((current) => current || result.items.find((item) => item.status === 'active')?.id || result.items[0]?.id || '');
    }).catch(() => {
      if (!cancelled) setCampaigns([]);
    });
    return () => { cancelled = true; };
  }, [holdingId]);

  async function loadTimeline(plotId: string) {
    if (!plotId) {
      setTimeline([]);
      return;
    }
    setLoadingTimeline(true);
    try {
      const result = await api.plotTimeline(plotId);
      setTimeline(result.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido cargar la historia de la parcela.');
    } finally {
      setLoadingTimeline(false);
    }
  }

  useEffect(() => {
    void loadTimeline(selectedPlotId);
  }, [selectedPlotId]);

  useEffect(() => {
    const refreshAfterSync = () => {
      if (selectedPlotId) void loadTimeline(selectedPlotId);
    };
    window.addEventListener('magina:sync-complete', refreshAfterSync);
    return () => window.removeEventListener('magina:sync-complete', refreshAfterSync);
  }, [selectedPlotId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPlotId) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const occurredAt = String(data.get('occurredAt') || '');
    if (!occurredAt) return;

    const body: ActivityCreateBody = {
      activityType,
      occurredAt: new Date(occurredAt).toISOString(),
      farmId,
      plotId: selectedPlotId,
    };

    if (campaignId) body.campaignId = campaignId;

    const affectedAreaHa = String(data.get('affectedAreaHa') || '').trim();
    const productName = String(data.get('productName') || '').trim();
    const productRegistrationNumber = String(data.get('productRegistrationNumber') || '').trim();
    const quantity = String(data.get('quantity') || '').trim();
    const quantityUnit = String(data.get('quantityUnit') || '').trim();
    const costEur = String(data.get('costEur') || '').trim();
    const notes = String(data.get('notes') || '').trim();

    if (affectedAreaHa) body.affectedAreaHa = Number(affectedAreaHa);
    if (productName) body.productName = productName;
    if (activityType === 'treatment' && productRegistrationNumber) body.productRegistrationNumber = productRegistrationNumber;
    if (quantity) body.quantity = Number(quantity);
    if (quantityUnit) body.quantityUnit = quantityUnit;
    if (costEur) body.costEur = Number(costEur);
    if (notes) body.notes = notes;

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.createActivity(holdingId, body);
      form.reset();
      setActivityType('observation');
      if ('offlineQueued' in result) {
        setNotice('Labor guardada en este móvil. Se añadirá a la historia al recuperar conexión.');
      } else {
        setNotice('Labor guardada en la historia de la parcela.');
        await loadTimeline(selectedPlotId);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido guardar la labor.');
    } finally {
      setBusy(false);
    }
  }

  if (!plots.length) {
    return (
      <section className="section card card-body notebook-empty">
        <span className="badge">Cuaderno de campo</span>
        <h2 className="section-title notebook-title">Labores</h2>
        <p className="section-copy">Añade primero una parcela para registrar poda, riego, tratamientos, costes y observaciones.</p>
      </section>
    );
  }

  return (
    <>
      <PlotMapPanel farmId={farmId} />
      <section className="section notebook-shell" aria-labelledby="field-notebook-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow page-eyebrow">Cuaderno personal</p>
            <h2 id="field-notebook-title" className="section-title">Labores e historia</h2>
            <p className="section-copy">Recolección y entrega siguen siendo registros distintos.</p>
          </div>
        </div>

        <div className="card card-body notebook-card">
          <div className="notebook-selector-row">
            <div className="field">
              <label htmlFor="notebook-plot">Parcela</label>
              <select id="notebook-plot" value={selectedPlotId} onChange={(event) => setSelectedPlotId(event.target.value)}>
                {plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="notebook-campaign">Campaña</label>
              <select id="notebook-campaign" value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
                <option value="">Sin campaña</option>
                {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-actions">
            {campaignId ? (
              <>
                {harvestReportUrl ? <a className="text-button" href={harvestReportUrl}>Informe de esta parcela PDF</a> : null}
                {holdingHarvestReportUrl ? <a className="text-button" href={holdingHarvestReportUrl}>Informe global de campaña PDF</a> : null}
                {holdingHarvestComparisonUrl ? <a className="text-button" href={holdingHarvestComparisonUrl}>Comparativa de campañas PDF</a> : null}
              </>
            ) : (
              <button className="text-button" type="button" disabled>Selecciona una campaña para descargar informes</button>
            )}
          </div>
          <p className="section-copy">Informes privados de cosecha: detalle de parcela, resumen global y comparación de la campaña seleccionada con la anterior de la misma explotación.</p>

          <form className="form-grid notebook-form" onSubmit={submit}>
            <div className="inline-fields">
              <div className="field">
                <label htmlFor="activity-type">Tipo de labor</label>
                <select id="activity-type" value={activityType} onChange={(event) => setActivityType(event.target.value as ActivityType)}>
                  {Object.entries(activityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="activity-occurred-at">Fecha y hora</label>
                <input id="activity-occurred-at" name="occurredAt" type="datetime-local" defaultValue={localDateTimeValue()} required />
              </div>
            </div>

            <div className="inline-fields">
              <div className="field">
                <label htmlFor="activity-area">Superficie afectada (ha)</label>
                <input id="activity-area" name="affectedAreaHa" type="number" min="0" step="0.001" placeholder={selectedPlot?.areaHa ?? 'Opcional'} />
              </div>
              <div className="field">
                <label htmlFor="activity-cost">Coste (€)</label>
                <input id="activity-cost" name="costEur" type="number" min="0" step="0.01" placeholder="0,00" />
              </div>
            </div>

            {(activityType === 'treatment' || activityType === 'fertilization' || activityType === 'irrigation') ? (
              <div className="notebook-context-fields">
                <div className="field">
                  <label htmlFor="activity-product">{activityType === 'irrigation' ? 'Concepto / agua' : 'Producto'}</label>
                  <input id="activity-product" name="productName" type="text" maxLength={240} placeholder={activityType === 'treatment' ? 'Cobre, caolín…' : activityType === 'fertilization' ? 'Abono / fertilizante' : 'Riego'} />
                </div>
                {activityType === 'treatment' ? (
                  <div className="field">
                    <label htmlFor="activity-registration">Nº registro producto</label>
                    <input id="activity-registration" name="productRegistrationNumber" type="text" maxLength={120} placeholder="Opcional" />
                  </div>
                ) : null}
                <div className="inline-fields">
                  <div className="field">
                    <label htmlFor="activity-quantity">Cantidad</label>
                    <input id="activity-quantity" name="quantity" type="number" min="0" step="0.001" />
                  </div>
                  <div className="field">
                    <label htmlFor="activity-unit">Unidad</label>
                    <input id="activity-unit" name="quantityUnit" type="text" maxLength={40} placeholder="L, kg, m³…" />
                  </div>
                </div>
              </div>
            ) : null}

            <div className="field">
              <label htmlFor="activity-notes">Notas</label>
              <textarea id="activity-notes" name="notes" maxLength={4000} placeholder="Qué se ha hecho, observaciones, estado del olivar…" />
            </div>

            {error ? <div className="alert" role="alert">{error}</div> : null}
            {notice ? <div className="alert success" role="status">{notice}</div> : null}

            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar labor'}</button>
            </div>
          </form>
        </div>

        <div className="notebook-summary-grid" aria-label={`Resumen de ${selectedPlot?.name ?? 'la parcela'}`}>
          <article><span>Labores</span><strong>{timelineCounts.activity}</strong><small>registradas</small></article>
          <article><span>Entregas</span><strong>{timelineCounts.delivery}</strong><small>asociadas</small></article>
          <article><span>Rendimientos</span><strong>{timelineCounts.yield_result}</strong><small>resultados</small></article>
          <article><span>Último movimiento</span><strong>{lastTimelineDate}</strong><small>{timelineCounts.all} hitos</small></article>
        </div>

        <div className="section-heading notebook-history-heading">
          <div>
            <h3 className="section-title notebook-history-title">Historia de {selectedPlot?.name ?? 'la parcela'}</h3>
            <p className="section-copy">Labores, entregas y rendimientos en una única línea temporal.</p>
          </div>
          <button className="text-button" type="button" onClick={() => void loadTimeline(selectedPlotId)} disabled={loadingTimeline}>{loadingTimeline ? 'Actualizando…' : 'Actualizar'}</button>
        </div>

        <div className="notebook-filters" role="group" aria-label="Filtrar historia de la parcela">
          {(['all', 'activity', 'delivery', 'yield_result'] as TimelineFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              className={`notebook-filter${timelineFilter === filter ? ' active' : ''}`}
              aria-pressed={timelineFilter === filter}
              onClick={() => setTimelineFilter(filter)}
            >
              {filterLabel(filter)} <span>{timelineCounts[filter]}</span>
            </button>
          ))}
        </div>

        <div className="timeline-list">
          {filteredTimeline.map((item) => (
            <article className="card timeline-item" key={`${item.type}-${item.id}`}>
              <div className={`timeline-dot ${item.type}`} aria-hidden="true" />
              <div className="timeline-copy">
                <div className="timeline-topline">
                  <strong>{timelineTitle(item)}</strong>
                  <time dateTime={item.occurredAt}>{new Date(item.occurredAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</time>
                </div>
                {timelineDetail(item) ? <p>{timelineDetail(item)}</p> : null}
              </div>
            </article>
          ))}
          {!loadingTimeline && filteredTimeline.length === 0 ? (
            <div className="card empty-state"><strong>{timelineFilter === 'all' ? 'La historia empieza aquí' : `Sin ${filterLabel(timelineFilter).toLowerCase()} todavía`}</strong>{timelineFilter === 'all' ? 'Registra la primera labor o asocia una entrega a esta parcela.' : 'Cambia el filtro o registra un nuevo dato en esta parcela.'}</div>
          ) : null}
        </div>

        <p className="notebook-disclaimer">Cuaderno personal V1. Guardar estos datos no equivale por sí mismo a una anotación oficial CUE/SIEX.</p>
      </section>
    </>
  );
}
