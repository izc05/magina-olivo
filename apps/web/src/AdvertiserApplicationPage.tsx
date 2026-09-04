import { useEffect, useState } from 'react';

type AdvertisingCategory =
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

type Plan = {
  code: 'free' | 'featured' | 'premium';
  name: string;
  publicLabel: string;
  priority: number;
};

type Application = {
  id: string;
  businessName: string;
  category: AdvertisingCategory;
  municipality: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  requestedPlanCode: 'free' | 'featured' | 'premium' | null;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  reviewNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

const categoryLabels: Record<AdvertisingCategory, string> = {
  cooperative: 'Cooperativa',
  oil_mill: 'Almazara',
  machinery: 'Maquinaria agrícola',
  workshop: 'Taller',
  harvest: 'Recolección',
  nursery: 'Vivero',
  irrigation: 'Riego',
  pruning: 'Poda',
  phytosanitary: 'Fitosanitarios',
  insurance: 'Seguros',
  advisory: 'Asesoría',
  other: 'Otro servicio',
};

const statusLabels: Record<Application['status'], string> = {
  pending: 'Pendiente de revisión',
  approved: 'Aprobada',
  rejected: 'No aprobada',
  withdrawn: 'Retirada',
};

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
}

export function AdvertiserApplicationPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState<AdvertisingCategory>('workshop');
  const [municipality, setMunicipality] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [requestedPlanCode, setRequestedPlanCode] = useState<'free' | 'featured' | 'premium'>('free');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void fetch('/api/v1/public/advertising/application-config', {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{ enabled: boolean; plans: Plan[] }>;
    }).then(async (config) => {
      if (controller.signal.aborted) return;
      setEnabled(config.enabled);
      setPlans(config.plans);
      if (config.plans.some((plan) => plan.code === 'free')) setRequestedPlanCode('free');
      if (!config.enabled) {
        setAuthenticated(null);
        return;
      }

      const response = await fetch('/api/v1/advertising/applications/me', {
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
        signal: controller.signal,
      });
      if (response.status === 401) {
        setAuthenticated(false);
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json() as { applications: Application[] };
      setAuthenticated(true);
      setApplications(result.applications);
    }).catch((reason) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError('No se ha podido cargar el alta de empresas.');
    });

    return () => controller.abort();
  }, []);

  async function submitApplication() {
    setError(null);
    setMessage(null);
    if (!businessName.trim() || !contactName.trim()) {
      setError('Indica el nombre del negocio y la persona de contacto.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/v1/advertising/applications', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          businessName: businessName.trim(),
          category,
          municipality: municipality.trim() || null,
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim() || null,
          requestedPlanCode,
          description: description.trim() || null,
        }),
      });

      if (response.status === 401) {
        setAuthenticated(false);
        throw new Error('Debes iniciar sesión antes de enviar la solicitud.');
      }

      const payload = await response.json().catch(() => null) as {
        application?: Application;
        error?: { message?: string };
      } | null;
      if (!response.ok || !payload?.application) {
        throw new Error(payload?.error?.message ?? `No se ha podido enviar la solicitud (HTTP ${response.status}).`);
      }

      setAuthenticated(true);
      setApplications((current) => [payload.application!, ...current]);
      setBusinessName('');
      setMunicipality('');
      setContactName('');
      setContactPhone('');
      setDescription('');
      setRequestedPlanCode('free');
      setMessage('Solicitud enviada. Queda pendiente de revisión por Mágina Olivo.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido enviar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="advertiser-application-shell" id="main-content">
      <header className="advertiser-application-header">
        <a className="directory-brand" href="/" aria-label="Volver a Mágina Olivo">
          <img src="/brand/magina-olivo-mark.svg" alt="" />
          <span><strong>Mágina Olivo</strong><small>Sierra Mágina · Jaén</small></span>
        </a>
        <a className="directory-back" href="/magina/directorio">Empresas y servicios</a>
      </header>

      <section className="advertiser-application-hero">
        <p className="eyebrow">Empresas · Mágina Olivo</p>
        <h1>Solicita tu ficha de empresa</h1>
        <p>Registra una solicitud para aparecer en el directorio agrícola. Todas las altas se revisan antes de publicarse y pagar por visibilidad nunca altera la información objetiva de Mágina Olivo.</p>
      </section>

      {enabled === null && !error ? <div className="advertiser-application-notice">Comprobando disponibilidad…</div> : null}

      {enabled === false ? (
        <section className="advertiser-application-closed">
          <strong>El alta comercial todavía no está abierta.</strong>
          <p>Esta función permanece desactivada durante el piloto. El directorio y el resto de Mágina Olivo siguen funcionando con normalidad.</p>
        </section>
      ) : null}

      {enabled ? (
        <div className="advertiser-application-layout">
          <section className="advertiser-application-card" aria-labelledby="application-form-title">
            <div className="advertiser-application-card-heading">
              <p className="eyebrow">Nueva solicitud</p>
              <h2 id="application-form-title">Datos del negocio</h2>
            </div>

            {authenticated === false ? (
              <div className="advertiser-auth-required">
                <strong>Necesitas iniciar sesión.</strong>
                <p>El email de contacto se obtiene de tu cuenta para evitar solicitudes con direcciones falsas.</p>
                <a href="/">Ir al acceso de Mágina Olivo</a>
              </div>
            ) : null}

            <div className="advertiser-application-fields">
              <label><span>Nombre de la empresa</span><input value={businessName} maxLength={180} onChange={(event) => setBusinessName(event.target.value)} /></label>
              <label><span>Categoría</span><select value={category} onChange={(event) => setCategory(event.target.value as AdvertisingCategory)}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label><span>Municipio principal</span><input value={municipality} maxLength={120} placeholder="Ej. Mancha Real" onChange={(event) => setMunicipality(event.target.value)} /></label>
              <label><span>Persona de contacto</span><input value={contactName} maxLength={160} onChange={(event) => setContactName(event.target.value)} /></label>
              <label><span>Teléfono</span><input value={contactPhone} maxLength={40} inputMode="tel" onChange={(event) => setContactPhone(event.target.value)} /></label>
              <label>
                <span>Plan que te interesa</span>
                <select value={requestedPlanCode} onChange={(event) => setRequestedPlanCode(event.target.value as 'free' | 'featured' | 'premium')}>
                  {plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}
                </select>
                <small>La solicitud de plan no activa ningún cobro ni patrocinio automáticamente.</small>
              </label>
              <label className="advertiser-application-wide"><span>Descripción</span><textarea value={description} maxLength={1200} rows={5} placeholder="Qué servicios ofreces al agricultor…" onChange={(event) => setDescription(event.target.value)} /></label>
            </div>

            <div className="advertiser-application-email-note">El email de contacto será el email verificado de la cuenta con la que has iniciado sesión.</div>
            {message ? <div className="advertiser-application-success" role="status">{message}</div> : null}
            {error ? <div className="advertiser-application-error" role="alert">{error}</div> : null}
            <button className="advertiser-application-submit" type="button" disabled={submitting || authenticated === false} onClick={() => void submitApplication()}>{submitting ? 'Enviando…' : 'Enviar solicitud'}</button>
          </section>

          <aside className="advertiser-application-card" aria-labelledby="application-status-title">
            <div className="advertiser-application-card-heading">
              <p className="eyebrow">Seguimiento</p>
              <h2 id="application-status-title">Tus solicitudes</h2>
            </div>
            {applications.length === 0 ? <p className="advertiser-application-empty">No hay solicitudes asociadas a esta cuenta.</p> : (
              <div className="advertiser-application-history">
                {applications.map((application) => (
                  <article key={application.id}>
                    <div><strong>{application.businessName}</strong><span className={`application-status ${application.status}`}>{statusLabels[application.status]}</span></div>
                    <p>{categoryLabels[application.category]}{application.municipality ? ` · ${application.municipality}` : ''}</p>
                    <small>Enviada el {formatDate(application.createdAt)} · Plan: {application.requestedPlanCode ?? 'sin seleccionar'}</small>
                    {application.reviewNotes ? <p className="application-review-note">Revisión: {application.reviewNotes}</p> : null}
                  </article>
                ))}
              </div>
            )}
          </aside>
        </div>
      ) : null}

      {error && enabled !== true ? <div className="advertiser-application-error" role="alert">{error}</div> : null}
    </main>
  );
}
