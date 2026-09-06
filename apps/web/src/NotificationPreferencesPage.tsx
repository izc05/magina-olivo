import { Award, BarChart3, BellRing, CalendarDays, CloudRain, FileText, Newspaper, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PublicNavigation } from './PublicNavigation';
import { VisualHeader } from './VisualChrome';

type Preferences = {
  preferredCooperativeId: string | null;
  notifyWeather: boolean;
  notifyTasks: boolean;
  notifyPendingYield: boolean;
  weatherRainProbabilityPercentThreshold: number;
  weatherFrostCThreshold: number;
  weatherWindKmhThreshold: number;
};
type LocalNotificationKey = 'cooperative' | 'market' | 'news' | 'rewards' | 'documents';
const LOCAL_NOTIFICATION_KEY = 'magina-notification-preferences-v1';

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...init, credentials: 'include', headers: { accept: 'application/json', ...(init.body ? { 'content-type': 'application/json' } : {}) } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

export function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [localPreferences, setLocalPreferences] = useState<Record<LocalNotificationKey, boolean>>(() => {
    const defaults = { cooperative: true, market: true, news: true, rewards: true, documents: true };
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(LOCAL_NOTIFICATION_KEY) || '{}') }; } catch { return defaults; }
  });

  useEffect(() => {
    void request<Preferences>('/api/v1/account/preferences').then(setPreferences).catch(() => setError('No se han podido cargar tus notificaciones.'));
  }, []);

  function toggle(key: 'notifyWeather' | 'notifyTasks' | 'notifyPendingYield') {
    setPreferences((current) => current ? { ...current, [key]: !current[key] } : current);
    setNotice(null);
  }
  function toggleLocal(key: LocalNotificationKey) {
    setLocalPreferences((current) => {
      const next = { ...current, [key]: !current[key] };
      localStorage.setItem(LOCAL_NOTIFICATION_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function save() {
    if (!preferences) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await request<Preferences>('/api/v1/account/preferences', { method: 'PUT', body: JSON.stringify(preferences) });
      setPreferences(saved);
      setNotice('Notificaciones guardadas.');
    } catch {
      setError('No se han podido guardar tus notificaciones.');
    } finally {
      setBusy(false);
    }
  }

  if (!preferences && !error) return <div className="loading-screen" role="status">Cargando notificaciones…</div>;

  const generalRows = preferences ? [
    { kind: 'server' as const, key: 'notifyWeather' as const, icon: CloudRain, title: 'Alertas de lluvia', copy: 'Avisos en tiempo real y previsiones relevantes.' },
    { kind: 'local' as const, key: 'cooperative' as const, icon: Users, title: 'Avisos de cooperativa', copy: 'Comunicados, reuniones y novedades.' },
    { kind: 'local' as const, key: 'market' as const, icon: BarChart3, title: 'Mercado AOVE', copy: 'Precios, tendencias y oportunidades.' },
    { kind: 'local' as const, key: 'news' as const, icon: Newspaper, title: 'Noticias y ayudas', copy: 'Novedades del sector y convocatorias.' },
  ] : [];
  const fieldRows = preferences ? [
    { kind: 'local' as const, key: 'rewards' as const, icon: Award, title: 'Recompensas y aceitunas', copy: 'Logros, puntos y campañas especiales.' },
    { kind: 'server' as const, key: 'notifyTasks' as const, icon: CalendarDays, title: 'Recordatorios de tareas', copy: 'Riego, tratamientos, poda y más.' },
    { kind: 'local' as const, key: 'documents' as const, icon: FileText, title: 'Documentos', copy: 'Avisos sobre certificados, informes y trámites.' },
  ] : [];

  return <main className="account-shell notification-preferences-shell">
    <VisualHeader />
    <PublicNavigation activePath="/mi-magina" />
    <div className="account-page">
      <a className="profile-back-link" href="/mi-magina">← Perfil</a>
      <section><p className="eyebrow page-eyebrow">MI PERFIL</p><h1 className="section-title">Notificaciones</h1><p className="section-copy">Elige qué información quieres recibir. Te avisaremos para que no pierdas nada importante de tu olivar.</p></section>
      {error ? <div className="alert section" role="alert">{error}</div> : null}
      {notice ? <div className="alert success section" role="status">{notice}</div> : null}
      {preferences ? <>
        <section className="section card notification-important-card">
          <span className="notification-important-icon"><BellRing aria-hidden="true" /></span>
          <span><small>ALERTA IMPORTANTE</small><strong>Activa las alertas de lluvia</strong><p>Recibe avisos inmediatos de lluvias intensas en tu zona para proteger tu olivar.</p></span>
          <button className={`profile-switch${preferences.notifyWeather ? ' is-on' : ''}`} type="button" role="switch" aria-checked={preferences.notifyWeather} onClick={() => toggle('notifyWeather')}><span /></button>
        </section>
        <section className="section notification-settings" aria-labelledby="notification-general-title">
          <p className="eyebrow account-group-label" id="notification-general-title">NOTIFICACIONES GENERALES</p>
          {generalRows.map(({ kind, key, icon: Icon, title, copy }) => <article className="card notification-setting-row" key={key}>
            <span className="profile-link-icon"><Icon aria-hidden="true" /></span>
            <span><strong>{title}</strong><small>{copy}</small></span>
            <button className={`profile-switch${(kind === 'server' ? preferences[key] : localPreferences[key]) ? ' is-on' : ''}`} type="button" role="switch" aria-label={title} aria-checked={kind === 'server' ? preferences[key] : localPreferences[key]} onClick={() => kind === 'server' ? toggle(key) : toggleLocal(key)}><span /></button>
          </article>)}
        </section>
        <section className="section notification-settings" aria-labelledby="notification-field-title">
          <p className="eyebrow account-group-label" id="notification-field-title">TU EXPLOTACIÓN</p>
          {fieldRows.map(({ kind, key, icon: Icon, title, copy }) => <article className="card notification-setting-row" key={key}>
            <span className="profile-link-icon"><Icon aria-hidden="true" /></span><span><strong>{title}</strong><small>{copy}</small></span>
            <button className={`profile-switch${(kind === 'server' ? preferences[key] : localPreferences[key]) ? ' is-on' : ''}`} type="button" role="switch" aria-label={title} aria-checked={kind === 'server' ? preferences[key] : localPreferences[key]} onClick={() => kind === 'server' ? toggle(key) : toggleLocal(key)}><span /></button>
          </article>)}
        </section>
        <div className="section edit-profile-actions"><button className="primary-button" type="button" disabled={busy} onClick={() => void save()}>{busy ? 'Guardando…' : 'Guardar notificaciones'}</button></div>
      </> : null}
    </div>
  </main>;
}
