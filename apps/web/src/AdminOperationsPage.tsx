import { useCallback, useEffect, useMemo, useState } from 'react';

type LoadState = 'loading' | 'ready' | 'forbidden' | 'error';
type UserItem = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string | null;
  updatedAt: string | null;
  holdingsCount: number;
  roles: string[];
  lastMembershipAt: string | null;
};
type DirectoryItem = {
  id: string;
  officialName: string;
  brandName: string | null;
  entityType: 'cooperative' | 'sat' | 'company' | 'other';
  municipality: string | null;
  province: string | null;
  address: string | null;
  phone: string | null;
  websiteUrl: string | null;
  sourceUrl: string | null;
  sourceCheckedAt: string | null;
  verificationStatus: 'unverified' | 'verified' | 'stale';
  updatedAt: string;
};
type SourceItem = {
  sourceKey: string;
  label: string;
  provider: string;
  active: boolean;
  sourceUpdatedAt: string | null;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  updateFrequency: string | null;
};
type AuditItem = {
  id: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  occurredAt: string;
};

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
      // Keep the HTTP status when a proxy returns non-JSON.
    }
    throw error;
  }
  return await response.json() as T;
}

function shortDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}

function sourceState(source: SourceItem): { label: string; tone: string } {
  if (!source.active) return { label: 'Desactivada', tone: 'muted' };
  if (source.lastError) return { label: 'Revisar', tone: 'danger' };
  if (!source.lastCheckedAt) return { label: 'Sin comprobar', tone: 'muted' };
  const age = Date.now() - new Date(source.lastCheckedAt).getTime();
  if (!Number.isFinite(age) || age > 14 * 24 * 60 * 60 * 1000) return { label: 'Antigua', tone: 'warning' };
  return { label: 'Operativa', tone: 'ok' };
}

export function AdminOperationsPage() {
  const [state, setState] = useState<LoadState>('loading');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [administratorUserId, setAdministratorUserId] = useState('');
  const [directory, setDirectory] = useState<DirectoryItem[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [directorySearch, setDirectorySearch] = useState('');

  const selected = useMemo(
    () => directory.find((item) => item.id === selectedId) ?? null,
    [directory, selectedId],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const [userResult, directoryResult, sourceResult, auditResult] = await Promise.all([
        adminRequest<{ administratorUserId: string; items: UserItem[] }>('/api/v1/admin/users'),
        adminRequest<{ items: DirectoryItem[] }>('/api/v1/admin/directory'),
        adminRequest<{ items: SourceItem[] }>('/api/v1/admin/sources'),
        adminRequest<{ items: AuditItem[] }>('/api/v1/admin/audit'),
      ]);
      setUsers(userResult.items);
      setAdministratorUserId(userResult.administratorUserId);
      setDirectory(directoryResult.items);
      setSources(sourceResult.items);
      setAudit(auditResult.items);
      setSelectedId((current) => current || directoryResult.items[0]?.id || '');
      setState('ready');
    } catch (reason) {
      const status = (reason as { status?: number }).status;
      if (status === 401 || status === 403) {
        setState('forbidden');
        return;
      }
      setError(reason instanceof Error ? reason.message : 'No se ha podido cargar la consola operativa.');
      setState('error');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function searchUsers() {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (userSearch.trim()) params.set('q', userSearch.trim());
      const result = await adminRequest<{ administratorUserId: string; items: UserItem[] }>(`/api/v1/admin/users${params.size ? `?${params}` : ''}`);
      setUsers(result.items);
      setAdministratorUserId(result.administratorUserId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se han podido buscar usuarios.');
    } finally {
      setBusy(false);
    }
  }

  async function revokeSessions(user: UserItem) {
    if (user.id === administratorUserId) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const result = await adminRequest<{ sessionsRevoked: number }>(`/api/v1/admin/users/${encodeURIComponent(user.id)}/revoke-sessions`, { method: 'POST' });
      setNotice(`Sesiones revocadas para ${user.email}: ${result.sessionsRevoked}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se han podido revocar las sesiones.');
    } finally {
      setBusy(false);
    }
  }

  async function searchDirectory() {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (directorySearch.trim()) params.set('q', directorySearch.trim());
      const result = await adminRequest<{ items: DirectoryItem[] }>(`/api/v1/admin/directory${params.size ? `?${params}` : ''}`);
      setDirectory(result.items);
      setSelectedId(result.items[0]?.id ?? '');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido filtrar el directorio.');
    } finally {
      setBusy(false);
    }
  }

  async function saveDirectory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await adminRequest(`/api/v1/admin/directory/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          officialName: String(form.get('officialName') ?? ''),
          brandName: String(form.get('brandName') ?? '') || null,
          entityType: String(form.get('entityType') ?? 'other'),
          municipality: String(form.get('municipality') ?? '') || null,
          province: String(form.get('province') ?? '') || null,
          address: String(form.get('address') ?? '') || null,
          phone: String(form.get('phone') ?? '') || null,
          websiteUrl: String(form.get('websiteUrl') ?? '') || null,
          sourceUrl: String(form.get('sourceUrl') ?? '') || null,
          sourceCheckedAt: selected.sourceCheckedAt,
          verificationStatus: String(form.get('verificationStatus') ?? 'unverified'),
        }),
      });
      setNotice(`Ficha actualizada: ${String(form.get('officialName') ?? '')}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido actualizar la ficha.');
    } finally {
      setBusy(false);
    }
  }

  if (state === 'loading') return <main className="admin-loading">Abriendo operaciones…</main>;
  if (state === 'forbidden') return <main className="admin-gate"><section className="admin-gate-card"><h1>Acceso restringido</h1><p>Esta consola requiere autorización global de plataforma.</p><a className="admin-primary-link" href="/">Volver</a></section></main>;
  if (state === 'error') return <main className="admin-gate"><section className="admin-gate-card"><h1>Error de operaciones</h1><p>{error}</p><button className="admin-primary-button" onClick={() => void load()}>Reintentar</button></section></main>;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a href="/admin" className="admin-brand"><span className="admin-brand-mark">MO</span><span><strong>Mágina Olivo</strong><small>Operaciones</small></span></a>
        <nav aria-label="Operaciones administrativas">
          <a href="#usuarios">Usuarios</a>
          <a href="#directorio">Directorio</a>
          <a href="#fuentes">Fuentes</a>
          <a href="#auditoria">Auditoría</a>
          <a href="/admin">← Panel principal</a>
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div><p className="admin-eyebrow">Operaciones</p><h1>Soporte y contenido público</h1></div>
          <button className="admin-ghost-button" type="button" onClick={() => void load()} disabled={busy}>Actualizar todo</button>
        </header>
        {notice ? <div className="admin-notice" role="status">{notice}</div> : null}
        {error ? <div className="admin-error" role="alert">{error}</div> : null}

        <section id="usuarios" className="admin-section">
          <div className="admin-section-heading"><div><p className="admin-eyebrow">Soporte</p><h2>Usuarios</h2><p>Vista mínima para soporte. No abre parcelas, entregas ni documentos privados.</p></div><span className="admin-count">{users.length}</span></div>
          <div className="admin-card admin-ops-toolbar"><input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Buscar por nombre o correo" /><button className="admin-primary-button" type="button" onClick={() => void searchUsers()} disabled={busy}>Buscar</button></div>
          <div className="admin-card admin-table-card"><div className="admin-table-wrap"><table><thead><tr><th>Usuario</th><th>Explotaciones</th><th>Roles</th><th>Alta</th><th>Soporte</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.name || 'Sin nombre'}</strong><small>{user.email}</small></td><td>{user.holdingsCount}</td><td>{user.roles.join(', ') || 'Sin explotación'}</td><td>{shortDate(user.createdAt)}</td><td>{user.id === administratorUserId ? <span className="admin-muted">Tu sesión</span> : <button className="admin-table-action" type="button" onClick={() => void revokeSessions(user)} disabled={busy}>Cerrar sesiones</button>}</td></tr>)}</tbody></table></div></div>
        </section>

        <section id="directorio" className="admin-section">
          <div className="admin-section-heading"><div><p className="admin-eyebrow">Información pública</p><h2>Directorio y cooperativas</h2><p>Los cambios quedan auditados y las URLs públicas deben ser HTTPS.</p></div></div>
          <div className="admin-card admin-ops-toolbar"><input value={directorySearch} onChange={(event) => setDirectorySearch(event.target.value)} placeholder="Buscar cooperativa, almazara o marca" /><button className="admin-primary-button" type="button" onClick={() => void searchDirectory()} disabled={busy}>Filtrar</button></div>
          <div className="admin-two-column admin-ops-directory">
            <div className="admin-card admin-ops-list">{directory.map((item) => <button key={item.id} type="button" className={item.id === selectedId ? 'active' : ''} onClick={() => setSelectedId(item.id)}><strong>{item.officialName}</strong><small>{item.brandName || item.municipality || 'Sin marca'}</small><span className={`admin-source-state ${item.verificationStatus}`}>{item.verificationStatus}</span></button>)}</div>
            {selected ? <form key={selected.id} className="admin-card admin-form" onSubmit={saveDirectory}><div className="admin-card-heading"><h3>Editar ficha</h3><span>{selected.municipality ?? 'Sierra Mágina'}</span></div><label>Nombre oficial<input name="officialName" defaultValue={selected.officialName} required maxLength={240} /></label><label>Marca<input name="brandName" defaultValue={selected.brandName ?? ''} maxLength={240} /></label><div className="admin-form-row"><label>Tipo<select name="entityType" defaultValue={selected.entityType}><option value="cooperative">Cooperativa</option><option value="sat">SAT</option><option value="company">Empresa</option><option value="other">Otro</option></select></label><label>Verificación<select name="verificationStatus" defaultValue={selected.verificationStatus}><option value="verified">Verificada</option><option value="unverified">Sin verificar</option><option value="stale">Revisión pendiente</option></select></label></div><div className="admin-form-row"><label>Municipio<input name="municipality" defaultValue={selected.municipality ?? ''} /></label><label>Provincia<input name="province" defaultValue={selected.province ?? ''} /></label></div><label>Dirección<input name="address" defaultValue={selected.address ?? ''} /></label><label>Teléfono<input name="phone" defaultValue={selected.phone ?? ''} /></label><label>Web HTTPS<input name="websiteUrl" type="url" defaultValue={selected.websiteUrl ?? ''} /></label><label>Fuente HTTPS<input name="sourceUrl" type="url" defaultValue={selected.sourceUrl ?? ''} /></label><button className="admin-primary-button" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar ficha'}</button></form> : <div className="admin-card"><p className="admin-empty">Selecciona una ficha.</p></div>}
          </div>
        </section>

        <section id="fuentes" className="admin-section">
          <div className="admin-section-heading"><div><p className="admin-eyebrow">Calidad del dato</p><h2>Fuentes oficiales</h2></div><span className="admin-count">{sources.length}</span></div>
          <div className="admin-source-grid">{sources.map((source) => { const health = sourceState(source); return <article key={source.sourceKey} className="admin-card admin-source-card"><div><strong>{source.label}</strong><small>{source.provider}</small></div><span className={`admin-source-state ${health.tone}`}>{health.label}</span><p>Comprobada: {shortDate(source.lastCheckedAt)}</p><p>Último éxito: {shortDate(source.lastSuccessAt)}</p>{source.lastError ? <p className="admin-source-error">{source.lastError}</p> : null}<small>{source.updateFrequency ?? 'Frecuencia no indicada'}</small></article>; })}</div>
        </section>

        <section id="auditoria" className="admin-section">
          <div className="admin-section-heading"><div><p className="admin-eyebrow">Trazabilidad</p><h2>Historial administrativo</h2><p>Acciones sensibles realizadas desde la consola.</p></div><span className="admin-count">{audit.length}</span></div>
          <div className="admin-card admin-audit-list">{audit.length ? audit.map((item) => <article key={item.id}><div><strong>{item.summary}</strong><small>{item.actorEmail} · {item.action}</small></div><time>{shortDate(item.occurredAt)}</time></article>) : <p className="admin-empty">Aún no hay acciones registradas en esta nueva auditoría.</p>}</div>
        </section>
      </main>
    </div>
  );
}
