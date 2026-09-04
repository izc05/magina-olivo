import { useCallback, useEffect, useMemo, useState } from 'react';

type PlanCode = 'free' | 'featured' | 'premium';
type BillingCycle = 'one_off' | 'monthly' | 'quarterly' | 'yearly';
type FunnelItem = {
  id: string;
  reference: string | null;
  businessName: string;
  category: string;
  municipality: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  requestedPlanCode: PlanCode | null;
  description: string | null;
  websiteUrl: string | null;
  status: string;
  stage: string;
  createdAt: string;
  convertedAt: string | null;
  conversion: {
    destinationId: string | null;
    advertiserId: string | null;
    sponsorshipId: string | null;
    contractId: string | null;
    sponsorshipStatus: string | null;
    contractStatus: string | null;
  };
  metrics30Days: { impressions: number; clicks: number };
  billing: { pendingEntries: number; paidEntries: number };
};

type FunnelResponse = {
  items: FunnelItem[];
  policy: {
    publicActivationRequiresSeparateAction: boolean;
    newDirectoryEntriesStartHiddenAsStale: boolean;
    paymentExecution: boolean;
  };
};

type Plan = { code: PlanCode; name: string; amountCents: number | null; billingCycle: BillingCycle | null };

type LoadState = 'loading' | 'ready' | 'forbidden' | 'error';

const stageLabels: Record<string, string> = {
  application: 'Solicitud',
  approved: 'Aprobada',
  converted: 'Convertida',
  campaign_active: 'Campaña activa',
  contract: 'Contrato',
  payment_pending: 'Cobro pendiente',
  paid: 'Con cobro',
  rejected: 'Rechazada',
};

function euro(cents: number | null): string {
  if (cents === null) return 'Por definir';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body) headers.set('content-type', 'application/json');
  const response = await fetch(url, { ...init, headers, credentials: 'include' });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    try {
      const payload = await response.json() as { error?: { message?: string }; message?: string };
      error.message = payload.error?.message ?? payload.message ?? error.message;
    } catch {
      // Keep HTTP status.
    }
    throw error;
  }
  return response.json() as Promise<T>;
}

export function AdminAdvertisingFunnelPage() {
  const [state, setState] = useState<LoadState>('loading');
  const [items, setItems] = useState<FunnelItem[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [planCode, setPlanCode] = useState<PlanCode>('featured');
  const [createContract, setCreateContract] = useState(false);
  const [amountEuros, setAmountEuros] = useState('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [funnel, options] = await Promise.all([
        requestJson<FunnelResponse>('/api/v1/admin/advertising/funnel'),
        requestJson<{ plans: Plan[] }>('/api/v1/public/advertising/options'),
      ]);
      setItems(funnel.items);
      setPlans(options.plans);
      setSelectedId((current) => current || funnel.items[0]?.id || '');
      setState('ready');
    } catch (reason) {
      const status = (reason as { status?: number }).status;
      if (status === 401 || status === 403) setState('forbidden');
      else {
        setError(reason instanceof Error ? reason.message : 'No se ha podido cargar el embudo comercial.');
        setState('error');
      }
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const pipeline = useMemo(() => ({
    pending: items.filter((item) => item.stage === 'application').length,
    converted: items.filter((item) => ['converted', 'contract', 'campaign_active'].includes(item.stage)).length,
    payment: items.filter((item) => item.stage === 'payment_pending').length,
    paid: items.filter((item) => item.stage === 'paid').length,
  }), [items]);

  useEffect(() => {
    if (!selected) return;
    setPlanCode(selected.requestedPlanCode ?? 'featured');
    setCreateContract(false);
    setAmountEuros('');
  }, [selectedId]);

  async function convertSelected() {
    if (!selected || selected.convertedAt) return;
    let agreedAmountCents: number | undefined;
    if (createContract) {
      const parsed = Number(amountEuros.replace(',', '.'));
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError('Indica un importe válido para crear el contrato.');
        return;
      }
      agreedAmountCents = Math.round(parsed * 100);
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await requestJson(`/api/v1/admin/advertising/applications/${selected.id}/convert`, {
        method: 'POST',
        body: JSON.stringify({
          planCode,
          createContract,
          agreedAmountCents,
          billingCycle: createContract ? billingCycle : undefined,
          notes: `Conversión desde solicitud ${selected.reference ?? selected.id}.`,
        }),
      });
      setNotice('Solicitud convertida en anunciante y campaña borrador. No se ha publicado automáticamente.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido convertir la solicitud.');
    } finally {
      setBusy(false);
    }
  }

  if (state === 'loading') return <main className="funnel-gate" role="status">Abriendo embudo comercial…</main>;
  if (state === 'forbidden') return <Gate title="Acceso comercial requerido" message="Necesitas rol Comercial o Superadmin para revisar este embudo." />;
  if (state === 'error') return <Gate title="No se ha podido abrir" message={error ?? 'Error inesperado.'} />;

  return (
    <div className="funnel-shell">
      <header className="funnel-header">
        <div><a href="/admin" className="funnel-back">← Administración</a><p className="admin-eyebrow">Monetización</p><h1>Embudo comercial</h1><p>De la solicitud pública a campaña, contrato, métricas y cobro.</p></div>
        <div className="funnel-header-actions"><a href="/anunciate" target="_blank" rel="noreferrer">Ver formulario público</a><button onClick={() => void load()} disabled={busy}>Actualizar</button></div>
      </header>

      {notice ? <div className="funnel-notice" role="status">{notice}</div> : null}
      {error ? <div className="funnel-error" role="alert">{error}</div> : null}

      <section className="funnel-kpis">
        <Kpi value={pipeline.pending} label="Solicitudes pendientes" />
        <Kpi value={pipeline.converted} label="Convertidas" />
        <Kpi value={pipeline.payment} label="Cobros pendientes" attention={pipeline.payment > 0} />
        <Kpi value={pipeline.paid} label="Con cobro registrado" />
      </section>

      <section className="funnel-workspace">
        <div className="funnel-list">
          {items.map((item) => (
            <button key={item.id} type="button" className={item.id === selectedId ? 'selected' : ''} onClick={() => setSelectedId(item.id)}>
              <div><strong>{item.businessName}</strong><span className={`funnel-stage stage-${item.stage}`}>{stageLabels[item.stage] ?? item.stage}</span></div>
              <p>{item.municipality ?? 'Sin municipio'} · {item.requestedPlanCode ?? 'sin plan'}</p>
              <small>{item.reference ?? 'Sin referencia'} · {new Date(item.createdAt).toLocaleDateString('es-ES')}</small>
            </button>
          ))}
          {!items.length ? <div className="funnel-empty">Todavía no hay solicitudes publicitarias.</div> : null}
        </div>

        <div className="funnel-detail">
          {selected ? (
            <>
              <div className="funnel-detail-heading"><div><p className="admin-eyebrow">{selected.reference ?? 'Solicitud'}</p><h2>{selected.businessName}</h2><p>{selected.description || 'Sin descripción comercial.'}</p></div><span className={`funnel-stage stage-${selected.stage}`}>{stageLabels[selected.stage] ?? selected.stage}</span></div>

              <div className="funnel-info-grid">
                <Info label="Contacto" value={`${selected.contactName} · ${selected.contactEmail}`} />
                <Info label="Teléfono" value={selected.contactPhone || 'No indicado'} />
                <Info label="Actividad" value={selected.category} />
                <Info label="Municipio" value={selected.municipality || 'No indicado'} />
                <Info label="Plan solicitado" value={selected.requestedPlanCode || 'No indicado'} />
                <Info label="Web" value={selected.websiteUrl || 'No indicada'} />
              </div>

              {selected.convertedAt ? (
                <div className="funnel-converted">
                  <div className="funnel-metric-grid"><Kpi value={selected.metrics30Days.impressions} label="Impresiones · 30 días" /><Kpi value={selected.metrics30Days.clicks} label="Interacciones · 30 días" /><Kpi value={selected.billing.pendingEntries} label="Apuntes pendientes" attention={selected.billing.pendingEntries > 0} /><Kpi value={selected.billing.paidEntries} label="Apuntes pagados" /></div>
                  <div className="funnel-links"><a href="/admin/publicidad">Campañas</a><a href="/admin/finanzas">Contrato y cobros</a><a href="/admin/operaciones#directorio">Revisar ficha pública</a></div>
                  <p className="funnel-safety">La campaña convertida nace en <strong>borrador</strong>. Si la ficha se creó desde cero, queda oculta como <strong>stale</strong> hasta revisión de Operaciones.</p>
                </div>
              ) : selected.status === 'rejected' ? (
                <div className="funnel-safety">Esta solicitud está rechazada y no puede convertirse.</div>
              ) : (
                <div className="funnel-convert-card">
                  <h3>Convertir en anunciante</h3>
                  <p>Genera perfil comercial y campaña borrador. Puedes crear también el contrato si ya existe un importe acordado.</p>
                  <div className="funnel-form-grid">
                    <label>Plan<select value={planCode} onChange={(event) => setPlanCode(event.target.value as PlanCode)}>{plans.map((plan) => <option value={plan.code} key={plan.code}>{plan.name} · {euro(plan.amountCents)}</option>)}</select></label>
                    <label className="funnel-checkbox"><input type="checkbox" checked={createContract} onChange={(event) => setCreateContract(event.target.checked)} /><span>Crear contrato borrador ahora</span></label>
                    {createContract ? <><label>Importe acordado (€)<input inputMode="decimal" value={amountEuros} onChange={(event) => setAmountEuros(event.target.value)} placeholder="0,00" /></label><label>Periodicidad<select value={billingCycle} onChange={(event) => setBillingCycle(event.target.value as BillingCycle)}><option value="one_off">Pago único</option><option value="monthly">Mensual</option><option value="quarterly">Trimestral</option><option value="yearly">Anual</option></select></label></> : null}
                  </div>
                  <button className="funnel-primary" disabled={busy} onClick={() => void convertSelected()}>{busy ? 'Convirtiendo…' : 'Crear campaña borrador'}</button>
                  <small>No mueve dinero, no genera factura fiscal y no activa publicidad.</small>
                </div>
              )}
            </>
          ) : <div className="funnel-empty">Selecciona una solicitud.</div>}
        </div>
      </section>
    </div>
  );
}

function Kpi({ value, label, attention = false }: { value: number; label: string; attention?: boolean }) {
  return <article className={`funnel-kpi${attention ? ' attention' : ''}`}><strong>{value}</strong><span>{label}</span></article>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="funnel-info"><small>{label}</small><strong>{value}</strong></div>;
}

function Gate({ title, message }: { title: string; message: string }) {
  return <main className="funnel-gate"><section><p className="admin-eyebrow">Mágina Olivo</p><h1>{title}</h1><p>{message}</p><a href="/admin">Volver a administración</a></section></main>;
}
