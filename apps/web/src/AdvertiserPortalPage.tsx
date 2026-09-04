import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

type PortalRole = 'owner' | 'editor' | 'viewer';
type Membership = { advertiserId: string; role: PortalRole; businessName: string; municipality: string | null };
type AccessResponse = { user: { id: string; email: string; name: string | null }; memberships: Membership[] };
type DashboardResponse = {
  access: { role: PortalRole; canRequestChanges: boolean };
  profile: {
    advertiserId: string;
    businessName: string;
    municipality: string | null;
    province: string | null;
    websiteUrl: string | null;
    category: string;
    description: string | null;
    phone: string | null;
    whatsappPhone: string | null;
    logoUrl: string | null;
    heroImageUrl: string | null;
    status: string;
  };
  campaign: null | {
    id: string;
    planCode: string;
    status: string;
    startsAt: string | null;
    endsAt: string | null;
    publicLabel: string;
  };
  metrics: {
    days30: { impressions: number; phoneClicks: number; whatsappClicks: number; websiteClicks: number; actions: number; actionRate: number | null };
    days90: { impressions: number; actions: number; actionRate: number | null };
    privacy: string;
  };
  contract: null | {
    id: string;
    planCode: string;
    agreedAmountCents: number;
    currency: string;
    billingCycle: string;
    status: string;
    startsAt: string | null;
    endsAt: string | null;
    renewalAt: string | null;
  };
  billing: Array<{ id: string; amountCents: number; currency: string; status: string; dueAt: string | null; paidAt: string | null; reference: string | null }>;
  latestProfileChange: null | { id: string; status: string; createdAt: string; reviewedAt: string | null; reviewNotes: string | null };
  billingNotice: string;
};
type NotificationItem = {
  id: string;
  type: string;
  severity: 'info' | 'action' | 'warning';
  title: string;
  body: string;
  actionUrl: string | null;
  createdAt: string;
  readAt: string | null;
};
type NotificationResponse = {
  unreadCount: number;
  items: NotificationItem[];
  policy: { commercialOnly: boolean; officialWarning: boolean; agriculturalAlert: boolean };
};
type PreferenceResponse = {
  emailEnabled: boolean;
  emailTransportConfigured: boolean;
  note: string;
};

type LoadState = 'loading' | 'ready' | 'unauthenticated' | 'error';

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

function euro(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(cents / 100);
}

function date(value: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}

function percent(value: number | null): string {
  if (value === null) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 1 }).format(value);
}

export function AdvertiserPortalPage() {
  const [state, setState] = useState<LoadState>('loading');
  const [access, setAccess] = useState<AccessResponse | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [notifications, setNotifications] = useState<NotificationResponse | null>(null);
  const [preferences, setPreferences] = useState<PreferenceResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadAccess = useCallback(async () => {
    setError(null);
    try {
      const result = await requestJson<AccessResponse>('/api/v1/advertiser/access');
      setAccess(result);
      setSelectedId((current) => current || result.memberships[0]?.advertiserId || '');
      setState('ready');
    } catch (reason) {
      if ((reason as { status?: number }).status === 401) setState('unauthenticated');
      else {
        setError(reason instanceof Error ? reason.message : 'No se ha podido abrir el área del anunciante.');
        setState('error');
      }
    }
  }, []);

  const loadDashboard = useCallback(async (advertiserId: string) => {
    if (!advertiserId) {
      setDashboard(null);
      return;
    }
    setError(null);
    try {
      setDashboard(await requestJson<DashboardResponse>(`/api/v1/advertiser/dashboard?advertiserId=${encodeURIComponent(advertiserId)}`));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se han podido cargar los datos del anunciante.');
    }
  }, []);

  const loadNotifications = useCallback(async (advertiserId: string) => {
    if (!advertiserId) {
      setNotifications(null);
      setPreferences(null);
      return;
    }
    try {
      const [notificationData, preferenceData] = await Promise.all([
        requestJson<NotificationResponse>(`/api/v1/advertiser/notifications?advertiserId=${encodeURIComponent(advertiserId)}`),
        requestJson<PreferenceResponse>(`/api/v1/advertiser/notification-preferences?advertiserId=${encodeURIComponent(advertiserId)}`),
      ]);
      setNotifications(notificationData);
      setPreferences(preferenceData);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se han podido cargar los avisos comerciales.');
    }
  }, []);

  useEffect(() => { void loadAccess(); }, [loadAccess]);
  useEffect(() => { void loadDashboard(selectedId); }, [loadDashboard, selectedId]);
  useEffect(() => { void loadNotifications(selectedId); }, [loadNotifications, selectedId]);

  const selectedMembership = useMemo(() => access?.memberships.find((item) => item.advertiserId === selectedId) ?? null, [access, selectedId]);

  async function submitProfileChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dashboard || !dashboard.access.canRequestChanges) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await requestJson('/api/v1/advertiser/profile-change-requests', {
        method: 'POST',
        body: JSON.stringify({
          advertiserId: dashboard.profile.advertiserId,
          description: String(form.get('description') ?? ''),
          phone: String(form.get('phone') ?? ''),
          whatsappPhone: String(form.get('whatsappPhone') ?? ''),
          logoUrl: String(form.get('logoUrl') ?? ''),
          heroImageUrl: String(form.get('heroImageUrl') ?? ''),
        }),
      });
      setNotice('Cambios enviados para revisión. La ficha pública no se modifica hasta que sean aprobados.');
      await loadDashboard(dashboard.profile.advertiserId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido enviar la solicitud de cambio.');
    } finally {
      setBusy(false);
    }
  }

  async function markNotificationRead(notificationId: string) {
    if (!selectedId) return;
    setNotificationBusy(true);
    try {
      await requestJson(`/api/v1/advertiser/notifications/${notificationId}/read`, { method: 'POST' });
      await loadNotifications(selectedId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido marcar el aviso como leído.');
    } finally {
      setNotificationBusy(false);
    }
  }

  async function setEmailNotifications(emailEnabled: boolean) {
    if (!selectedId) return;
    setNotificationBusy(true);
    setError(null);
    try {
      await requestJson(`/api/v1/advertiser/notification-preferences?advertiserId=${encodeURIComponent(selectedId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ emailEnabled }),
      });
      await loadNotifications(selectedId);
      setNotice(emailEnabled
        ? 'Preferencia de correo comercial activada. Solo se enviará si el transporte de correo está configurado por Mágina Olivo.'
        : 'Correo comercial desactivado. Seguirás viendo los avisos dentro del Área del Anunciante.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido guardar la preferencia de correo.');
    } finally {
      setNotificationBusy(false);
    }
  }

  if (state === 'loading') return <main className="advertiser-gate" role="status">Abriendo área del anunciante…</main>;
  if (state === 'unauthenticated') return (
    <PortalGate title="Inicia sesión para continuar" message="El área del anunciante usa una cuenta normal de Mágina Olivo vinculada previamente por el equipo comercial." actionHref="/" actionLabel="Ir al acceso de Mágina Olivo" />
  );
  if (state === 'error') return <PortalGate title="No se ha podido abrir" message={error ?? 'Error inesperado.'} actionHref="/" actionLabel="Volver a Mágina Olivo" />;
  if (!access?.memberships.length) return (
    <PortalGate title="Tu cuenta aún no tiene un negocio vinculado" message="El acceso no se concede solo por conocer el correo de una empresa. Pide al equipo de Mágina Olivo que vincule esta cuenta a tu anunciante." actionHref="/anunciate" actionLabel="Solicitar presencia comercial" secondaryHref="/contacto" secondaryLabel="Contactar con soporte" />
  );

  return (
    <main className="advertiser-shell" id="main-content">
      <header className="advertiser-header">
        <a className="advertiser-brand" href="/"><img src="/brand/magina-olivo-mark.svg" alt="" /><span><strong>Mágina Olivo</strong><small>Área del anunciante</small></span></a>
        <div className="advertiser-header-actions"><span>{access.user.email}</span><a href="/">Volver a la app</a></div>
      </header>

      <section className="advertiser-hero">
        <div><p className="eyebrow">Publicidad transparente</p><h1>{dashboard?.profile.businessName ?? selectedMembership?.businessName ?? 'Tu negocio'}</h1><p>Consulta el rendimiento de tu presencia comercial sin acceder a datos agrícolas de ningún usuario.</p></div>
        {access.memberships.length > 1 ? <label>Negocio<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{access.memberships.map((item) => <option value={item.advertiserId} key={item.advertiserId}>{item.businessName}</option>)}</select></label> : <span className="advertiser-role">{selectedMembership?.role ?? 'viewer'}</span>}
      </section>

      {notice ? <div className="advertiser-notice" role="status">{notice}</div> : null}
      {error ? <div className="advertiser-error" role="alert">{error}</div> : null}

      {dashboard ? (
        <>
          <section className="advertiser-kpis" aria-label="Rendimiento últimos 30 días">
            <PortalKpi value={dashboard.metrics.days30.impressions} label="Impresiones · 30 días" />
            <PortalKpi value={dashboard.metrics.days30.actions} label="Interacciones · 30 días" />
            <PortalKpi value={dashboard.metrics.days30.whatsappClicks} label="WhatsApp" />
            <PortalKpi value={percent(dashboard.metrics.days30.actionRate)} label="Tasa de acción" />
          </section>

          <section className="advertiser-notification-section" aria-labelledby="advertiser-notifications-title">
            <div className="advertiser-section-heading">
              <div><p className="eyebrow">Seguimiento comercial</p><h2 id="advertiser-notifications-title">Avisos del anunciante {notifications?.unreadCount ? `· ${notifications.unreadCount} sin leer` : ''}</h2><p>Altas, revisiones, vencimientos, renovaciones y cobros. No son alertas agrícolas, meteorológicas ni oficiales.</p></div>
              <label className="advertiser-email-pref"><input type="checkbox" checked={preferences?.emailEnabled ?? false} onChange={(event) => void setEmailNotifications(event.target.checked)} disabled={notificationBusy} /><span>Recibir también por correo</span></label>
            </div>
            <div className="advertiser-notification-list">
              {(notifications?.items ?? []).slice(0, 8).map((item) => (
                <article key={item.id} className={`advertiser-notification advertiser-notification-${item.severity}${item.readAt ? ' read' : ' unread'}`}>
                  <div><span className="advertiser-notification-dot" aria-hidden="true">●</span><div><strong>{item.title}</strong><p>{item.body}</p><small>{date(item.createdAt)} · Mágina Olivo · Aviso comercial</small></div></div>
                  {!item.readAt ? <button type="button" disabled={notificationBusy} onClick={() => void markNotificationRead(item.id)}>Marcar leído</button> : <span className="advertiser-notification-read">Leído</span>}
                </article>
              ))}
              {!notifications?.items.length ? <div className="advertiser-card advertiser-notification-empty">No tienes avisos comerciales pendientes.</div> : null}
            </div>
            <p className="advertiser-privacy">El correo es opcional y está desactivado por defecto. Estado del transporte: <strong>{preferences?.emailTransportConfigured ? 'configurado' : 'no configurado'}</strong>. Los avisos dentro del portal no dependen del correo.</p>
          </section>

          <section className="advertiser-grid">
            <article className="advertiser-card advertiser-campaign-card">
              <div className="advertiser-card-heading"><div><p className="eyebrow">Campaña</p><h2>Visibilidad contratada</h2></div><span className={`advertiser-status status-${dashboard.campaign?.status ?? 'none'}`}>{dashboard.campaign?.status ?? 'Sin campaña'}</span></div>
              {dashboard.campaign ? <div className="advertiser-info-grid"><Info label="Plan" value={dashboard.campaign.planCode} /><Info label="Etiqueta pública" value={dashboard.campaign.publicLabel} /><Info label="Inicio" value={date(dashboard.campaign.startsAt)} /><Info label="Fin" value={date(dashboard.campaign.endsAt)} /></div> : <p>No hay campaña asociada todavía.</p>}
              <p className="advertiser-privacy">{dashboard.metrics.privacy}</p>
            </article>

            <article className="advertiser-card">
              <div className="advertiser-card-heading"><div><p className="eyebrow">90 días</p><h2>Tendencia</h2></div></div>
              <div className="advertiser-info-grid"><Info label="Impresiones" value={String(dashboard.metrics.days90.impressions)} /><Info label="Interacciones" value={String(dashboard.metrics.days90.actions)} /><Info label="Tasa" value={percent(dashboard.metrics.days90.actionRate)} /></div>
              <div className="advertiser-action-breakdown"><span>Llamadas <strong>{dashboard.metrics.days30.phoneClicks}</strong></span><span>WhatsApp <strong>{dashboard.metrics.days30.whatsappClicks}</strong></span><span>Web <strong>{dashboard.metrics.days30.websiteClicks}</strong></span></div>
            </article>

            <article className="advertiser-card">
              <div className="advertiser-card-heading"><div><p className="eyebrow">Contrato</p><h2>Plan y renovación</h2></div><span className={`advertiser-status status-${dashboard.contract?.status ?? 'none'}`}>{dashboard.contract?.status ?? 'Sin contrato'}</span></div>
              {dashboard.contract ? <div className="advertiser-info-grid"><Info label="Importe acordado" value={euro(dashboard.contract.agreedAmountCents, dashboard.contract.currency)} /><Info label="Periodicidad" value={dashboard.contract.billingCycle} /><Info label="Renovación" value={date(dashboard.contract.renewalAt)} /><Info label="Finalización" value={date(dashboard.contract.endsAt)} /></div> : <p>El plan puede existir sin contrato económico formalizado.</p>}
            </article>

            <article className="advertiser-card">
              <div className="advertiser-card-heading"><div><p className="eyebrow">Cobros</p><h2>Estado comercial</h2></div><a href="/contacto">¿Dudas?</a></div>
              <div className="advertiser-billing-list">
                {dashboard.billing.map((entry) => <div key={entry.id}><div><strong>{euro(entry.amountCents, entry.currency)}</strong><span>{entry.status}</span></div><small>Vencimiento {date(entry.dueAt)}{entry.reference ? ` · ${entry.reference}` : ''}</small></div>)}
                {!dashboard.billing.length ? <p>No hay apuntes de cobro asociados.</p> : null}
              </div>
              <p className="advertiser-privacy">{dashboard.billingNotice}</p>
            </article>
          </section>

          <section className="advertiser-profile-section">
            <div className="advertiser-section-heading"><div><p className="eyebrow">Ficha comercial</p><h2>Solicitar cambios</h2><p>Los cambios se revisan antes de afectar al contenido patrocinado que ve el público.</p></div>{dashboard.latestProfileChange ? <span className={`advertiser-status status-${dashboard.latestProfileChange.status}`}>Último cambio: {dashboard.latestProfileChange.status}</span> : null}</div>

            <div className="advertiser-profile-layout">
              <article className="advertiser-card advertiser-current-profile">
                <Info label="Negocio" value={dashboard.profile.businessName} />
                <Info label="Ubicación" value={[dashboard.profile.municipality, dashboard.profile.province].filter(Boolean).join(' · ') || '—'} />
                <Info label="Web pública" value={dashboard.profile.websiteUrl ?? '—'} />
                <Info label="Estado de perfil" value={dashboard.profile.status} />
                {dashboard.latestProfileChange?.reviewNotes ? <p className="advertiser-review-note"><strong>Nota de revisión:</strong> {dashboard.latestProfileChange.reviewNotes}</p> : null}
              </article>

              {dashboard.access.canRequestChanges ? (
                <form className="advertiser-card advertiser-edit-form" onSubmit={submitProfileChange}>
                  <label>Descripción<textarea name="description" rows={5} maxLength={2000} defaultValue={dashboard.profile.description ?? ''} /></label>
                  <div className="advertiser-form-grid"><label>Teléfono<input name="phone" maxLength={80} defaultValue={dashboard.profile.phone ?? ''} /></label><label>WhatsApp<input name="whatsappPhone" maxLength={80} defaultValue={dashboard.profile.whatsappPhone ?? ''} /></label><label>Logo HTTPS<input name="logoUrl" type="url" maxLength={2000} defaultValue={dashboard.profile.logoUrl ?? ''} /></label><label>Imagen principal HTTPS<input name="heroImageUrl" type="url" maxLength={2000} defaultValue={dashboard.profile.heroImageUrl ?? ''} /></label></div>
                  <button disabled={busy || dashboard.latestProfileChange?.status === 'pending'}>{dashboard.latestProfileChange?.status === 'pending' ? 'Cambio pendiente de revisión' : busy ? 'Enviando…' : 'Enviar cambios para revisión'}</button>
                  <small>No puedes cambiar desde aquí la ficha institucional, verificación o prioridad de campaña.</small>
                </form>
              ) : <article className="advertiser-card advertiser-readonly"><strong>Acceso de solo lectura</strong><p>Tu rol puede consultar campaña, métricas y estado comercial, pero no proponer cambios.</p></article>}
            </div>
          </section>
        </>
      ) : <section className="advertiser-loading" role="status">Cargando negocio…</section>}

      <footer className="advertiser-footer"><p>El Área del Anunciante está aislada del panel administrativo y de los datos privados de agricultores.</p><a href="/legal/privacidad">Privacidad</a></footer>
    </main>
  );
}

function PortalKpi({ value, label }: { value: number | string; label: string }) {
  return <article className="advertiser-kpi"><strong>{value}</strong><span>{label}</span></article>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="advertiser-info"><small>{label}</small><strong>{value}</strong></div>;
}

function PortalGate({ title, message, actionHref, actionLabel, secondaryHref, secondaryLabel }: { title: string; message: string; actionHref: string; actionLabel: string; secondaryHref?: string; secondaryLabel?: string }) {
  return <main className="advertiser-gate"><section><img src="/brand/magina-olivo-mark.svg" alt="" /><p className="eyebrow">Mágina Olivo · Anunciantes</p><h1>{title}</h1><p>{message}</p><div><a href={actionHref}>{actionLabel}</a>{secondaryHref && secondaryLabel ? <a className="secondary" href={secondaryHref}>{secondaryLabel}</a> : null}</div></section></main>;
}
