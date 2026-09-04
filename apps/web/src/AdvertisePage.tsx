import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

type PlanCode = 'free' | 'featured' | 'premium';
type CategoryCode =
  | 'cooperative'
  | 'oil_mill'
  | 'machinery'
  | 'workshop'
  | 'harvest'
  | 'nursery'
  | 'irrigation'
  | 'pruning'
  | 'phytosanitary'
  | 'insurance'
  | 'advisory'
  | 'other';

type OptionsResponse = {
  advertisingEnabled: boolean;
  acceptingApplications: boolean;
  plans: Array<{
    code: PlanCode;
    name: string;
    publicLabel: string;
    priority: number;
    amountCents: number | null;
    billingCycle: 'one_off' | 'monthly' | 'quarterly' | 'yearly' | null;
  }>;
  categories: Array<{ code: CategoryCode; label: string }>;
  transparency: string;
};

type SubmitResponse = {
  reference: string;
  status: 'pending';
  duplicate: boolean;
  guidance?: string;
};

const cycleLabels: Record<string, string> = {
  one_off: 'pago único',
  monthly: 'mes',
  quarterly: 'trimestre',
  yearly: 'año',
};

function planPrice(plan: OptionsResponse['plans'][number]): string {
  if (plan.amountCents === null) return 'Precio a consultar';
  const amount = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(plan.amountCents / 100);
  return plan.billingCycle ? `${amount} / ${cycleLabels[plan.billingCycle] ?? plan.billingCycle}` : amount;
}

export function AdvertisePage() {
  const [options, setOptions] = useState<OptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [planCode, setPlanCode] = useState<PlanCode>('featured');
  const [category, setCategory] = useState<CategoryCode>('machinery');
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/v1/public/advertising/options', {
      signal: controller.signal,
      headers: { accept: 'application/json' },
      credentials: 'same-origin',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<OptionsResponse>;
      })
      .then((data) => {
        setOptions(data);
        if (!data.plans.some((plan) => plan.code === planCode)) setPlanCode(data.plans[0]?.code ?? 'free');
        if (!data.categories.some((item) => item.code === category)) setCategory(data.categories[0]?.code ?? 'other');
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError('No se han podido cargar ahora las opciones publicitarias.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const selectedPlan = useMemo(() => options?.plans.find((plan) => plan.code === planCode) ?? null, [options, planCode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) {
      setError('Debes aceptar el tratamiento de estos datos para que podamos gestionar la solicitud.');
      return;
    }
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch('/api/v1/public/advertising/applications', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({
          businessName: String(form.get('businessName') ?? ''),
          category,
          municipality: String(form.get('municipality') ?? '') || null,
          contactName: String(form.get('contactName') ?? ''),
          contactEmail: String(form.get('contactEmail') ?? ''),
          contactPhone: String(form.get('contactPhone') ?? '') || null,
          requestedPlanCode: planCode,
          description: String(form.get('description') ?? '') || null,
          websiteUrl: String(form.get('websiteUrl') ?? '') || null,
          consentAccepted: true,
        }),
      });
      const payload = await response.json() as SubmitResponse & { error?: { message?: string }; message?: string };
      if (!response.ok) throw new Error(payload.error?.message ?? payload.message ?? `HTTP ${response.status}`);
      setResult(payload);
      event.currentTarget.reset();
      setConsent(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido enviar la solicitud.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="advertise-shell" id="main-content">
      <header className="advertise-header">
        <a className="advertise-brand" href="/">
          <img src="/brand/magina-olivo-mark.svg" alt="" />
          <span><strong>Mágina Olivo</strong><small>Sierra Mágina · Jaén</small></span>
        </a>
        <a href="/magina/directorio">Ver empresas y servicios</a>
      </header>

      <section className="advertise-hero">
        <div>
          <p className="eyebrow">Empresas y profesionales del olivar</p>
          <h1>Anuncia tu negocio en Mágina Olivo</h1>
          <p>Solicita una ficha o una posición destacada dentro del directorio agrícola. Revisamos cada alta antes de convertirla en campaña y ninguna solicitud se publica automáticamente.</p>
          <div className="advertise-trust-row">
            <span>✓ Patrocinado siempre identificado</span>
            <span>✓ Sin modificar datos objetivos</span>
            <span>✓ Métricas sin seguimiento personal</span>
          </div>
        </div>
        <aside className="advertise-hero-card">
          <strong>Transparencia comercial</strong>
          <p>El pago puede dar más visibilidad dentro de espacios comerciales, pero nunca altera precio del aceite, meteorología, alertas, noticias ni datos privados de una explotación.</p>
        </aside>
      </section>

      <section className="advertise-section" aria-labelledby="plans-title">
        <div className="advertise-heading">
          <p className="eyebrow">Opciones</p>
          <h2 id="plans-title">Elige cómo quieres aparecer</h2>
          <p>{loading ? 'Cargando planes…' : 'Los importes solo se muestran cuando han sido definidos en el panel comercial.'}</p>
        </div>
        <div className="advertise-plan-grid">
          {(options?.plans ?? []).map((plan) => (
            <button
              type="button"
              key={plan.code}
              className={`advertise-plan${planCode === plan.code ? ' selected' : ''}`}
              onClick={() => setPlanCode(plan.code)}
              aria-pressed={planCode === plan.code}
            >
              <span>{plan.publicLabel}</span>
              <strong>{plan.name}</strong>
              <p>{plan.code === 'free' ? 'Presencia básica en el directorio cuando la ficha sea validada.' : plan.code === 'featured' ? 'Mayor visibilidad en listados comerciales con identificación clara.' : 'Máxima prioridad comercial disponible, siempre marcada como patrocinada.'}</p>
              <small>{planPrice(plan)}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="advertise-section advertise-form-section">
        <div className="advertise-heading">
          <p className="eyebrow">Solicitud</p>
          <h2>Cuéntanos qué negocio quieres mostrar</h2>
          <p>Recibirás una referencia de seguimiento. Aprobar la solicitud crea primero una campaña en borrador; la activación pública es un paso independiente.</p>
        </div>

        {result ? (
          <div className="advertise-success" role="status">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>Solicitud recibida</strong>
              <p>Referencia: <code>{result.reference}</code></p>
              <p>{result.duplicate ? 'Ya existía una solicitud pendiente reciente con los mismos datos y hemos recuperado su referencia.' : 'La revisaremos desde el panel comercial antes de crear cualquier campaña.'}</p>
            </div>
          </div>
        ) : null}
        {error ? <div className="advertise-error" role="alert">{error}</div> : null}

        <form className="advertise-form" onSubmit={submit}>
          <div className="advertise-form-grid">
            <label>Nombre del negocio<input name="businessName" required minLength={2} maxLength={240} autoComplete="organization" /></label>
            <label>Municipio<input name="municipality" maxLength={120} placeholder="Ej. Mancha Real" /></label>
            <label>Actividad<select value={category} onChange={(event) => setCategory(event.target.value as CategoryCode)}>{(options?.categories ?? []).map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
            <label>Plan solicitado<select value={planCode} onChange={(event) => setPlanCode(event.target.value as PlanCode)}>{(options?.plans ?? []).map((plan) => <option key={plan.code} value={plan.code}>{plan.name} · {planPrice(plan)}</option>)}</select></label>
            <label>Persona de contacto<input name="contactName" required minLength={2} maxLength={160} autoComplete="name" /></label>
            <label>Correo<input name="contactEmail" required type="email" maxLength={320} autoComplete="email" /></label>
            <label>Teléfono<input name="contactPhone" maxLength={80} autoComplete="tel" /></label>
            <label>Web pública HTTPS<input name="websiteUrl" type="url" maxLength={2000} placeholder="https://…" /></label>
          </div>
          <label>Descripción del servicio<textarea name="description" maxLength={2000} rows={5} placeholder="Qué haces, zona de servicio y qué quieres destacar." /></label>
          <label className="advertise-consent">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>Acepto que Mágina Olivo trate estos datos para revisar y responder esta solicitud publicitaria. He podido consultar la <a href="/legal/privacidad">política de privacidad</a>.</span>
          </label>
          <div className="advertise-submit-row">
            <div><strong>{selectedPlan?.name ?? 'Plan'}</strong><small>{selectedPlan ? planPrice(selectedPlan) : 'Sin precio definido'}</small></div>
            <button type="submit" disabled={busy || loading || !options?.acceptingApplications}>{busy ? 'Enviando…' : 'Enviar solicitud'}</button>
          </div>
        </form>
      </section>

      <footer className="advertise-footer">
        <p>No envíes contraseñas, claves bancarias ni documentación agrícola privada mediante este formulario.</p>
        <a href="/contacto">Contacto general</a>
      </footer>
    </main>
  );
}
