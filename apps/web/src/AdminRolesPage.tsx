import { useCallback, useEffect, useMemo, useState } from 'react';

type Role = 'superadmin' | 'commercial' | 'content' | 'support' | 'operations';
type RoleResponse = {
  currentUserId: string;
  bootstrapSuperadmin: boolean;
  availableRoles: Role[];
  users: Array<{
    id: string;
    email: string;
    name: string | null;
    roles: Role[];
    bootstrapSuperadmin: boolean;
  }>;
};

type LoadState = 'loading' | 'ready' | 'forbidden' | 'error';

const roleCatalog: Array<{ role: Role; label: string; description: string; activeNow: boolean }> = [
  { role: 'superadmin', label: 'Superadmin', description: 'Control completo. En V1 se mantiene mediante MAGINA_ADMIN_EMAILS.', activeNow: true },
  { role: 'commercial', label: 'Comercial', description: 'Economía de publicidad, acuerdos, cobros y renovaciones.', activeNow: true },
  { role: 'content', label: 'Contenido', description: 'Preparado para delegar noticias y avisos en la siguiente migración de permisos.', activeNow: false },
  { role: 'support', label: 'Soporte', description: 'Preparado para delegar soporte y legal en una fase posterior.', activeNow: false },
  { role: 'operations', label: 'Operaciones', description: 'Preparado para delegar usuarios, directorio y fuentes en una fase posterior.', activeNow: false },
];

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
      // Keep generic HTTP message.
    }
    throw error;
  }
  return await response.json() as T;
}

export function AdminRolesPage() {
  const [state, setState] = useState<LoadState>('loading');
  const [data, setData] = useState<RoleResponse | null>(null);
  const [search, setSearch] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await requestJson<RoleResponse>('/api/v1/admin/roles');
      setData(result);
      setState('ready');
    } catch (reason) {
      const status = (reason as { status?: number }).status;
      if (status === 401 || status === 403) setState('forbidden');
      else {
        setError(reason instanceof Error ? reason.message : 'No se han podido cargar los roles.');
        setState('error');
      }
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visibleUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return data?.users ?? [];
    return (data?.users ?? []).filter((user) => `${user.name ?? ''} ${user.email}`.toLowerCase().includes(needle));
  }, [data, search]);

  async function setCommercial(userId: string, enabled: boolean) {
    const user = data?.users.find((item) => item.id === userId);
    if (!user) return;
    setBusyUserId(userId); setNotice(null); setError(null);
    try {
      const roles = new Set<Role>(user.roles.filter((role) => role === 'commercial'));
      if (enabled) roles.add('commercial'); else roles.delete('commercial');
      await requestJson(`/api/v1/admin/roles/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ roles: [...roles] }),
      });
      setNotice(enabled ? 'Rol comercial concedido.' : 'Rol comercial retirado.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se han podido actualizar los roles.');
    } finally { setBusyUserId(null); }
  }

  if (state === 'loading') return <main className="roles-gate" role="status">Abriendo roles administrativos…</main>;
  if (state === 'forbidden') return <Gate title="Solo Superadmin" message="La asignación de permisos requiere un Superadmin de plataforma." />;
  if (state === 'error' || !data) return <Gate title="No se han podido cargar los roles" message={error ?? 'Error inesperado.'} />;

  return (
    <div className="roles-shell">
      <header className="roles-header">
        <div><a href="/admin" className="roles-back">← Centro de mando</a><p className="roles-eyebrow">Seguridad</p><h1>Roles administrativos</h1><p>Delegación progresiva de funciones sin compartir una cuenta Superadmin.</p></div>
        <span className="roles-super-pill">{data.bootstrapSuperadmin ? 'Superadmin de arranque' : 'Superadmin persistente'}</span>
      </header>

      {notice ? <div className="roles-notice" role="status">{notice}</div> : null}
      {error ? <div className="roles-error" role="alert">{error}</div> : null}

      <section className="roles-section">
        <div className="roles-heading"><div><p className="roles-eyebrow">Modelo</p><h2>Permisos por responsabilidad</h2></div><small>Activación gradual para reducir riesgo</small></div>
        <div className="roles-catalog">
          {roleCatalog.map((item) => <article key={item.role} className={`roles-card${item.activeNow ? ' active' : ''}`}><div className="roles-card-title"><strong>{item.label}</strong><span>{item.activeNow ? 'Operativo' : 'Preparado'}</span></div><p>{item.description}</p></article>)}
        </div>
      </section>

      <section className="roles-section">
        <div className="roles-heading"><div><p className="roles-eyebrow">Delegación V1</p><h2>Acceso comercial</h2><p>En esta fase solo delegamos economía de publicidad. El resto continúa bajo Superadmin hasta migrar sus endpoints.</p></div></div>
        <div className="roles-toolbar"><label>Buscar usuario<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o correo" /></label><span>{visibleUsers.length} usuarios</span></div>
        <div className="roles-table-card">
          <table><thead><tr><th>Usuario</th><th>Estado administrador</th><th>Rol comercial</th><th>Acción</th></tr></thead><tbody>
            {visibleUsers.map((user) => {
              const isSelf = user.id === data.currentUserId;
              const commercial = user.roles.includes('commercial');
              const immutable = user.bootstrapSuperadmin || isSelf;
              return <tr key={user.id}><td><strong>{user.name ?? 'Sin nombre'}</strong><small>{user.email || 'Sin correo'}</small></td><td>{user.bootstrapSuperadmin ? <span className="roles-badge super">Superadmin · entorno</span> : user.roles.length ? <span className="roles-badge">{user.roles.join(', ')}</span> : <span className="roles-muted">Sin rol</span>}</td><td>{commercial ? 'Concedido' : 'No concedido'}</td><td>{immutable ? <span className="roles-muted">{isSelf ? 'Cuenta actual protegida' : 'Gestionado por entorno'}</span> : <button type="button" disabled={busyUserId === user.id} onClick={() => void setCommercial(user.id, !commercial)}>{busyUserId === user.id ? 'Guardando…' : commercial ? 'Retirar comercial' : 'Conceder comercial'}</button>}</td></tr>;
            })}
          </tbody></table>{!visibleUsers.length ? <p className="roles-empty">No hay usuarios que coincidan con la búsqueda.</p> : null}
        </div>
      </section>

      <section className="roles-warning"><strong>Protección de arranque</strong><p>Las cuentas incluidas en <code>MAGINA_ADMIN_EMAILS</code> no se pueden modificar desde esta pantalla. Se gestionan únicamente en el entorno del servidor para conservar una vía de recuperación administrativa.</p></section>

      <footer className="roles-footer"><a href="/admin/finanzas">Economía de publicidad</a><a href="/admin/publicidad">Campañas publicitarias</a></footer>
    </div>
  );
}

function Gate({ title, message }: { title: string; message: string }) {
  return <main className="roles-gate"><section><p className="roles-eyebrow">Mágina Olivo</p><h1>{title}</h1><p>{message}</p><a href="/admin">Volver al centro de mando</a></section></main>;
}
