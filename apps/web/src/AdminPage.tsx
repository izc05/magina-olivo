import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

type Dashboard = {
  administrator: { email: string };
  advertisingEnabled: boolean;
  agriculture: {
    usersWithHolding: number;
    activeHoldings: number;
    activeFarms: number;
    activePlots: number;
    openCampaigns: number;
  };
  publicContent: { directoryEntries: number };
  advertising: {
    activeAdvertisers: number;
    activeSponsorships: number;
    pendingApplications: number;
    eventsLast30Days: number;
  };
  system: { api: string; database: string };
};

type AdvertisingOption = {
  id: string;
  name: string;
  municipality: string | null;
  province: string | null;
};

type Plan = {
  code: 'free' | 'featured' | 'premium';
  name: string;
  publicLabel: string;
  priority: number;
};

type AdvertisingCampaign = {
  advertiserId: string;
  destinationId: string;
  businessName: string;
  municipality: string | null;
  category: string;
  description: string | null;
  profileStatus: string;
  sponsorshipId: string | null;
  planCode: 'free' | 'featured' | 'premium';
  sponsorshipStatus: string | null;
  startsAt: string | null;
  endsAt: string | null;
  publicLabel: string | null;
  priorityOverride: number | null;
  metrics30Days: { events: number; impressions: number; clicks: number };
};

type Application = {
  id: string;
  businessName: string;
  category: string;
  municipality: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  requestedPlanCode: 'free' | 'featured' | 'premium' | null;
  description: string | null;
  status: string;
  createdAt: string;
};

type LoadState = 'loading' | 'ready' | 'forbidden' | 'error';

const categories = [
  ['cooperative', 'Cooperativa'],
  ['oil_mill', 'Almazara'],
  ['machinery', 'Maquinaria'],
  ['workshop', 'Taller'],
  ['harvest', 'Recolección'],
  ['nursery', 'Vivero'],
  ['irrigation', 'Riego'],
  ['pruning', 'Poda'],
  ['phytosanitary', 'Fitosanitarios'],
  ['insurance', 'Seguros'],
  ['advisory', 'Asesoría'],
  ['other', 'Otros'],
] as const;

function formatDate(value: string | null): string {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sin fecha' : date.toLocaleDateString('es-ES');
}

async function adminRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
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
      // Keep generic HTTP error.
    }
    throw error;
  }
  return await response.json() as T;
}

export function AdminPage() {
  const [state, setState] = useState<LoadState>('loading');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [destinations, setDestinations] = useState<AdvertisingOption[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [campaigns, setCampaigns] = useState<AdvertisingCampaign[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [destinationId, setDestinationId] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number][0]>('cooperative');
  const [planCode, setPlanCode] = useState<Plan['code']>('featured');
  const [campaignStatus, setCampaignStatus] = useState<'draft' | 'pending' | 'active' | 'paused'>('active');
  const [publicLabel, setPublicLabel] = useState('Patrocinado');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [dashboardResult, optionResult, campaignResult, applicationResult] = await Promise.all([
        adminRequest<Dashboard>('/api/v1/admin/dashboard'),
        adminRequest<{ destinations: AdvertisingOption[]; plans: Plan[] }>('/api/v1/admin/advertising/options'),
        adminRequest<{ items: AdvertisingCampaign[] }>('/api/v1/admin/advertising/campaigns'),
        adminRequest<{ items: Application[] }>('/api/v1/admin/advertising/applications'),
      ]);
      setDashboard(dashboardResult);
      setDestinations(optionResult.destinations);
      setPlans(optionResult.plans);
      setCampaigns(campaignResult.items);
      setApplications(applicationResult.items);
      setDestinationId((current) => current || optionResult.destinations[0]?.id || '');
      setState('ready');
    } catch (reason) {
      const status = (reason as { status?: number }).status;
      if (status === 401 || status === 403) {
        setState('forbidden');
        return;
      }
      setError(reason instanceof Error ? reason.message : 'No se ha podido cargar el panel.');
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingApplications = useMemo(
    () => applications.filter((application) => application.status === 'pending'),
    [applications],
  );

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!destinationId) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await adminRequest('/api/v1/admin/advertising/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          destinationId,
          category,
          planCode,
          status: campaignStatus,
          publicLabel,
          description: description || undefined,
          phone: phone || undefined,
          whatsappPhone: whatsappPhone || undefined,
          contactEmail: contactEmail || undefined,
          startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
          endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
        }),
      });
      setNotice('Campaña publicitaria guardada.');
      setDescription('');
      setPhone('');
      setWhatsappPhone('');
      setContactEmail('');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido guardar la campaña.');
    } finally {
      setBusy(false);
    }
  }

  async function changeSponsorshipStatus(sponsorshipId: string, status: 'active' | 'paused') {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await adminRequest(`/api/v1/admin/advertising/sponsorships/${sponsorshipId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setNotice(status === 'active' ? 'Patrocinio activado.' : 'Patrocinio pausado.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido actualizar el patrocinio.');
    } finally {
      setBusy(false);
    }
  }

  async function reviewApplication(applicationId: string, status: 'approved' | 'rejected') {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await adminRequest(`/api/v1/admin/advertising/applications/${applicationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setNotice(status === 'approved' ? 'Solicitud aprobada.' : 'Solicitud rechazada.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido revisar la solicitud.');
    } finally {
      setBusy(false);
    }
  }

  if (state === 'loading') {
    return <main className="admin-loading" role="status">Abriendo panel de gestión…</main>;
  }

  if (state === 'forbidden') {
    return (
      <main className="admin-gate">
        <section className="admin-gate-card">
          <p className="admin-eyebrow">Mágina Olivo</p>
          <h1>Panel privado</h1>
          <p>Esta zona requiere una sesión autorizada como administrador de la plataforma.</p>
          <a className="admin-primary-link" href="/">Volver a Mágina Olivo</a>
        </section>
      </main>
    );
  }

  if (state === 'error' || !dashboard) {
    return (
      <main className="admin-gate">
        <section className="admin-gate-card">
          <h1>No se ha podido abrir el panel</h1>
          <p>{error ?? 'Error inesperado.'}</p>
          <button type="button" className="admin-primary-button" onClick={() => void load()}>Reintentar</button>
        </section>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a href="/" className="admin-brand">
          <span className="admin-brand-mark">MO</span>
          <span><strong>Mágina Olivo</strong><small>Administración</small></span>
        </a>
        <nav aria-label="Secciones de administración">
          <a href="#resumen">Resumen</a>
          <a href="#publicidad">Publicidad</a>
          <a href="#solicitudes">Solicitudes</a>
          <a href="#contenido">Contenido</a>
          <a href="#sistema">Sistema</a>
        </nav>
        <div className="admin-sidebar-footer">
          <small>Administrador</small>
          <span>{dashboard.administrator.email}</span>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="admin-eyebrow">Control general</p>
            <h1>Panel de gestión</h1>
          </div>
          <div className={`admin-live-pill ${dashboard.advertisingEnabled ? 'is-live' : ''}`}>
            <span aria-hidden="true" /> Publicidad {dashboard.advertisingEnabled ? 'visible' : 'desactivada'}
          </div>
        </header>

        {notice ? <div className="admin-notice" role="status">{notice}</div> : null}
        {error ? <div className="admin-error" role="alert">{error}</div> : null}

        <section id="resumen" className="admin-section">
          <div className="admin-section-heading">
            <div><p className="admin-eyebrow">Hoy</p><h2>Resumen de Mágina Olivo</h2></div>
            <button type="button" className="admin-ghost-button" onClick={() => void load()} disabled={busy}>Actualizar</button>
          </div>
          <div className="admin-stat-grid">
            <Stat value={dashboard.agriculture.usersWithHolding} label="Usuarios con explotación" />
            <Stat value={dashboard.agriculture.activeHoldings} label="Explotaciones" />
            <Stat value={dashboard.agriculture.activePlots} label="Parcelas" />
            <Stat value={dashboard.agriculture.openCampaigns} label="Campañas abiertas" />
            <Stat value={dashboard.advertising.activeAdvertisers} label="Anunciantes activos" emphasis />
            <Stat value={dashboard.advertising.activeSponsorships} label="Patrocinios activos" emphasis />
            <Stat value={dashboard.advertising.pendingApplications} label="Solicitudes pendientes" />
            <Stat value={dashboard.advertising.eventsLast30Days} label="Interacciones publicitarias · 30 días" />
          </div>
        </section>

        <section id="publicidad" className="admin-section">
          <div className="admin-section-heading">
            <div><p className="admin-eyebrow">Monetización</p><h2>Publicidad y patrocinios</h2><p>Gestiona quién aparece destacado y con qué plan. El contenido patrocinado sigue identificado como tal.</p></div>
          </div>

          <div className="admin-two-column">
            <form className="admin-card admin-form" onSubmit={createCampaign}>
              <div className="admin-card-heading"><h3>Nueva campaña</h3><span>Directorio</span></div>
              <label>Negocio
                <select value={destinationId} onChange={(event) => setDestinationId(event.target.value)} required>
                  {destinations.map((destination) => (
                    <option key={destination.id} value={destination.id}>{destination.name}{destination.municipality ? ` · ${destination.municipality}` : ''}</option>
                  ))}
                </select>
              </label>
              <div className="admin-form-row">
                <label>Categoría
                  <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
                    {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label>Plan
                  <select value={planCode} onChange={(event) => setPlanCode(event.target.value as Plan['code'])}>
                    {plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}
                  </select>
                </label>
              </div>
              <div className="admin-form-row">
                <label>Estado
                  <select value={campaignStatus} onChange={(event) => setCampaignStatus(event.target.value as typeof campaignStatus)}>
                    <option value="active">Activo</option>
                    <option value="pending">Pendiente</option>
                    <option value="draft">Borrador</option>
                    <option value="paused">Pausado</option>
                  </select>
                </label>
                <label>Etiqueta pública
                  <input value={publicLabel} onChange={(event) => setPublicLabel(event.target.value)} maxLength={80} />
                </label>
              </div>
              <label>Descripción comercial
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={2000} placeholder="Servicio, ventaja o propuesta del negocio." />
              </label>
              <div className="admin-form-row">
                <label>Teléfono<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
                <label>WhatsApp<input value={whatsappPhone} onChange={(event) => setWhatsappPhone(event.target.value)} /></label>
              </div>
              <label>Correo de contacto<input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} /></label>
              <div className="admin-form-row">
                <label>Inicio<input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label>
                <label>Fin<input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></label>
              </div>
              <button className="admin-primary-button" type="submit" disabled={busy || !destinationId}>{busy ? 'Guardando…' : 'Guardar campaña'}</button>
            </form>

            <div className="admin-card">
              <div className="admin-card-heading"><h3>Planes</h3><span>Prioridad</span></div>
              <div className="admin-plan-list">
                {plans.map((plan) => (
                  <div key={plan.code} className={`admin-plan admin-plan-${plan.code}`}>
                    <div><strong>{plan.name}</strong><small>{plan.publicLabel}</small></div>
                    <span>{plan.priority}</span>
                  </div>
                ))}
              </div>
              <p className="admin-help">La prioridad comercial ordena la visibilidad patrocinada; nunca altera precios de aceite, meteorología, alertas, noticias ni datos privados.</p>
            </div>
          </div>

          <div className="admin-card admin-table-card">
            <div className="admin-card-heading"><h3>Campañas y anunciantes</h3><span>{campaigns.length} fichas</span></div>
            {campaigns.length ? (
              <div className="admin-table-wrap">
                <table>
                  <thead><tr><th>Negocio</th><th>Plan</th><th>Estado</th><th>Periodo</th><th>30 días</th><th>Acción</th></tr></thead>
                  <tbody>
                    {campaigns.map((campaign) => (
                      <tr key={campaign.advertiserId}>
                        <td><strong>{campaign.businessName}</strong><small>{campaign.municipality ?? 'Sierra Mágina'} · {campaign.category}</small></td>
                        <td><span className={`admin-badge admin-badge-${campaign.planCode}`}>{campaign.planCode}</span></td>
                        <td>{campaign.sponsorshipStatus ?? campaign.profileStatus}</td>
                        <td>{formatDate(campaign.startsAt)} → {formatDate(campaign.endsAt)}</td>
                        <td><strong>{campaign.metrics30Days.clicks}</strong> clics<small>{campaign.metrics30Days.impressions} impresiones</small></td>
                        <td>
                          {campaign.sponsorshipId ? (
                            <button type="button" className="admin-table-action" disabled={busy} onClick={() => void changeSponsorshipStatus(campaign.sponsorshipId!, campaign.sponsorshipStatus === 'active' ? 'paused' : 'active')}>
                              {campaign.sponsorshipStatus === 'active' ? 'Pausar' : 'Activar'}
                            </button>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="admin-empty">Todavía no hay anunciantes configurados.</p>}
          </div>
        </section>

        <section id="solicitudes" className="admin-section">
          <div className="admin-section-heading"><div><p className="admin-eyebrow">Comercial</p><h2>Solicitudes de anunciantes</h2></div><span className="admin-count">{pendingApplications.length} pendientes</span></div>
          <div className="admin-card">
            {pendingApplications.length ? pendingApplications.map((application) => (
              <article className="admin-application" key={application.id}>
                <div>
                  <strong>{application.businessName}</strong>
                  <p>{application.municipality ?? 'Municipio no indicado'} · Plan {application.requestedPlanCode ?? 'sin elegir'}</p>
                  <small>{application.contactName} · {application.contactEmail}{application.contactPhone ? ` · ${application.contactPhone}` : ''}</small>
                </div>
                <div className="admin-application-actions">
                  <button type="button" onClick={() => void reviewApplication(application.id, 'rejected')} disabled={busy}>Rechazar</button>
                  <button type="button" className="approve" onClick={() => void reviewApplication(application.id, 'approved')} disabled={busy}>Aprobar</button>
                </div>
              </article>
            )) : <p className="admin-empty">No hay solicitudes pendientes.</p>}
          </div>
        </section>

        <section id="contenido" className="admin-section">
          <div className="admin-section-heading"><div><p className="admin-eyebrow">Contenido</p><h2>Gestión de la aplicación</h2></div></div>
          <div className="admin-module-grid">
            <Module title="Directorio y cooperativas" value={`${dashboard.publicContent.directoryEntries} fichas`} status="Base disponible" />
            <Module title="Usuarios" value={`${dashboard.agriculture.usersWithHolding} activos`} status="Control global preparado" />
            <Module title="Noticias" value="Módulo editorial" status="Siguiente ampliación" />
            <Module title="Alertas y avisos" value="Tiempo · Campo" status="Siguiente ampliación" />
            <Module title="Mercado del aceite" value="Fuentes públicas" status="Supervisión preparada" />
            <Module title="Legal y contacto" value="Privacidad · soporte" status="Siguiente ampliación" />
          </div>
        </section>

        <section id="sistema" className="admin-section">
          <div className="admin-section-heading"><div><p className="admin-eyebrow">Infraestructura</p><h2>Estado del sistema</h2></div></div>
          <div className="admin-system-grid">
            <div className="admin-card"><span className="admin-system-dot" /><strong>API</strong><small>{dashboard.system.api}</small></div>
            <div className="admin-card"><span className="admin-system-dot" /><strong>PostgreSQL</strong><small>{dashboard.system.database}</small></div>
            <div className="admin-card"><span className={`admin-system-dot ${dashboard.advertisingEnabled ? '' : 'muted'}`} /><strong>Publicidad pública</strong><small>{dashboard.advertisingEnabled ? 'habilitada' : 'apagada para staging'}</small></div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ value, label, emphasis = false }: { value: number; label: string; emphasis?: boolean }) {
  return <article className={`admin-stat${emphasis ? ' emphasis' : ''}`}><strong>{new Intl.NumberFormat('es-ES').format(value)}</strong><span>{label}</span></article>;
}

function Module({ title, value, status }: { title: string; value: string; status: string }) {
  return <article className="admin-card admin-module"><span className="admin-module-icon" aria-hidden="true">◆</span><div><strong>{title}</strong><p>{value}</p><small>{status}</small></div></article>;
}
