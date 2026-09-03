import { useEffect, useMemo, useState } from 'react';

type User = { id: string; name?: string | null; email: string };
type Destination = {
  id: string;
  officialName: string;
  brandName: string | null;
  municipality: string | null;
};

type Preferences = {
  preferredCooperativeId: string | null;
  notifyWeather: boolean;
  notifyTasks: boolean;
  notifyPendingYield: boolean;
  weatherRainMmThreshold: number;
  weatherFrostCThreshold: number;
  weatherWindKmhThreshold: number;
  updatedAt?: string;
};

const DEFAULT_PREFERENCES: Preferences = {
  preferredCooperativeId: null,
  notifyWeather: true,
  notifyTasks: true,
  notifyPendingYield: true,
  weatherRainMmThreshold: 5,
  weatherFrostCThreshold: 0,
  weatherWindKmhThreshold: 50,
};

async function jsonRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body) headers.set('content-type', 'application/json');
  const response = await fetch(url, { ...init, headers, credentials: 'include' });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      message = body.error?.message ?? message;
    } catch {
      // Keep the generic HTTP status for non-JSON errors.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [session, preferenceResult, directory] = await Promise.all([
          jsonRequest<{ user: User }>('/api/v1/me'),
          jsonRequest<Preferences>('/api/v1/account/preferences'),
          jsonRequest<{ items: Destination[] }>('/api/v1/public/destinations'),
        ]);
        if (cancelled) return;
        setUser(session.user);
        setPreferences(preferenceResult);
        setDestinations(directory.items);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'No se ha podido cargar Mi Cuenta.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const preferred = useMemo(
    () => destinations.find((item) => item.id === preferences.preferredCooperativeId) ?? null,
    [destinations, preferences.preferredCooperativeId],
  );

  async function save() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await jsonRequest<Preferences>('/api/v1/account/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          preferredCooperativeId: preferences.preferredCooperativeId,
          notifyWeather: preferences.notifyWeather,
          notifyTasks: preferences.notifyTasks,
          notifyPendingYield: preferences.notifyPendingYield,
          weatherRainMmThreshold: Number(preferences.weatherRainMmThreshold),
          weatherFrostCThreshold: Number(preferences.weatherFrostCThreshold),
          weatherWindKmhThreshold: Number(preferences.weatherWindKmhThreshold),
        }),
      });
      setPreferences(saved);
      setNotice('Preferencias guardadas.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se han podido guardar las preferencias.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="loading-screen" role="status">Cargando Mi Cuenta…</div>;

  return (
    <main className="account-shell">
      <header className="account-topbar">
        <a className="text-button" href="/">← Volver</a>
        <div className="brand-lockup">
          <span className="brand-title">Mágina Olivo</span>
          <span className="brand-kicker">Mi Cuenta</span>
        </div>
      </header>

      <div className="account-page">
        <section>
          <p className="eyebrow page-eyebrow">Mi Cuenta</p>
          <h1 className="section-title">Preferencias y privacidad</h1>
          <p className="section-copy">Configura lo que quieres ver y recibir sin mezclar estas preferencias con los datos privados de tu explotación.</p>
        </section>

        {error ? <div className="alert section" role="alert">{error}</div> : null}
        {notice ? <div className="alert success section" role="status">{notice}</div> : null}

        <section className="section card card-body">
          <h2 className="section-title account-section-title">Tu perfil</h2>
          <p className="list-card-title">{user?.name || 'Agricultor'}</p>
          <p className="list-card-meta">{user?.email}</p>
        </section>

        <section className="section card card-body">
          <h2 className="section-title account-section-title">Cooperativa / almazara habitual</h2>
          <p className="section-copy">Sirve como preferencia de uso. Seleccionarla no comparte tus entregas ni tus documentos con esa entidad.</p>
          <div className="field account-field">
            <label htmlFor="preferred-cooperative">Entidad habitual</label>
            <select
              id="preferred-cooperative"
              value={preferences.preferredCooperativeId ?? ''}
              onChange={(event) => setPreferences((current) => ({ ...current, preferredCooperativeId: event.target.value || null }))}
            >
              <option value="">Ninguna / decidir en cada entrega</option>
              {destinations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.officialName}{item.municipality ? ` · ${item.municipality}` : ''}
                </option>
              ))}
            </select>
          </div>
          {preferred ? <p className="list-card-meta">Actual: {preferred.brandName || preferred.officialName}{preferred.municipality ? ` · ${preferred.municipality}` : ''}</p> : null}
        </section>

        <section className="section card card-body">
          <h2 className="section-title account-section-title">Avisos</h2>
          <p className="section-copy">Estas preferencias preparan el centro de notificaciones P0. Los avisos solo se enviarán cuando exista una regla activa y una fuente válida.</p>

          <label className="account-toggle">
            <input type="checkbox" checked={preferences.notifyWeather} onChange={(event) => setPreferences((current) => ({ ...current, notifyWeather: event.target.checked }))} />
            <span><strong>Tiempo</strong><small>Lluvia, helada y viento según tus umbrales.</small></span>
          </label>
          <label className="account-toggle">
            <input type="checkbox" checked={preferences.notifyTasks} onChange={(event) => setPreferences((current) => ({ ...current, notifyTasks: event.target.checked }))} />
            <span><strong>Tareas</strong><small>Próximas y vencidas cuando el calendario esté activo.</small></span>
          </label>
          <label className="account-toggle">
            <input type="checkbox" checked={preferences.notifyPendingYield} onChange={(event) => setPreferences((current) => ({ ...current, notifyPendingYield: event.target.checked }))} />
            <span><strong>Rendimientos pendientes</strong><small>Entregas que todavía no tienen resultado.</small></span>
          </label>

          <div className="account-threshold-grid">
            <div className="field">
              <label htmlFor="rain-threshold">Lluvia desde (mm)</label>
              <input id="rain-threshold" type="number" min="0" max="500" step="0.1" inputMode="decimal" value={preferences.weatherRainMmThreshold} onChange={(event) => setPreferences((current) => ({ ...current, weatherRainMmThreshold: Number(event.target.value) }))} disabled={!preferences.notifyWeather} />
            </div>
            <div className="field">
              <label htmlFor="frost-threshold">Helada desde (°C)</label>
              <input id="frost-threshold" type="number" min="-50" max="20" step="0.1" inputMode="decimal" value={preferences.weatherFrostCThreshold} onChange={(event) => setPreferences((current) => ({ ...current, weatherFrostCThreshold: Number(event.target.value) }))} disabled={!preferences.notifyWeather} />
            </div>
            <div className="field">
              <label htmlFor="wind-threshold">Viento desde (km/h)</label>
              <input id="wind-threshold" type="number" min="0" max="300" step="1" inputMode="decimal" value={preferences.weatherWindKmhThreshold} onChange={(event) => setPreferences((current) => ({ ...current, weatherWindKmhThreshold: Number(event.target.value) }))} disabled={!preferences.notifyWeather} />
            </div>
          </div>
        </section>

        <section className="section card card-body account-privacy-card">
          <h2 className="section-title account-section-title">Tus datos</h2>
          <p className="section-copy">Tus fincas, campañas y documentos son privados por defecto. La exportación por campaña ya está disponible dentro de cada campaña.</p>
          <p className="section-copy"><strong>Copia integral y baja:</strong> no mostraremos acciones destructivas o de portabilidad total hasta que el flujo completo de autorización, exportación y supresión esté implementado y probado.</p>
        </section>

        <div className="section form-actions account-save-row">
          <button className="primary-button" type="button" onClick={() => void save()} disabled={busy}>{busy ? 'Guardando…' : 'Guardar preferencias'}</button>
        </div>
      </div>
    </main>
  );
}
