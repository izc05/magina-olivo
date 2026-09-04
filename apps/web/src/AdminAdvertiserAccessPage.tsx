import { useCallback, useEffect, useMemo, useState } from 'react';

type PortalRole = 'owner' | 'editor' | 'viewer';
type FunnelItem = {
  id: string;
  businessName: string;
  municipality: string | null;
  convertedAt: string | null;
  conversion: { advertiserId: string | null; sponsorshipId: string | null };
};
type PortalAdminResponse = {
  members: Array<{ userId: string; email: string | null; name: string | null; role: PortalRole; status: string }>;
  profileChanges: Array<{
    id: string;
    submittedByUserId: string;
    description: string | null;
    phone: string | null;
    whatsappPhone: string | null;
    logoUrl: string | null;
    heroImageUrl: string | null;
    status: string;
    createdAt: string;
  }>;
};
type LoadState = 'loading' | 'ready' | 'forbidden' | 'error';

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
      // Keep status.
    }
    throw error;
  }
  return response.json() as Promise<T>;
}

export function AdminAdvertiserAccessPage() {
  const [state, setState] = useState<LoadState>('loading');
  const [advertisers, setAdvertisers] = useState<FunnelItem[]>([]);
  const [selectedAdvertiserId, setSelectedAdvertiserId] = useState('');
  const [portal, setPortal] = useState<PortalAdminResponse | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<PortalRole>('owner');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = useMemo(() => advertisers.find((item) => item.conversion.advertiserId === selectedAdvertiserId) ?? null, [advertisers, selectedAdvertiserId]);

  const loadAdvertisers = useCallback(async () => {
    try {
      const result = await requestJson<{ items: FunnelItem[] }>('/api/v1/admin/advertising/funnel');
      const converted = result.items.filter((item) => Boolean(item.conversion.advertiserId));
      setAdvertisers(converted);
      setSelectedAdvertiserId((current) => current || converted[0]?.conversion.advertiserId || '');
      setState('ready');
    } catch (reason) {
      const status = (reason as { status?: number }).status;
      if (status === 401 || status === 403) setState('forbidden');
      else {
        setError(reason instanceof Error ? reason.message : 'No se han podido cargar los anunciantes.');
        setState('error');
      }
    }
  }, []);

  const loadPortal = useCallback(async (advertiserId: string) => {
    if (!advertiserId) {
      setPortal(null);
      return;
    }
    try {
      setPortal(await requestJson<PortalAdminResponse>(`/api/v1/admin/commercial/advertiser-portal?advertiserId=${encodeURIComponent(advertiserId)}`));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido cargar el acceso del anunciante.');
    }
  }, []);

  useEffect(() => { void loadAdvertisers(); }, [loadAdvertisers]);
  useEffect(() => { void loadPortal(selectedAdvertiserId); }, [loadPortal, selectedAdvertiserId]);

  async function grantAccess() {
    if (!selectedAdvertiserId || !email.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await requestJson(`/api/v1/admin/commercial/advertisers/${selectedAdvertiserId}/portal-memberships`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), role }),
      });
      setEmail('');
      setNotice('Cuenta vinculada al Área del Anunciante.');
      await loadPortal(selectedAdvertiserId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido conceder acceso.');
    } finally {
      setBusy(false);
    }
  }

  async function revokeAccess(userId: string) {
    if (!selectedAdvertiserId) return;
    setBusy(true);
    setError(null);
    try {
      await requestJson(`/api/v1/admin/commercial/advertisers/${selectedAdvertiserId}/portal-memberships/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      setNotice('Acceso revocado.');
      await loadPortal(selectedAdvertiserId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido revocar el acceso.');
    } finally {
      setBusy(false);
    }
  }

  async function review(changeId: string, status: 'approved' | 'rejected') {
    if (!selectedAdvertiserId) return;
    const notes = window.prompt(status === 'approved' ? 'Nota de aprobación (opcional)' : 'Motivo del rechazo (recomendado)', '') ?? '';
    setBusy(true);
    setError(null);
    try {
      await requestJson(`/api/v1/admin/commercial/advertiser-profile-changes/${changeId}/review`, {
        method: 'POST',
        body: JSON.stringify({ status, reviewNotes: notes }),
      });
      setNotice(status === 'approved' ? 'Cambios aprobados y aplicados a la ficha comercial.' : 'Cambios rechazados.');
      await loadPortal(selectedAdvertiserId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido revisar el cambio.');
    } finally {
      setBusy(false);
    }
  }

  if (state === 'loading') return <main className="advertiser-admin-gate">Abriendo gestión de anunciantes…</main>;
  if (state === 'forbidden') return <AdminGate title="Acceso comercial requerido" message="Necesitas rol Comercial o Superadmin para vincular cuentas de anunciantes." />;
  if (state === 'error') return <AdminGate title="No se ha podido abrir" message={error ?? 'Error inesperado.'} />;

  return (
    <main className="advertiser-admin-shell">
      <header className="advertiser-admin-header"><div><a href="/admin/comercial">← Embudo comercial</a><p className="admin-eyebrow">Publicidad</p><h1>Acceso de anunciantes</h1><p>Vincula cuentas registradas y revisa cambios sin convertirlas en administradores.</p></div><a className="advertiser-admin-preview" href="/anunciante" target="_blank" rel="noreferrer">Abrir portal</a></header>

      {notice ? <div className="advertiser-admin-notice" role="status">{notice}</div> : null}
      {error ? <div className="advertiser-admin-error" role="alert">{error}</div> : null}

      <section className="advertiser-admin-selector">
        <label>Anunciante<select value={selectedAdvertiserId} onChange={(event) => setSelectedAdvertiserId(event.target.value)}>{advertisers.map((item) => <option key={item.id} value={item.conversion.advertiserId ?? ''}>{item.businessName}{item.municipality ? ` · ${item.municipality}` : ''}</option>)}</select></label>
        <div><strong>{selected?.businessName ?? 'Sin anunciante seleccionado'}</strong><span>El portal no concede acceso a `/admin`, parcelas, entregas ni usuarios globales.</span></div>
      </section>

      <section className="advertiser-admin-grid">
        <article className="advertiser-admin-card">
          <div className="advertiser-admin-card-heading"><div><p className="admin-eyebrow">Acceso</p><h2>Cuentas vinculadas</h2></div><span>{portal?.members.filter((item) => item.status === 'active').length ?? 0} activas</span></div>
          <div className="advertiser-admin-members">
            {(portal?.members ?? []).map((member) => <div key={member.userId} className={member.status !== 'active' ? 'revoked' : ''}><div><strong>{member.name || member.email || member.userId}</strong><small>{member.email || member.userId}</small></div><span>{member.role}</span>{member.status === 'active' ? <button disabled={busy} onClick={() => void revokeAccess(member.userId)}>Revocar</button> : <em>Revocado</em>}</div>)}
            {!portal?.members.length ? <p>Aún no hay cuentas vinculadas.</p> : null}
          </div>
          <div className="advertiser-admin-grant"><h3>Vincular cuenta existente</h3><p>La persona debe registrarse primero en Mágina Olivo. Conocer el correo de contacto no concede acceso automáticamente.</p><div><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="cuenta@empresa.es" /><select value={role} onChange={(event) => setRole(event.target.value as PortalRole)}><option value="owner">Owner</option><option value="editor">Editor</option><option value="viewer">Viewer</option></select><button disabled={busy || !email.trim()} onClick={() => void grantAccess()}>Vincular</button></div></div>
        </article>

        <article className="advertiser-admin-card">
          <div className="advertiser-admin-card-heading"><div><p className="admin-eyebrow">Moderación</p><h2>Cambios de ficha</h2></div><span>{portal?.profileChanges.filter((item) => item.status === 'pending').length ?? 0} pendientes</span></div>
          <div className="advertiser-admin-changes">
            {(portal?.profileChanges ?? []).map((change) => <div key={change.id} className={`change-${change.status}`}><div className="advertiser-admin-change-top"><strong>{change.status}</strong><small>{new Date(change.createdAt).toLocaleString('es-ES')}</small></div><dl><dt>Descripción</dt><dd>{change.description || '—'}</dd><dt>Teléfono</dt><dd>{change.phone || '—'}</dd><dt>WhatsApp</dt><dd>{change.whatsappPhone || '—'}</dd><dt>Logo</dt><dd>{change.logoUrl || '—'}</dd><dt>Imagen</dt><dd>{change.heroImageUrl || '—'}</dd></dl>{change.status === 'pending' ? <div className="advertiser-admin-review-actions"><button disabled={busy} onClick={() => void review(change.id, 'approved')}>Aprobar</button><button className="danger" disabled={busy} onClick={() => void review(change.id, 'rejected')}>Rechazar</button></div> : null}</div>)}
            {!portal?.profileChanges.length ? <p>No hay solicitudes de cambio.</p> : null}
          </div>
        </article>
      </section>

      <section className="advertiser-admin-safety"><strong>Separación de permisos</strong><p>Owner/Editor/Viewer son roles del negocio, no roles administrativos. Ni siquiera `owner` obtiene acceso a usuarios globales, fincas, documentos agrícolas, roles de plataforma o ejecución de pagos.</p></section>
    </main>
  );
}

function AdminGate({ title, message }: { title: string; message: string }) {
  return <main className="advertiser-admin-gate"><section><p className="admin-eyebrow">Mágina Olivo</p><h1>{title}</h1><p>{message}</p><a href="/admin">Volver a administración</a></section></main>;
}
