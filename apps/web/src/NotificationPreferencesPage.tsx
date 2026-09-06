import { BarChart3, BellRing, CalendarDays, CloudRain } from 'lucide-react';
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

  useEffect(() => {
    void request<Preferences>('/api/v1/account/preferences').then(setPreferences).catch(() => setError('No se han podido cargar tus notificaciones.'));
  }, []);

  function toggle(key: 'notifyWeather' | 'notifyTasks' | 'notifyPendingYield') {
    setPreferences((current) => current ? { ...current, [key]: !current[key] } : current);
    setNotice(null);
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

  const rows = preferences ? [
    { key: 'notifyWeather' as const, icon: CloudRain, title: 'Alertas de lluvia', copy: 'Avisos municipales y previsiones relevantes.' },
    { key: 'notifyTasks' as const, icon: CalendarDays, title: 'Recordatorios de tareas', copy: 'Riego, tratamientos, poda y labores pendientes.' },
    { key: 'notifyPendingYield' as const, icon: BarChart3, title: 'Rendimientos pendientes', copy: 'Entregas que todavía no tienen resultado.' },
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
          <span><small>ALERTA IMPORTANTE</small><strong>Activa las alertas de lluvia</strong><p>Recibe avisos de previsión para organizar el trabajo en tu olivar.</p></span>
          <button className={`profile-switch${preferences.notifyWeather ? ' is-on' : ''}`} type="button" role="switch" aria-checked={preferences.notifyWeather} onClick={() => toggle('notifyWeather')}><span /></button>
        </section>
        <section className="section notification-settings" aria-labelledby="notification-general-title">
          <p className="eyebrow account-group-label" id="notification-general-title">NOTIFICACIONES GENERALES</p>
          {rows.map(({ key, icon: Icon, title, copy }) => <article className="card notification-setting-row" key={key}>
            <span className="profile-link-icon"><Icon aria-hidden="true" /></span>
            <span><strong>{title}</strong><small>{copy}</small></span>
            <button className={`profile-switch${preferences[key] ? ' is-on' : ''}`} type="button" role="switch" aria-label={title} aria-checked={preferences[key]} onClick={() => toggle(key)}><span /></button>
          </article>)}
        </section>
        <div className="section edit-profile-actions"><button className="primary-button" type="button" disabled={busy} onClick={() => void save()}>{busy ? 'Guardando…' : 'Guardar notificaciones'}</button></div>
      </> : null}
    </div>
  </main>;
}
