import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

type PlanCode = 'free' | 'featured' | 'premium';
type BillingCycle = 'one_off' | 'monthly' | 'quarterly' | 'yearly';
type ContractStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
type BillingStatus = 'pending' | 'issued' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
type PaymentMethod = 'manual' | 'bank_transfer' | 'bizum' | 'card' | 'other';

type Overview = {
  administrator: { email: string; roles: string[]; bootstrapSuperadmin: boolean };
  summary: {
    activeContracts: number;
    recurringMonthlyEquivalentCents: number;
    collectedMonthCents: number;
    collectedYearCents: number;
    outstandingCents: number;
    overdueEntries: number;
    renewals30Days: number;
  };
  pricing: Array<{
    planCode: PlanCode; planName: string; publicLabel: string; amountCents: number | null;
    billingCycle: BillingCycle; notes: string | null; updatedAt: string;
  }>;
  advertisers: Array<{
    advertiserId: string; businessName: string; municipality: string | null;
    sponsorshipId: string | null; planCode: PlanCode;
  }>;
  contracts: Array<{
    id: string; advertiserId: string; businessName: string; municipality: string | null;
    sponsorshipId: string | null; planCode: PlanCode; agreedAmountCents: number; currency: string;
    billingCycle: BillingCycle; status: ContractStatus; startsAt: string | null; endsAt: string | null;
    renewalAt: string | null; externalReference: string | null; notes: string | null; updatedAt: string;
  }>;
  billing: Array<{
    id: string; contractId: string; businessName: string; amountCents: number; currency: string;
    status: BillingStatus; dueAt: string | null; paidAt: string | null;
    paymentMethod: PaymentMethod | null; reference: string | null; notes: string | null; createdAt: string;
  }>;
};

type LoadState = 'loading' | 'ready' | 'forbidden' | 'error';

const cycleLabels: Record<BillingCycle, string> = {
  one_off: 'Pago único', monthly: 'Mensual', quarterly: 'Trimestral', yearly: 'Anual',
};

function euro(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return 'Por definir';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function dateLabel(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-ES');
}

function toCents(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
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
      const body = await response.json() as { error?: { message?: string } };
      if (body.error?.message) error.message = body.error.message;
    } catch {
      // Keep the HTTP message.
    }
    throw error;
  }
  return await response.json() as T;
}

export function AdminFinancePage() {
  const [state, setState] = useState<LoadState>('loading');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [advertiserId, setAdvertiserId] = useState('');
  const [contractPlan, setContractPlan] = useState<PlanCode>('featured');
  const [contractAmount, setContractAmount] = useState('');
  const [contractCycle, setContractCycle] = useState<BillingCycle>('monthly');
  const [contractStatus, setContractStatus] = useState<ContractStatus>('draft');
  const [contractStart, setContractStart] = useState('');
  const [contractEnd, setContractEnd] = useState('');
  const [contractRenewal, setContractRenewal] = useState('');

  const [billingContractId, setBillingContractId] = useState('');
  const [billingAmount, setBillingAmount] = useState('');
  const [billingStatus, setBillingStatus] = useState<BillingStatus>('issued');
  const [billingDue, setBillingDue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await requestJson<Overview>('/api/v1/admin/finance/overview');
      setOverview(result);
      setAdvertiserId((current) => current || result.advertisers[0]?.advertiserId || '');
      setBillingContractId((current) => current || result.contracts[0]?.id || '');
      setState('ready');
    } catch (reason) {
      const status = (reason as { status?: number }).status;
      if (status === 401 || status === 403) setState('forbidden');
      else {
        setState('error');
        setError(reason instanceof Error ? reason.message : 'No se ha podido cargar economía de publicidad.');
      }
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeContracts = useMemo(
    () => overview?.contracts.filter((contract) => contract.status === 'active' || contract.status === 'draft') ?? [],
    [overview],
  );

  async function savePricing(planCode: PlanCode, amount: string, billingCycle: BillingCycle) {
    setBusy(true); setNotice(null); setError(null);
    try {
      await requestJson(`/api/v1/admin/finance/pricing/${planCode}`, {
        method: 'PATCH',
        body: JSON.stringify({ amountCents: toCents(amount), billingCycle }),
      });
      setNotice('Condiciones del plan actualizadas.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido actualizar el plan.');
    } finally { setBusy(false); }
  }

  async function createContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cents = toCents(contractAmount);
    if (!advertiserId || cents === null) {
      setError('Indica un anunciante y un importe válido.');
      return;
    }
    const advertiser = overview?.advertisers.find((item) => item.advertiserId === advertiserId);
    setBusy(true); setNotice(null); setError(null);
    try {
      await requestJson('/api/v1/admin/finance/contracts', {
        method: 'POST',
        body: JSON.stringify({
          advertiserId,
          sponsorshipId: advertiser?.sponsorshipId ?? null,
          planCode: contractPlan,
          agreedAmountCents: cents,
          billingCycle: contractCycle,
          status: contractStatus,
          startsAt: contractStart ? new Date(contractStart).toISOString() : null,
          endsAt: contractEnd ? new Date(contractEnd).toISOString() : null,
          renewalAt: contractRenewal ? new Date(contractRenewal).toISOString() : null,
        }),
      });
      setNotice('Acuerdo comercial registrado.');
      setContractAmount(''); setContractStart(''); setContractEnd(''); setContractRenewal('');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido crear el acuerdo.');
    } finally { setBusy(false); }
  }

  async function changeContractStatus(contractId: string, status: ContractStatus) {
    setBusy(true); setNotice(null); setError(null);
    try {
      await requestJson(`/api/v1/admin/finance/contracts/${contractId}`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      });
      setNotice('Estado del acuerdo actualizado.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido actualizar el acuerdo.');
    } finally { setBusy(false); }
  }

  async function createBilling(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cents = toCents(billingAmount);
    if (!billingContractId || cents === null) {
      setError('Selecciona un acuerdo e indica un importe válido.');
      return;
    }
    setBusy(true); setNotice(null); setError(null);
    try {
      await requestJson('/api/v1/admin/finance/billing', {
        method: 'POST',
        body: JSON.stringify({
          contractId: billingContractId,
          amountCents: cents,
          status: billingStatus,
          dueAt: billingDue ? new Date(billingDue).toISOString() : null,
          paymentMethod: billingStatus === 'paid' ? paymentMethod : null,
        }),
      });
      setNotice('Apunte de cobro registrado.');
      setBillingAmount(''); setBillingDue('');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido registrar el cobro.');
    } finally { setBusy(false); }
  }

  async function changeBillingStatus(entryId: string, status: BillingStatus) {
    setBusy(true); setNotice(null); setError(null);
    try {
      await requestJson(`/api/v1/admin/finance/billing/${entryId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, paymentMethod: status === 'paid' ? 'manual' : null }),
      });
      setNotice(status === 'paid' ? 'Cobro marcado como recibido.' : 'Estado de cobro actualizado.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido actualizar el cobro.');
    } finally { setBusy(false); }
  }

  if (state === 'loading') return <main className="finance-gate" role="status">Abriendo economía de publicidad…</main>;
  if (state === 'forbidden') return <Gate title="Acceso comercial requerido" message="Esta zona requiere Superadmin o el rol comercial delegado." />;
  if (state === 'error' || !overview) return <Gate title="No se ha podido abrir el módulo" message={error ?? 'Error inesperado.'} />;

  return (
    <div className="finance-shell">
      <header className="finance-header">
        <div>
          <a href="/admin" className="finance-back">← Centro de mando</a>
          <p className="finance-eyebrow">Monetización</p>
          <h1>Economía de publicidad</h1>
          <p>Control interno de precios, acuerdos, cobros y renovaciones. No ejecuta pagos ni genera facturas fiscales.</p>
        </div>
        <div className="finance-role-pill">{overview.administrator.bootstrapSuperadmin ? 'Superadmin' : 'Rol comercial'}</div>
      </header>

      {notice ? <div className="finance-notice" role="status">{notice}</div> : null}
      {error ? <div className="finance-error" role="alert">{error}</div> : null}

      <section className="finance-kpis" aria-label="Resumen económico">
        <Kpi label="MRR equivalente" value={euro(overview.summary.recurringMonthlyEquivalentCents)} />
        <Kpi label="Cobrado este mes" value={euro(overview.summary.collectedMonthCents)} good />
        <Kpi label="Cobrado este año" value={euro(overview.summary.collectedYearCents)} />
        <Kpi label="Pendiente de cobro" value={euro(overview.summary.outstandingCents)} warn={overview.summary.outstandingCents > 0} />
        <Kpi label="Acuerdos activos" value={String(overview.summary.activeContracts)} />
        <Kpi label="Vencidos" value={String(overview.summary.overdueEntries)} warn={overview.summary.overdueEntries > 0} />
        <Kpi label="Renovaciones · 30 días" value={String(overview.summary.renewals30Days)} warn={overview.summary.renewals30Days > 0} />
      </section>

      <section className="finance-section">
        <div className="finance-heading"><div><p className="finance-eyebrow">Tarifas</p><h2>Planes comerciales</h2></div><small>Sin precio predeterminado hasta que tú lo fijes</small></div>
        <div className="finance-plan-grid">
          {overview.pricing.map((plan) => <PricingCard key={plan.planCode} plan={plan} disabled={busy} onSave={savePricing} />)}
        </div>
      </section>

      <section className="finance-section finance-two-columns">
        <form className="finance-card finance-form" onSubmit={createContract}>
          <div className="finance-card-title"><h2>Nuevo acuerdo</h2><span>Contrato interno</span></div>
          <label>Anunciante<select value={advertiserId} onChange={(e) => setAdvertiserId(e.target.value)} required>
            {overview.advertisers.map((item) => <option key={item.advertiserId} value={item.advertiserId}>{item.businessName}{item.municipality ? ` · ${item.municipality}` : ''}</option>)}
          </select></label>
          <div className="finance-row">
            <label>Plan<select value={contractPlan} onChange={(e) => setContractPlan(e.target.value as PlanCode)}><option value="free">Gratis</option><option value="featured">Destacado</option><option value="premium">Premium</option></select></label>
            <label>Importe acordado (€)<input inputMode="decimal" value={contractAmount} onChange={(e) => setContractAmount(e.target.value)} placeholder="0,00" required /></label>
          </div>
          <div className="finance-row">
            <label>Periodicidad<select value={contractCycle} onChange={(e) => setContractCycle(e.target.value as BillingCycle)}>{Object.entries(cycleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Estado<select value={contractStatus} onChange={(e) => setContractStatus(e.target.value as ContractStatus)}><option value="draft">Borrador</option><option value="active">Activo</option><option value="paused">Pausado</option><option value="completed">Finalizado</option><option value="cancelled">Cancelado</option></select></label>
          </div>
          <div className="finance-row"><label>Inicio<input type="date" value={contractStart} onChange={(e) => setContractStart(e.target.value)} /></label><label>Fin<input type="date" value={contractEnd} onChange={(e) => setContractEnd(e.target.value)} /></label></div>
          <label>Renovación prevista<input type="date" value={contractRenewal} onChange={(e) => setContractRenewal(e.target.value)} /></label>
          <button type="submit" disabled={busy || !advertiserId}>{busy ? 'Guardando…' : 'Registrar acuerdo'}</button>
        </form>

        <form className="finance-card finance-form" onSubmit={createBilling}>
          <div className="finance-card-title"><h2>Registrar cobro</h2><span>Control interno</span></div>
          <label>Acuerdo<select value={billingContractId} onChange={(e) => setBillingContractId(e.target.value)} required>
            {activeContracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.businessName} · {euro(contract.agreedAmountCents)}</option>)}
          </select></label>
          <div className="finance-row">
            <label>Importe (€)<input inputMode="decimal" value={billingAmount} onChange={(e) => setBillingAmount(e.target.value)} placeholder="0,00" required /></label>
            <label>Estado<select value={billingStatus} onChange={(e) => setBillingStatus(e.target.value as BillingStatus)}><option value="pending">Pendiente</option><option value="issued">Emitido</option><option value="paid">Pagado</option><option value="overdue">Vencido</option><option value="cancelled">Cancelado</option><option value="refunded">Devuelto</option></select></label>
          </div>
          <label>Vencimiento<input type="date" value={billingDue} onChange={(e) => setBillingDue(e.target.value)} /></label>
          {billingStatus === 'paid' ? <label>Medio registrado<select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}><option value="bank_transfer">Transferencia</option><option value="bizum">Bizum</option><option value="card">Tarjeta</option><option value="manual">Manual</option><option value="other">Otro</option></select></label> : null}
          <p className="finance-help">Marcar “pagado” solo registra el estado; no mueve dinero.</p>
          <button type="submit" disabled={busy || !billingContractId}>{busy ? 'Guardando…' : 'Registrar apunte'}</button>
        </form>
      </section>

      <section className="finance-section">
        <div className="finance-heading"><div><p className="finance-eyebrow">Acuerdos</p><h2>Contratos y renovaciones</h2></div><span>{overview.contracts.length} registros</span></div>
        <div className="finance-table-card"><table><thead><tr><th>Negocio</th><th>Plan</th><th>Importe</th><th>Estado</th><th>Renovación</th><th>Acción</th></tr></thead><tbody>
          {overview.contracts.map((contract) => <tr key={contract.id}><td><strong>{contract.businessName}</strong><small>{contract.municipality ?? 'Sierra Mágina'}</small></td><td>{contract.planCode}</td><td>{euro(contract.agreedAmountCents)}<small>{cycleLabels[contract.billingCycle]}</small></td><td><Status status={contract.status} /></td><td>{dateLabel(contract.renewalAt)}</td><td>{contract.status === 'active' ? <button type="button" disabled={busy} onClick={() => void changeContractStatus(contract.id, 'paused')}>Pausar</button> : contract.status === 'draft' || contract.status === 'paused' ? <button type="button" disabled={busy} onClick={() => void changeContractStatus(contract.id, 'active')}>Activar</button> : '—'}</td></tr>)}
        </tbody></table>{!overview.contracts.length ? <p className="finance-empty">Todavía no hay acuerdos comerciales.</p> : null}</div>
      </section>

      <section className="finance-section">
        <div className="finance-heading"><div><p className="finance-eyebrow">Cobros</p><h2>Seguimiento de facturación</h2></div><span>{overview.billing.length} apuntes</span></div>
        <div className="finance-table-card"><table><thead><tr><th>Negocio</th><th>Importe</th><th>Estado</th><th>Vence</th><th>Pagado</th><th>Acción</th></tr></thead><tbody>
          {overview.billing.map((entry) => <tr key={entry.id}><td><strong>{entry.businessName}</strong></td><td>{euro(entry.amountCents)}</td><td><Status status={entry.status} /></td><td>{dateLabel(entry.dueAt)}</td><td>{dateLabel(entry.paidAt)}</td><td>{entry.status === 'issued' || entry.status === 'pending' || entry.status === 'overdue' ? <button type="button" disabled={busy} onClick={() => void changeBillingStatus(entry.id, 'paid')}>Marcar pagado</button> : '—'}</td></tr>)}
        </tbody></table>{!overview.billing.length ? <p className="finance-empty">Todavía no hay apuntes de cobro.</p> : null}</div>
      </section>

      <footer className="finance-footer"><a href="/admin/publicidad">Gestionar campañas</a><a href="/admin/roles">Roles administrativos</a></footer>
    </div>
  );
}

function Kpi({ label, value, good = false, warn = false }: { label: string; value: string; good?: boolean; warn?: boolean }) {
  return <article className={`finance-kpi${good ? ' good' : ''}${warn ? ' warn' : ''}`}><strong>{value}</strong><span>{label}</span></article>;
}

function Status({ status }: { status: string }) {
  return <span className={`finance-status finance-status-${status}`}>{status}</span>;
}

function PricingCard({ plan, disabled, onSave }: {
  plan: Overview['pricing'][number]; disabled: boolean;
  onSave: (planCode: PlanCode, amount: string, billingCycle: BillingCycle) => Promise<void>;
}) {
  const [amount, setAmount] = useState(plan.amountCents === null ? '' : String((plan.amountCents / 100).toFixed(2)).replace('.', ','));
  const [cycle, setCycle] = useState<BillingCycle>(plan.billingCycle);
  useEffect(() => {
    setAmount(plan.amountCents === null ? '' : String((plan.amountCents / 100).toFixed(2)).replace('.', ','));
    setCycle(plan.billingCycle);
  }, [plan.amountCents, plan.billingCycle]);
  return <article className={`finance-card finance-pricing finance-pricing-${plan.planCode}`}><div><p>{plan.publicLabel}</p><h3>{plan.planName}</h3><strong>{euro(plan.amountCents)}</strong></div><label>Precio (€)<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Por definir" /></label><label>Periodicidad<select value={cycle} onChange={(e) => setCycle(e.target.value as BillingCycle)}>{Object.entries(cycleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="button" disabled={disabled} onClick={() => void onSave(plan.planCode, amount, cycle)}>Guardar tarifa</button></article>;
}

function Gate({ title, message }: { title: string; message: string }) {
  return <main className="finance-gate"><section><p className="finance-eyebrow">Mágina Olivo</p><h1>{title}</h1><p>{message}</p><a href="/admin">Volver al centro de mando</a></section></main>;
}
