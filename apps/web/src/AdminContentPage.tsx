import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

type NewsItem = {
  id: string;
  title: string;
  sourceUrl: string;
  publishedAt: string;
  topic: string | null;
  active: boolean;
  featured: boolean;
  provider: string;
};

type AlertOverview = {
  summary: {
    active_alerts: number;
    affected_users: number;
    affected_holdings: number;
    upcoming_days: number;
  };
  municipalities: Array<{
    municipalitySlug: string;
    municipalityName: string;
    activeAlerts: number;
    maxProbabilityPercent: number;
    nextForecastDate: string;
  }>;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  severity: 'info' | 'notice' | 'warning' | 'urgent';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'expired';
  audience: 'all' | 'authenticated';
  startsAt: string | null;
  endsAt: string | null;
};

type LoadState = 'loading' | 'ready' | 'forbidden' | 'error';

async function adminRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body) headers.set('content-type', 'application/json');
  const response = await fetch(url, { ...init, headers, credentials: 'include' });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    try {
      const body = await response.json() as { error?: { message?: string }; message?: string };
      if (body.error?.message) error.message = body.error.message;
      else if (body.message) error.message = body.message;
    } catch {
      // Keep generic status.
    }
    throw error;
  }
  return await response.json() as T;
}

function formatDate(value: string | null): string {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sin fecha' : date.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}

export function AdminContentPage() {
  const [state, setState] = useState<LoadState>('loading');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [alerts, setAlerts] = useState<AlertOverview | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [severity, setSeverity] = useState<Announcement['severity']>('notice');
  const [status, setStatus] = useState<Announcement['status']>('draft');
  const [audience, setAudience] = useState<Announcement['audience']>('all');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [newsResult, alertResult, announcementResult] = await Promise.all([
        adminRequest<{ items: NewsItem[] }>('/api/v1/admin/content/news'),
        adminRequest<AlertOverview>('/api/v1/admin/alerts/overview'),
        adminRequest<{ items: Announcement[] }>('/api/v1/admin/content/announcements'),
      ]);
      setNews(newsResult.items);
      setAlerts(alertResult);
      setAnnouncements(announcementResult.items);
      setState('ready');
    } catch (reason) {
      const code = (reason as { status?: number }).status;
      if (code === 401 || code === 403) setState('forbidden');
      else {
        setError(reason instanceof Error ? reason.message : 'No se ha podido cargar contenido y alertas.');
        setState('error');
      }
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeAnnouncements = useMemo(
    () => announcements.filter((item) => item.status === 'active' || item.status === 'scheduled'),
    [announcements],
  );

  async function patchNews(item: NewsItem, patch: { active?: boolean; featured?: boolean }) {
    setBusy(true); setNotice(null); setError(null);
    try {
      await adminRequest(`/api/v1/admin/content/news/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      setNotice('Noticia actualizada.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido actualizar la noticia.');
    } finally { setBusy(false); }
  }

  async function createAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setNotice(null); setError(null);
    try {
      await adminRequest('/api/v1/admin/content/announcements', {
        method: 'POST',
        body: JSON.stringify({
          title,
          body,
          severity,
          status,
          audience,
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        }),
      });
      setTitle(''); setBody(''); setStartsAt(''); setEndsAt(''); setStatus('draft');
      setNotice('Aviso guardado.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido guardar el aviso.');
    } finally { setBusy(false); }
  }

  async function changeAnnouncementStatus(item: Announcement, next: Announcement['status']) {
    setBusy(true); setNotice(null); setError(null);
    try {
      await adminRequest(`/api/v1/admin/content/announcements/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      setNotice(`Aviso ${next === 'active' ? 'publicado' : 'pausado'}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido actualizar el aviso.');
    } finally { setBusy(false); }
  }

  if (state === 'loading') return <main className="admin-loading" role="status">Abriendo contenido y alertas…</main>;
  if (state === 'forbidden') return <main className="admin-gate"><section className="admin-gate-card"><h1>Acceso restringido</h1><p>Se necesita autorización global de Mágina Olivo.</p><a className="admin-primary-link" href="/">Volver</a></section></main>;
  if (state === 'error') return <main className="admin-gate"><section className="admin-gate-card"><h1>No se ha podido cargar</h1><p>{error}</p><button className="admin-primary-button" onClick={() => void load()}>Reintentar</button></section></main>;

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/admin"><span className="admin-brand-mark">MO</span><span><strong>Mágina Olivo</strong><small>Contenido y alertas</small></span></a>
        <nav aria-label="Contenido y alertas">
          <a href="#avisos">Avisos</a>
          <a href="#alertas">Alertas de lluvia</a>
          <a href="#noticias">Noticias</a>
          <a href="/admin/operaciones">Operaciones</a>
          <a href="/admin">Panel principal</a>
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div><p className="admin-eyebrow">Comunicación</p><h1>Noticias, alertas y avisos</h1></div>
          <button className="admin-ghost-button" disabled={busy} onClick={() => void load()}>Actualizar</button>
        </header>
        {notice ? <div className="admin-notice" role="status">{notice}</div> : null}
        {error ? <div className="admin-error" role="alert">{error}</div> : null}

        <section id="avisos" className="admin-section">
          <div className="admin-section-heading"><div><p className="admin-eyebrow">Mágina Olivo</p><h2>Avisos propios</h2><p>Comunicaciones de la plataforma. Nunca se presentan como avisos oficiales de AEMET, RAIF o Protección Civil.</p></div><span className="admin-count">{activeAnnouncements.length} activos/programados</span></div>
          <div className="admin-two-column admin-content-grid">
            <form className="admin-card admin-form" onSubmit={createAnnouncement}>
              <div className="admin-card-heading"><h3>Nuevo aviso</h3><span>Plataforma</span></div>
              <label>Título<input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
              <label>Mensaje<textarea required rows={4} maxLength={1600} value={body} onChange={(event) => setBody(event.target.value)} /></label>
              <div className="admin-form-row">
                <label>Nivel<select value={severity} onChange={(event) => setSeverity(event.target.value as Announcement['severity'])}><option value="info">Información</option><option value="notice">Aviso</option><option value="warning">Atención</option><option value="urgent">Urgente</option></select></label>
                <label>Estado<select value={status} onChange={(event) => setStatus(event.target.value as Announcement['status'])}><option value="draft">Borrador</option><option value="scheduled">Programado</option><option value="active">Activo</option><option value="paused">Pausado</option></select></label>
              </div>
              <label>Audiencia<select value={audience} onChange={(event) => setAudience(event.target.value as Announcement['audience'])}><option value="all">Todos</option><option value="authenticated">Solo usuarios con cuenta</option></select></label>
              <div className="admin-form-row"><label>Inicio<input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label><label>Fin<input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></label></div>
              <button className="admin-primary-button" type="submit" disabled={busy}>Guardar aviso</button>
            </form>

            <div className="admin-card admin-content-list">
              <div className="admin-card-heading"><h3>Historial de avisos</h3><span>{announcements.length}</span></div>
              {announcements.length ? announcements.map((item) => (
                <article key={item.id} className={`admin-content-item severity-${item.severity}`}>
                  <div><strong>{item.title}</strong><p>{item.body}</p><small>{item.audience === 'all' ? 'Todos' : 'Usuarios con cuenta'} · {formatDate(item.startsAt)} → {formatDate(item.endsAt)}</small></div>
                  <div className="admin-content-actions"><span className={`admin-source-state ${item.status === 'active' ? 'ok' : item.status === 'scheduled' ? 'warning' : 'muted'}`}>{item.status}</span>{item.status === 'active' ? <button disabled={busy} onClick={() => void changeAnnouncementStatus(item, 'paused')}>Pausar</button> : <button disabled={busy} onClick={() => void changeAnnouncementStatus(item, 'active')}>Publicar</button>}</div>
                </article>
              )) : <p className="admin-empty">No hay avisos creados.</p>}
            </div>
          </div>
        </section>

        <section id="alertas" className="admin-section">
          <div className="admin-section-heading"><div><p className="admin-eyebrow">AEMET · Contexto</p><h2>Alertas automáticas de lluvia</h2><p>Probabilidad municipal configurada por usuarios. No equivale a avisos meteorológicos oficiales.</p></div></div>
          <div className="admin-stat-grid">
            <Stat value={alerts?.summary.active_alerts ?? 0} label="Alertas activas" />
            <Stat value={alerts?.summary.affected_users ?? 0} label="Usuarios afectados" />
            <Stat value={alerts?.summary.affected_holdings ?? 0} label="Explotaciones afectadas" />
            <Stat value={alerts?.summary.upcoming_days ?? 0} label="Días próximos" />
          </div>
          <div className="admin-card admin-table-card">
            <div className="admin-card-heading"><h3>Municipios con alerta</h3><span>{alerts?.municipalities.length ?? 0}</span></div>
            {alerts?.municipalities.length ? <div className="admin-table-wrap"><table><thead><tr><th>Municipio</th><th>Alertas</th><th>Probabilidad máx.</th><th>Próxima fecha</th></tr></thead><tbody>{alerts.municipalities.map((item) => <tr key={item.municipalitySlug}><td><strong>{item.municipalityName}</strong></td><td>{item.activeAlerts}</td><td>{item.maxProbabilityPercent}%</td><td>{new Date(`${item.nextForecastDate}T12:00:00`).toLocaleDateString('es-ES')}</td></tr>)}</tbody></table></div> : <p className="admin-empty">No hay alertas activas de lluvia.</p>}
          </div>
        </section>

        <section id="noticias" className="admin-section">
          <div className="admin-section-heading"><div><p className="admin-eyebrow">Editorial</p><h2>Noticias verificadas</h2><p>Puedes destacar u ocultar metadatos de noticias oficiales. El artículo original sigue perteneciendo a su fuente.</p></div></div>
          <div className="admin-card admin-content-list">
            {news.map((item) => (
              <article key={item.id} className={`admin-content-item ${item.featured ? 'is-featured' : ''}`}>
                <div><strong>{item.title}</strong><p>{item.provider}{item.topic ? ` · ${item.topic}` : ''}</p><small>{new Date(item.publishedAt).toLocaleDateString('es-ES')}</small></div>
                <div className="admin-content-actions"><span className={`admin-source-state ${item.active ? 'verified' : 'muted'}`}>{item.active ? 'visible' : 'oculta'}</span><button disabled={busy} onClick={() => void patchNews(item, { featured: !item.featured })}>{item.featured ? 'Quitar destacado' : 'Destacar'}</button><button disabled={busy} onClick={() => void patchNews(item, { active: !item.active })}>{item.active ? 'Ocultar' : 'Mostrar'}</button><a href={item.sourceUrl} target="_blank" rel="noreferrer">Fuente</a></div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return <article className="admin-stat"><strong>{new Intl.NumberFormat('es-ES').format(value)}</strong><span>{label}</span></article>;
}
