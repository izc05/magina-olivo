import { useCallback, useEffect, useMemo, useState } from 'react';

type Dashboard = {
  advertisingEnabled: boolean;
  admin: { email: string };
  counts: {
    activeAdvertisers: number;
    activeSponsorships: number;
    pendingApplications: number;
  };
  metrics30d: {
    impressions: number;
    profileViews: number;
    phoneClicks: number;
    whatsappClicks: number;
    websiteClicks: number;
  };
  applications: Array<{
    id: string;
    businessName: string;
    category: string;
    municipality: string | null;
    contactName: string;
    contactEmail: string;
    contactPhone: string | null;
    requestedPlanCode: string | null;
    description: string | null;
    status: 'pending';
    createdAt: string;
  }>;
  advertisers: Array<{
    id: string;
    destinationId: string;
    officialName: string;
    brandName: string | null;
    municipality: string | null;
    category: string;
    profileStatus: string;
    contactEmail: string | null;
    phone: string | null;
    sponsorship: {
      id: string;
      planCode: 'featured' | 'premium' | null;
      status: string | null;
      startsAt: string | null;
      endsAt: string | null;
      label: string | null;
      municipalities: string[];
    } | null;
  }>;
  plans: Array<{
    code: 'free' | 'featured' | 'premium';
    name: string;
    publicLabel: string;
    priority: number;
    active: boolean;
  }>;
};

const categoryLabels: Record<string, string> = {
  cooperative: 'Cooperativa',
  oil_mill: 'Almazara',
  machinery: 'Maquinaria',
  workshop: 'Taller',
  harvest: 'Recolección',
  nursery: 'Vivero',
  irrigation: 'Riego',
  pruning: 'Poda',
  phytosanitary: 'Fitosanitarios',
  insurance: 'Seguros',
  advisory: 'Asesoría',
  other: 'Otros',
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-ES').format(value);
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
}

function toIsoOrNull(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function AdminAdvertisingPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [campaignFormOpen, setCampaignFormOpen] = useState(false);
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [campaignAdvertiserId, setCampaignAdvertiserId] = useState('');
  const [campaignPlan, setCampaignPlan] = useState<'featured' | 'premium'>('featured');
  const [campaignStatus, setCampaignStatus] = useState<'draft' | 'pending' | 'active'>('active');
  const [campaignStartsAt, setCampaignStartsAt] = useState('');
  const [campaignEndsAt, setCampaignEndsAt] = useState('');
  const [campaignMunicipalities, setCampaignMunicipalities] = useState('');
  const [campaignLabel, setCampaignLabel] = useState('Patrocinado');
  const [changingSponsorshipId, setChangingSponsorshipId] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/admin/advertising/dashboard', {
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
      });
      if (response.status === 401) throw new Error('Inicia sesión para acceder al panel de administración.');
      if (response.status === 403) throw new Error('Tu cuenta no está autorizada como administrador de Mágina Olivo.');
      if (!response.ok) throw new Error(`No se ha podido cargar el panel (HTTP ${response.status}).`);
      const result = await response.json() as Dashboard;
      setDashboard(result);
      setSelectedApplicationId((current) => current ?? result.applications[0]?.id ?? null);
      setCampaignAdvertiserId((current) => current || result.advertisers.find((item) => item.profileStatus === 'active' && !item.sponsorship)?.id || '');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido cargar el panel.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const selectedApplication = useMemo(() => {
    return dashboard?.applications.find((application) => application.id === selectedApplicationId)
      ?? dashboard?.applications[0]
      ?? null;
  }, [dashboard, selectedApplicationId]);

  const campaignEligibleAdvertisers = useMemo(() => {
    return (dashboard?.advertisers ?? []).filter((advertiser) => advertiser.profileStatus === 'active' && !advertiser.sponsorship);
  }, [dashboard]);

  async function reviewApplication(status: 'approved' | 'rejected') {
    if (!selectedApplication) return;
    setReviewingId(selectedApplication.id);
    setError(null);
    try {
      const response = await fetch(`/api/v1/admin/advertising/applications/${selectedApplication.id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error(`No se ha podido revisar la solicitud (HTTP ${response.status}).`);
      setSelectedApplicationId(null);
      await loadDashboard();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido revisar la solicitud.');
    } finally {
      setReviewingId(null);
    }
  }

  async function createCampaign() {
    if (!campaignAdvertiserId) {
      setError('Selecciona una empresa activa sin campaña abierta.');
      return;
    }
    setCampaignSaving(true);
    setError(null);
    try {
      const municipalities = [...new Set(campaignMunicipalities.split(',').map((item) => item.trim()).filter(Boolean))];
      const response = await fetch('/api/v1/admin/advertising/sponsorships', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          advertiserId: campaignAdvertiserId,
          planCode: campaignPlan,
          status: campaignStatus,
          startsAt: toIsoOrNull(campaignStartsAt),
          endsAt: toIsoOrNull(campaignEndsAt),
          municipalities,
          publicLabel: campaignLabel.trim() || 'Patrocinado',
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        throw new Error(payload?.error?.message ?? `No se ha podido crear la campaña (HTTP ${response.status}).`);
      }
      setCampaignFormOpen(false);
      setCampaignStartsAt('');
      setCampaignEndsAt('');
      setCampaignMunicipalities('');
      setCampaignLabel('Patrocinado');
      await loadDashboard();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido crear la campaña.');
    } finally {
      setCampaignSaving(false);
    }
  }

  async function changeSponsorshipStatus(sponsorshipId: string, status: 'active' | 'paused' | 'cancelled') {
    setChangingSponsorshipId(sponsorshipId);
    setError(null);
    try {
      const response = await fetch(`/api/v1/admin/advertising/sponsorships/${sponsorshipId}/status`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error(`No se ha podido cambiar la campaña (HTTP ${response.status}).`);
      await loadDashboard();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido cambiar la campaña.');
    } finally {
      setChangingSponsorshipId(null);
    }
  }

  const metricCards = dashboard ? [
    ['Visualizaciones', dashboard.metrics30d.impressions],
    ['Visitas a ficha', dashboard.metrics30d.profileViews],
    ['WhatsApp', dashboard.metrics30d.whatsappClicks],
    ['Llamadas', dashboard.metrics30d.phoneClicks],
    ['Web', dashboard.metrics30d.websiteClicks],
  ] as const : [];

  return (
    <main className="advertising-admin-shell" id="main-content">
      <aside className="advertising-admin-sidebar" aria-label="Administración Mágina Olivo">
        <a className="advertising-admin-brand" href="/" aria-label="Mágina Olivo">
          <img src="/brand/magina-olivo-mark.svg" alt="" />
          <span><strong>Mágina Olivo</strong><small>Administración</small></span>
        </a>
        <nav>
          <a href="/">Inicio</a>
          <a href="/magina/directorio">Empresas y servicios</a>
          <a className="active" href="/admin/publicidad" aria-current="page">Publicidad</a>
          <span className="disabled">Pagos · Próximamente</span>
          <span className="disabled">Ajustes · Próximamente</span>
        </nav>
        <div className="advertising-admin-account">
          <span>Administrador</span>
          <small>{dashboard?.admin.email ?? 'Acceso restringido'}</small>
        </div>
      </aside>

      <section className="advertising-admin-content">
        <header className="advertising-admin-header">
          <div>
            <p className="eyebrow">Mágina Olivo · Gestión comercial</p>
            <h1>Publicidad y empresas</h1>
            <p>Gestiona empresas, patrocinios, solicitudes y rendimiento sin mezclar publicidad con los datos objetivos del agricultor.</p>
          </div>
          <div className="advertising-header-actions">
            <button type="button" className="new-campaign-button" onClick={() => setCampaignFormOpen((value) => !value)}>+ Nueva campaña</button>
            <div className={`advertising-mode ${dashboard?.advertisingEnabled ? 'enabled' : 'disabled'}`}>
              <span>{dashboard?.advertisingEnabled ? 'Publicidad activa' : 'Publicidad desactivada'}</span>
              <small>{dashboard?.advertisingEnabled ? 'Visible para usuarios' : 'Modo seguro de piloto'}</small>
            </div>
          </div>
        </header>

        {error ? <div className="advertising-admin-alert" role="alert">{error}</div> : null}
        {loading && !dashboard ? <div className="advertising-admin-loading">Cargando panel…</div> : null}

        {dashboard ? (
          <>
            {campaignFormOpen ? (
              <section className="advertising-campaign-form" aria-labelledby="new-campaign-title">
                <div className="advertising-admin-card-heading">
                  <div><p className="eyebrow">Patrocinio</p><h2 id="new-campaign-title">Nueva campaña</h2></div>
                  <button type="button" className="campaign-close" onClick={() => setCampaignFormOpen(false)} aria-label="Cerrar formulario">×</button>
                </div>
                {campaignEligibleAdvertisers.length > 0 ? (
                  <div className="campaign-fields">
                    <label><span>Empresa</span><select value={campaignAdvertiserId} onChange={(event) => setCampaignAdvertiserId(event.target.value)}>{campaignEligibleAdvertisers.map((advertiser) => <option key={advertiser.id} value={advertiser.id}>{advertiser.brandName ?? advertiser.officialName}</option>)}</select></label>
                    <label><span>Plan</span><select value={campaignPlan} onChange={(event) => setCampaignPlan(event.target.value as 'featured' | 'premium')}><option value="featured">Destacado</option><option value="premium">Premium</option></select></label>
                    <label><span>Estado inicial</span><select value={campaignStatus} onChange={(event) => setCampaignStatus(event.target.value as 'draft' | 'pending' | 'active')}><option value="active">Activa</option><option value="pending">Pendiente</option><option value="draft">Borrador</option></select></label>
                    <label><span>Inicio</span><input type="datetime-local" value={campaignStartsAt} onChange={(event) => setCampaignStartsAt(event.target.value)} /></label>
                    <label><span>Fin</span><input type="datetime-local" value={campaignEndsAt} onChange={(event) => setCampaignEndsAt(event.target.value)} /></label>
                    <label className="campaign-wide"><span>Municipios</span><input type="text" placeholder="Mancha Real, Pegalajar, Cambil" value={campaignMunicipalities} onChange={(event) => setCampaignMunicipalities(event.target.value)} /><small>Separados por comas. Vacío = sin limitación municipal específica.</small></label>
                    <label><span>Etiqueta pública</span><input type="text" maxLength={40} value={campaignLabel} onChange={(event) => setCampaignLabel(event.target.value)} /></label>
                    <div className="campaign-submit"><button type="button" disabled={campaignSaving} onClick={() => void createCampaign()}>{campaignSaving ? 'Guardando…' : 'Crear campaña'}</button></div>
                  </div>
                ) : <div className="advertising-empty">No hay empresas activas disponibles sin una campaña abierta. Activa un perfil o pausa/cancela su campaña actual antes de crear otra.</div>}
              </section>
            ) : null}

            <section className="advertising-kpis" aria-label="Resumen comercial">
              <article><span>Empresas activas</span><strong>{formatNumber(dashboard.counts.activeAdvertisers)}</strong><small>Perfiles comerciales aprobados</small></article>
              <article><span>Patrocinios activos</span><strong>{formatNumber(dashboard.counts.activeSponsorships)}</strong><small>Dentro de su ventana vigente</small></article>
              <article><span>Solicitudes pendientes</span><strong>{formatNumber(dashboard.counts.pendingApplications)}</strong><small>Requieren revisión manual</small></article>
              <article className="neutral"><span>Ingresos</span><strong>—</strong><small>Se activará con el módulo de pagos</small></article>
            </section>

            <div className="advertising-admin-grid">
              <section className="advertising-admin-card advertisers-panel" aria-labelledby="advertisers-title">
                <div className="advertising-admin-card-heading">
                  <div><p className="eyebrow">Empresas</p><h2 id="advertisers-title">Directorio comercial</h2></div>
                  <span>{dashboard.advertisers.length} perfiles</span>
                </div>
                <div className="advertising-table-wrap">
                  <table>
                    <thead><tr><th>Empresa</th><th>Categoría</th><th>Municipio</th><th>Plan</th><th>Campaña</th><th>Zona</th><th>Vencimiento</th><th>Acciones</th></tr></thead>
                    <tbody>
                      {dashboard.advertisers.map((advertiser) => (
                        <tr key={advertiser.id}>
                          <td><strong>{advertiser.brandName ?? advertiser.officialName}</strong><small>{advertiser.brandName ? advertiser.officialName : advertiser.contactEmail ?? ''}</small></td>
                          <td>{categoryLabels[advertiser.category] ?? advertiser.category}</td>
                          <td>{advertiser.municipality ?? '—'}</td>
                          <td><span className={`plan-pill ${advertiser.sponsorship?.planCode ?? 'free'}`}>{advertiser.sponsorship?.planCode === 'premium' ? 'Premium' : advertiser.sponsorship?.planCode === 'featured' ? 'Destacado' : 'Gratis'}</span></td>
                          <td><span className={`status-dot ${advertiser.sponsorship?.status ?? advertiser.profileStatus}`}>{advertiser.sponsorship?.status ?? advertiser.profileStatus}</span></td>
                          <td>{advertiser.sponsorship?.municipalities.length ? advertiser.sponsorship.municipalities.join(', ') : 'General'}</td>
                          <td>{formatDate(advertiser.sponsorship?.endsAt ?? null)}</td>
                          <td>
                            {advertiser.sponsorship ? (
                              <div className="campaign-row-actions">
                                {advertiser.sponsorship.status === 'active' ? <button type="button" disabled={changingSponsorshipId === advertiser.sponsorship.id} onClick={() => void changeSponsorshipStatus(advertiser.sponsorship!.id, 'paused')}>Pausar</button> : <button type="button" disabled={changingSponsorshipId === advertiser.sponsorship.id} onClick={() => void changeSponsorshipStatus(advertiser.sponsorship!.id, 'active')}>Activar</button>}
                                <button type="button" className="danger" disabled={changingSponsorshipId === advertiser.sponsorship.id} onClick={() => void changeSponsorshipStatus(advertiser.sponsorship!.id, 'cancelled')}>Cancelar</button>
                              </div>
                            ) : <span className="no-campaign">Sin campaña</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {dashboard.advertisers.length === 0 ? <div className="advertising-empty">Todavía no hay perfiles comerciales. El directorio público seguirá funcionando con normalidad.</div> : null}
                </div>
              </section>

              <aside className="advertising-admin-card applications-panel" aria-labelledby="applications-title">
                <div className="advertising-admin-card-heading">
                  <div><p className="eyebrow">Revisión</p><h2 id="applications-title">Solicitudes</h2></div>
                  <span>{dashboard.applications.length}</span>
                </div>
                {selectedApplication ? (
                  <>
                    <label className="application-picker">
                      <span>Solicitud pendiente</span>
                      <select value={selectedApplication.id} onChange={(event) => setSelectedApplicationId(event.target.value)}>
                        {dashboard.applications.map((application) => <option key={application.id} value={application.id}>{application.businessName}</option>)}
                      </select>
                    </label>
                    <div className="application-detail">
                      <h3>{selectedApplication.businessName}</h3>
                      <p>{categoryLabels[selectedApplication.category] ?? selectedApplication.category}{selectedApplication.municipality ? ` · ${selectedApplication.municipality}` : ''}</p>
                      <dl>
                        <div><dt>Contacto</dt><dd>{selectedApplication.contactName}</dd></div>
                        <div><dt>Email</dt><dd>{selectedApplication.contactEmail}</dd></div>
                        <div><dt>Teléfono</dt><dd>{selectedApplication.contactPhone ?? '—'}</dd></div>
                        <div><dt>Plan solicitado</dt><dd>{selectedApplication.requestedPlanCode ?? 'Sin seleccionar'}</dd></div>
                        <div><dt>Fecha</dt><dd>{formatDate(selectedApplication.createdAt)}</dd></div>
                      </dl>
                      {selectedApplication.description ? <p className="application-description">{selectedApplication.description}</p> : null}
                    </div>
                    <div className="application-actions">
                      <button className="approve" type="button" disabled={reviewingId === selectedApplication.id} onClick={() => void reviewApplication('approved')}>✓ Aprobar</button>
                      <button className="reject" type="button" disabled={reviewingId === selectedApplication.id} onClick={() => void reviewApplication('rejected')}>× Rechazar</button>
                    </div>
                  </>
                ) : <div className="advertising-empty">No hay solicitudes pendientes.</div>}
              </aside>
            </div>

            <section className="advertising-metrics" aria-labelledby="metrics-title">
              <div className="advertising-admin-card-heading"><div><p className="eyebrow">Últimos 30 días</p><h2 id="metrics-title">Rendimiento comercial</h2></div></div>
              <div className="advertising-metric-grid">
                {metricCards.map(([label, value]) => <article key={label}><span>{label}</span><strong>{formatNumber(value)}</strong></article>)}
              </div>
              <p className="advertising-privacy-note">Métricas agregadas: no se guardan IP, identificadores de explotación ni coordenadas precisas de parcelas en los eventos publicitarios.</p>
            </section>

            <section className="advertising-plans" aria-labelledby="plans-title">
              <div className="advertising-admin-card-heading"><div><p className="eyebrow">Configuración</p><h2 id="plans-title">Planes preparados</h2></div><span>Precios todavía no fijados</span></div>
              <div className="advertising-plan-grid">
                {dashboard.plans.map((plan) => <article key={plan.code}><strong>{plan.name}</strong><span>{plan.publicLabel}</span><small>Prioridad {plan.priority} · {plan.active ? 'Activo' : 'Inactivo'}</small></article>)}
              </div>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
