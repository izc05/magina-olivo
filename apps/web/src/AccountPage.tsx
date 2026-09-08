import { VisualHeader } from './VisualChrome';
import { PublicNavigation } from './PublicNavigation';
import { api } from './api';
import { listPendingOperations } from './offline/outbox';
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
  weatherRainProbabilityPercentThreshold: number;
  weatherFrostCThreshold: number;
  weatherWindKmhThreshold: number;
  updatedAt?: string;
};

type AccountExport = {
  id: string;
  schemaVersion: number;
  status: 'requested' | 'generating' | 'ready' | 'expired' | 'failed';
  filename: string;
  sizeBytes: string | null;
  sha256: string | null;
  error: string | null;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  downloadUrl: string | null;
};

const DEFAULT_PREFERENCES: Preferences = {
  preferredCooperativeId: null,
  notifyWeather: true,
  notifyTasks: true,
  notifyPendingYield: true,
  weatherRainProbabilityPercentThreshold: 60,
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
    throw Object.assign(new Error(message), { status: response.status });
  }
  return response.json() as Promise<T>;
}

function exportStatusLabel(status: AccountExport['status']): string {
  switch (status) {
    case 'requested': return 'En cola';
    case 'generating': return 'Preparando';
    case 'ready': return 'Lista';
    case 'expired': return 'Caducada';
    case 'failed': return 'Error';
  }
}

function formatBytes(value: string | null): string | null {
  if (!value) return null;
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function accountErrorMessage(reason: unknown, fallback: string): string {
  if (!(reason instanceof Error)) return fallback;
  const status = (reason as Error & { status?: number }).status;
  if (status === 401 || status === 403) {
    return 'Tu sesión ya no está disponible en este dispositivo. Inicia sesión de nuevo para continuar.';
  }
  if (/^HTTP 5\d\d$/.test(reason.message)) {
    return 'No se ha podido cargar tu perfil ahora. Inténtalo de nuevo en unos minutos.';
  }
  return reason.message || fallback;
}

export function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [exports, setExports] = useState<AccountExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [retry, setRetry] = useState(0);

  async function signOut() {
    setBusy(true);
    setError(null);
    try {
      const session = await api.me();
      const pending = await listPendingOperations(session.user.id);
      if (pending.length) throw new Error('Sincroniza los cambios pendientes antes de cerrar sesión.');
      await api.signOut();
      window.location.assign('/');
    } catch (reason) {
      setError(accountErrorMessage(reason, 'No se ha podido cerrar sesión. Vuelve a intentarlo.'));
    } finally { setBusy(false); }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setNotice(null);
      setPreferencesReady(false);
      try {
        const [sessionResult, preferenceResult, directoryResult, exportResult] = await Promise.allSettled([
          jsonRequest<{ user: User }>('/api/v1/me'),
          jsonRequest<Preferences>('/api/v1/account/preferences'),
          jsonRequest<{ items: Destination[] }>('/api/v1/public/destinations'),
          jsonRequest<{ items: AccountExport[] }>('/api/v1/account/exports'),
        ]);
        if (cancelled) return;
        if (sessionResult.status === 'rejected') throw sessionResult.reason;
        setUser(sessionResult.value.user);
        // The profile and its preferences are separate resources. A temporary
        // preferences/database issue must not hide the user's account data.
        if (preferenceResult.status === 'fulfilled') {
          setPreferences(preferenceResult.value);
          setPreferencesReady(true);
        } else {
          setPreferences(DEFAULT_PREFERENCES);
          setNotice('Tus datos básicos están disponibles. Las preferencias se cargarán de nuevo al reintentar.');
        }
        setDestinations(directoryResult.status === 'fulfilled' ? directoryResult.value.items : []);
        setExports(exportResult.status === 'fulfilled' ? exportResult.value.items : []);
      } catch (reason) {
        if (!cancelled) setError(accountErrorMessage(reason, 'No se ha podido cargar Mi Cuenta.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [retry]);

  const preferred = useMemo(
    () => destinations.find((item) => item.id === preferences.preferredCooperativeId) ?? null,
    [destinations, preferences.preferredCooperativeId],
  );
  const latestExport = exports[0] ?? null;

  useEffect(() => {
    if (!latestExport || !['requested', 'generating'].includes(latestExport.status)) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      void jsonRequest<{ items: AccountExport[] }>('/api/v1/account/exports')
        .then((result) => {
          if (!cancelled) setExports(result.items);
        })
        .catch(() => {
          // Keep the last known state; a transient polling failure is not destructive.
        });
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [latestExport?.id, latestExport?.status]);

  async function save() {
    if (!preferencesReady) return;
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
          weatherRainProbabilityPercentThreshold: Number(preferences.weatherRainProbabilityPercentThreshold),
          weatherFrostCThreshold: Number(preferences.weatherFrostCThreshold),
          weatherWindKmhThreshold: Number(preferences.weatherWindKmhThreshold),
        }),
      });
      setPreferences(saved);
      setNotice('Preferencias guardadas.');
    } catch (reason) {
      setError(accountErrorMessage(reason, 'No se han podido guardar las preferencias.'));
    } finally {
      setBusy(false);
    }
  }

  async function requestExport() {
    setExportBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await jsonRequest<{ export: AccountExport }>('/api/v1/account/exports', {
        method: 'POST',
      });
      setExports((current) => [result.export, ...current.filter((item) => item.id !== result.export.id)]);
      setNotice(result.export.status === 'ready' ? 'Ya tienes una copia preparada y vigente.' : 'Copia solicitada. Puedes seguir usando la aplicación mientras se prepara.');
    } catch (reason) {
      setError(accountErrorMessage(reason, 'No se ha podido solicitar la copia de tus datos.'));
    } finally {
      setExportBusy(false);
    }
  }

  if (loading) return <div className="loading-screen" role="status">Cargando Mi Cuenta…</div>;

  return (
    <main className="account-shell">
      <VisualHeader />
      <PublicNavigation activePath="/cuenta" />

      <div className="account-page">
        <section>
          <p className="eyebrow page-eyebrow">MI PERFIL</p>
          <h1 className="section-title">Mi perfil</h1>
          <p className="section-copy">Tu cuenta, tus preferencias y tus accesos personales.</p>
        </section>

        {error ? <div className="alert section" role="alert">{error}</div> : null}
        {notice ? <div className="alert success section" role="status">{notice}</div> : null}
        {!preferencesReady || error ? <button className="secondary-button" onClick={() => setRetry((value) => value + 1)}>Reintentar carga</button> : null}

        <section className="section card card-body account-profile-summary" id="perfil">
          <h2 className="section-title account-section-title">Tu perfil</h2>
          <p className="list-card-title">{user?.name || (user ? 'Tu cuenta' : 'Perfil no disponible')}</p>
          <p className="list-card-meta">{user?.email}</p>
          <div className="form-actions"><a className="primary-button" href="/perfil/editar">Editar perfil →</a><a className="secondary-button" href="/tu-olivo">Tu Olivo y recompensas →</a><button className="secondary-button" disabled={busy} onClick={() => void signOut()}>{busy ? 'Espera…' : 'Cerrar sesión'}</button></div>
        </section>

        <nav className="section more-links" aria-label="Opciones de tu cuenta">
          <a className="card list-card" href="/perfil/preferencias">Preferencias de Inicio →</a>
          <a className="card list-card" href="/perfil/privacidad">Privacidad y permisos →</a>
          <a className="card list-card" href="/perfil/soporte">Ayuda y soporte →</a>
        </nav>
        <fieldset disabled={!preferencesReady || busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <section className="section card card-body" id="cooperativa">
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

        <section className="section card card-body" id="notificaciones">
          <p className="eyebrow account-group-label">NOTIFICACIONES GENERALES</p>
          <h2 className="section-title account-section-title">Notificaciones</h2>
          <p className="section-copy">La alarma de lluvia se revisa automáticamente en el servidor para los próximos 2 días con la predicción municipal de AEMET y tu umbral. Helada y viento siguen apareciendo como avisos meteorológicos complementarios. Son contexto para organizarte, no un diagnóstico de parcela.</p>

          <label className="account-toggle">
            <input type="checkbox" checked={preferences.notifyWeather} onChange={(event) => setPreferences((current) => ({ ...current, notifyWeather: event.target.checked }))} />
            <span><strong>Tiempo</strong><small>Alarma automática de lluvia y avisos de helada y viento según tus umbrales.</small></span>
          </label>
          <label className="account-toggle">
            <input type="checkbox" checked={preferences.notifyTasks} onChange={(event) => setPreferences((current) => ({ ...current, notifyTasks: event.target.checked }))} />
            <span><strong>Tareas</strong><small>Preferencia guardada para cuando el calendario esté activo.</small></span>
          </label>
          <label className="account-toggle">
            <input type="checkbox" checked={preferences.notifyPendingYield} onChange={(event) => setPreferences((current) => ({ ...current, notifyPendingYield: event.target.checked }))} />
            <span><strong>Rendimientos pendientes</strong><small>Entregas que todavía no tienen resultado.</small></span>
          </label>

          <div className="account-threshold-grid">
            <div className="field">
              <label htmlFor="rain-threshold">Alarma de lluvia desde (%)</label>
              <input id="rain-threshold" type="number" min="0" max="100" step="1" inputMode="numeric" value={preferences.weatherRainProbabilityPercentThreshold} onChange={(event) => setPreferences((current) => ({ ...current, weatherRainProbabilityPercentThreshold: Number(event.target.value) }))} disabled={!preferences.notifyWeather} />
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

        </fieldset>
        <section className="section card card-body account-privacy-card" id="privacidad">
          <h2 className="section-title account-section-title">Copia de tus datos</h2>
          <p className="section-copy">Puedes preparar una copia estructurada y versionada de tu perfil, preferencias y de las explotaciones donde eres propietario: fincas, parcelas, campañas, entregas, rendimientos, labores e índice de documentos.</p>
          <p className="section-copy"><strong>Importante:</strong> esta fase no incluye todavía los archivos binarios originales dentro de un ZIP. El índice sí conserva nombre, tipo, tamaño y hash cuando existe; los documentos siguen disponibles mediante descarga privada.</p>

          {latestExport ? (
            <div className="card list-card account-export-status">
              <div className="list-card-main">
                <p className="list-card-title">{exportStatusLabel(latestExport.status)}</p>
                <p className="list-card-meta">
                  Solicitada {new Date(latestExport.requestedAt).toLocaleString('es-ES')}
                  {formatBytes(latestExport.sizeBytes) ? ` · ${formatBytes(latestExport.sizeBytes)}` : ''}
                </p>
                {latestExport.expiresAt && latestExport.status === 'ready' ? <p className="list-card-meta">Disponible hasta {new Date(latestExport.expiresAt).toLocaleString('es-ES')}.</p> : null}
                {latestExport.error ? <p className="list-card-meta">No se pudo preparar la copia. Puedes volver a solicitarla.</p> : null}
              </div>
              {latestExport.downloadUrl ? <a className="secondary-button account-download-link" href={latestExport.downloadUrl}>Descargar JSON</a> : <span className="badge">{exportStatusLabel(latestExport.status)}</span>}
            </div>
          ) : null}

          <div className="form-actions account-export-actions">
            <button className="secondary-button" type="button" onClick={() => void requestExport()} disabled={exportBusy || latestExport?.status === 'requested' || latestExport?.status === 'generating'}>
              {exportBusy ? 'Solicitando…' : latestExport?.status === 'ready' ? 'Usar copia vigente' : 'Preparar copia de mis datos'}
            </button>
          </div>

          <p className="section-copy"><strong>Baja de cuenta:</strong> sigue separada de la exportación. No mostraremos una acción destructiva hasta implementar reautenticación, ownership, revocación de sesiones y política de retención completa.</p>
        </section>

        <div className="section form-actions account-save-row" id="preferencias">
          <button className="primary-button" type="button" onClick={() => void save()} disabled={busy || !preferencesReady}>{busy ? 'Guardando…' : 'Guardar preferencias'}</button>
        </div>
      </div>
    </main>
  );
}
