import { useEffect, useState } from 'react';
import { Activity, Bell, Building2, ChartNoAxesCombined, CircleAlert, Crown, Database, ExternalLink, Eye, Gauge, Leaf, LogOut, MapPinned, Newspaper, RefreshCw, ShieldCheck, Sprout, UserRound, Users } from 'lucide-react';
import { VisualHeader } from './VisualChrome';
import { api } from './api';
import { listPendingOperations } from './offline/outbox';

type AdminRole = 'super_admin' | 'admin' | 'editor' | 'support';
type Overview = {
  role: AdminRole;
  generatedAt: string;
  metrics: {
    users: number;
    holdings: number;
    activeFarms: number;
    activePlots: number;
    publicCooperatives: number;
    activeCampaigns: number;
  };
};
type PublicSource = {
  key: string;
  label: string;
  provider: string;
  frequency: string | null;
  active: boolean;
  status: 'healthy' | 'degraded' | 'pending' | 'paused';
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  canInspect: boolean;
};
type PublicSources = { canManage: boolean; sources: PublicSource[] };
type AdminNewsItem = { id: string; sourceKey: string; sourceLabel: string; title: string; sourceUrl: string; publishedAt: string; topic: string | null; active: boolean };
type AdminNews = { canManage: boolean; items: AdminNewsItem[] };
type AdminActivityItem = { id: string; action: string; targetType: string | null; targetId: string | null; createdAt: string };
type AdminActivity = { items: AdminActivityItem[] };

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'include', headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

async function requestJson<T>(url: string, body?: unknown): Promise<T> {
  const options: RequestInit = {
    method: 'POST',
    credentials: 'include',
    headers: { accept: 'application/json', ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
  };
  if (body !== undefined) options.body = JSON.stringify(body);
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

function formatMetric(value: number): string {
  return new Intl.NumberFormat('es-ES').format(value);
}

function errorMessage(reason: unknown): string {
  if (reason instanceof Error && reason.message === 'HTTP 403') {
    return 'Tu cuenta ha iniciado sesión, pero todavía no tiene permiso de administración de plataforma.';
  }
  return 'No se ha podido cargar el panel ahora. Tus datos de Mi Campo siguen protegidos y no se han modificado.';
}

function sourceStatusLabel(status: PublicSource['status']): string {
  return ({ healthy: 'Correcta', degraded: 'Con incidencia', pending: 'Pendiente', paused: 'Pausada' })[status];
}

function formatSourceTime(value: string | null): string {
  if (!value) return 'Aún sin comprobación';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function activityLabel(action: string): string {
  return ({
    'admin.overview.read': 'Panel consultado',
    'admin.public_sources.read': 'Fuentes públicas consultadas',
    'admin.news.read': 'Noticias verificadas consultadas',
    'admin.news.visibility.updated': 'Visibilidad de noticia modificada',
    'admin.public_source.inspect.requested': 'Revisión de fuente solicitada',
  } as Record<string, string>)[action] ?? action.replaceAll('.', ' · ');
}

export function AdminDashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [publicSources, setPublicSources] = useState<PublicSources | null>(null);
  const [news, setNews] = useState<AdminNews | null>(null);
  const [activity, setActivity] = useState<AdminActivity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [refreshingSource, setRefreshingSource] = useState<string | null>(null);
  const [savingNewsId, setSavingNewsId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void readJson<Overview>('/api/v1/admin/overview')
      .then((result) => { if (!cancelled) setOverview(result); })
      .catch((reason) => { if (!cancelled) setError(errorMessage(reason)); });
    void readJson<PublicSources>('/api/v1/admin/public-sources')
      .then((result) => { if (!cancelled) setPublicSources(result); })
      .catch(() => { if (!cancelled) setPublicSources({ canManage: false, sources: [] }); });
    void readJson<AdminNews>('/api/v1/admin/news')
      .then((result) => { if (!cancelled) setNews(result); })
      .catch(() => { if (!cancelled) setNews({ canManage: false, items: [] }); });
    void readJson<AdminActivity>('/api/v1/admin/activity')
      .then((result) => { if (!cancelled) setActivity(result); })
      .catch(() => { if (!cancelled) setActivity({ items: [] }); });
    return () => { cancelled = true; };
  }, []);

  async function inspectSource(source: PublicSource) {
    setRefreshingSource(source.key);
    try {
      await requestJson(`/api/v1/admin/public-sources/${encodeURIComponent(source.key)}/inspect`);
      const refreshed = await readJson<PublicSources>('/api/v1/admin/public-sources');
      setPublicSources(refreshed);
    } finally {
      setRefreshingSource(null);
    }
  }

  async function setNewsVisibility(item: AdminNewsItem, active: boolean) {
    setSavingNewsId(item.id);
    try {
      const result = await requestJson<{ id: string; active: boolean }>(`/api/v1/admin/news/${encodeURIComponent(item.id)}/visibility`, { active });
      setNews((current) => current ? { ...current, items: current.items.map((newsItem) => newsItem.id === result.id ? { ...newsItem, active: result.active } : newsItem) } : current);
    } finally {
      setSavingNewsId(null);
    }
  }

  async function signOut() {
    setSigningOut(true);
    setAccountError(null);
    try {
      const session = await api.me();
      const pending = await listPendingOperations(session.user.id);
      if (pending.length) throw new Error('Sincroniza los cambios pendientes de Mi Campo antes de cerrar sesión.');
      await api.signOut();
      window.location.assign('/login');
    } catch (reason) {
      setAccountError(reason instanceof Error ? reason.message : 'No se ha podido cerrar la sesión.');
      setSigningOut(false);
    }
  }

  if (!overview) {
    if (!error) return <main className="admin-access-gate" role="status">Comprobando acceso de administración…</main>;
    return <main className="admin-access-gate" id="main-content"><VisualHeader /><section className="admin-access-card card"><span className="admin-icon"><Crown aria-hidden="true" /></span><p className="eyebrow">Administración interna</p><h1>Acceso restringido</h1><p>{error}</p><a className="primary-button" href="/cuenta">Volver a tu perfil</a></section></main>;
  }

  const metrics = [
    { label: 'Usuarios registrados', value: overview.metrics.users, detail: 'cuentas de plataforma', icon: Users },
    { label: 'Explotaciones', value: overview.metrics.holdings, detail: 'registros privados', icon: MapPinned },
    { label: 'Fincas activas', value: overview.metrics.activeFarms, detail: 'en Mi Campo', icon: Sprout },
    { label: 'Parcelas activas', value: overview.metrics.activePlots, detail: 'en seguimiento', icon: Leaf },
    { label: 'Cooperativas públicas', value: overview.metrics.publicCooperatives, detail: 'fichas vigentes', icon: Building2 },
    { label: 'Campañas activas', value: overview.metrics.activeCampaigns, detail: 'agregado de plataforma', icon: ChartNoAxesCombined },
  ];
  const healthySources = publicSources?.sources.filter((source) => source.status === 'healthy').length ?? 0;
  const visibleNews = news?.items.filter((item) => item.active).length ?? 0;

  return <main className="admin-preview" id="main-content">
    <VisualHeader><div className="admin-preview-header-actions"><span><Crown aria-hidden="true" /> {overview.role === 'super_admin' ? 'Superadministración' : 'Administración'}</span><button type="button" aria-label="Notificaciones de administración" disabled><Bell aria-hidden="true" /></button><details className="admin-account-menu"><summary aria-label="Abrir menú de cuenta"><b aria-hidden="true">AD</b></summary><div><a href="/cuenta"><UserRound aria-hidden="true" /> Mi cuenta</a><button type="button" disabled={signingOut} onClick={() => void signOut()}><LogOut aria-hidden="true" /> {signingOut ? 'Cerrando…' : 'Cerrar sesión'}</button></div></details></div></VisualHeader>
    {accountError ? <div className="admin-session-error" role="alert"><CircleAlert aria-hidden="true" />{accountError}</div> : null}
    <section className="admin-preview-hero" aria-labelledby="admin-dashboard-title"><div><p className="eyebrow">Panel de administración</p><h1 id="admin-dashboard-title">Mágina Olivo, bajo control</h1><p>Gestiona la plataforma y sus contenidos públicos. Este panel no abre documentos ni datos productivos de agricultores.</p></div><span><MapPinned aria-hidden="true" /> Sierra Mágina<small>Consola interna</small></span></section>
    <nav className="admin-workspace-nav" aria-label="Secciones de administración">
      <a href="#admin-overview"><Gauge aria-hidden="true" /><span>Resumen</span></a>
      <a href="#admin-sources"><Database aria-hidden="true" /><span>Fuentes</span></a>
      <a href="#admin-news"><Newspaper aria-hidden="true" /><span>Noticias</span></a>
      <a href="#admin-activity"><Activity aria-hidden="true" /><span>Actividad</span></a>
      <a href="/magina/directorio"><Building2 aria-hidden="true" /><span>Cooperativas</span></a>
      <a href="/" target="_blank" rel="noreferrer"><Eye aria-hidden="true" /><span>Ver app</span></a>
    </nav>
    <section className="admin-preview-heading" id="admin-overview" aria-labelledby="admin-section-title"><div><p className="eyebrow">Administración · resumen</p><h2 id="admin-section-title">Visión general</h2><p>Actualizado {new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(overview.generatedAt))}</p></div></section>
    <section className="admin-preview-metrics" aria-label="Métricas agregadas de plataforma">{metrics.map(({ label, value, detail, icon: Icon }) => <article className="admin-metric-card" key={label}><span className="admin-icon"><Icon aria-hidden="true" /></span><div><small>{label}</small><strong>{formatMetric(value)}</strong><em>{detail}</em></div></article>)}</section>
    <section className="admin-operational-strip" aria-label="Estado operativo">
      <article><span className="admin-icon"><ShieldCheck aria-hidden="true" /></span><div><small>Fuentes correctas</small><strong>{healthySources} de {publicSources?.sources.length ?? '—'}</strong></div></article>
      <article><span className="admin-icon"><Newspaper aria-hidden="true" /></span><div><small>Noticias visibles</small><strong>{visibleNews} de {news?.items.length ?? '—'}</strong></div></article>
      <article><span className="admin-icon"><Crown aria-hidden="true" /></span><div><small>Nivel de acceso</small><strong>{overview.role === 'super_admin' ? 'Control total' : overview.role}</strong></div></article>
    </section>
    <section className="admin-preview-grid">
      <article className="admin-panel card" aria-labelledby="admin-scope-title"><header><span><Activity aria-hidden="true" /><h2 id="admin-scope-title">Alcance actual</h2></span></header><ul><li><span className="admin-icon"><Database aria-hidden="true" /></span><div><strong>Solo métricas agregadas</strong><small>Sin listado de personas, ubicaciones ni documentos privados.</small></div></li><li><span className="admin-icon"><Crown aria-hidden="true" /></span><div><strong>Permiso separado</strong><small>El rol de plataforma no sustituye los permisos de cada explotación.</small></div></li></ul></article>
      <article className="admin-panel admin-quick-panel card" aria-labelledby="admin-next-title"><header><span><Activity aria-hidden="true" /><h2 id="admin-next-title">Acciones rápidas</h2></span></header><div className="admin-quick-actions"><a href="#admin-news"><Newspaper aria-hidden="true" /><span><strong>Revisar noticias</strong><small>Publicar u ocultar referencias</small></span></a><a href="#admin-sources"><RefreshCw aria-hidden="true" /><span><strong>Comprobar fuentes</strong><small>Estado y última revisión</small></span></a><a href="/magina/directorio"><Building2 aria-hidden="true" /><span><strong>Ver cooperativas</strong><small>Comprobar fichas públicas</small></span></a></div></article>
    </section>
    <section id="admin-sources" className="admin-panel admin-source-panel card" aria-labelledby="admin-source-title"><header><span><Database aria-hidden="true" /><h2 id="admin-source-title">Fuentes públicas</h2></span><small>Estado y trazabilidad</small></header>{!publicSources ? <p className="admin-source-loading">Consultando fuentes…</p> : <ul>{publicSources.sources.map((source) => <li key={source.key} className="admin-source-row"><span className={`admin-source-status ${source.status}`} aria-label={sourceStatusLabel(source.status)} /><div><strong>{source.label}</strong><small>{source.provider} · {source.frequency ?? 'Sin frecuencia declarada'} · Última comprobación: {formatSourceTime(source.lastCheckedAt)}</small>{source.lastError ? <em><CircleAlert aria-hidden="true" /> {source.lastError}</em> : null}</div><span className="admin-source-actions"><b className={`admin-source-badge ${source.status}`}>{sourceStatusLabel(source.status)}</b>{publicSources.canManage && source.canInspect ? <button type="button" disabled={refreshingSource === source.key} onClick={() => void inspectSource(source)}>{refreshingSource === source.key ? 'En cola…' : <><RefreshCw aria-hidden="true" /> Revisar</>}</button> : null}</span></li>)}</ul>}</section>
    <section id="admin-news" className="admin-panel admin-news-panel card" aria-labelledby="admin-news-title"><header><span><Newspaper aria-hidden="true" /><h2 id="admin-news-title">Noticias verificadas</h2></span><small>Solo referencias y visibilidad</small></header>{!news ? <p className="admin-source-loading">Consultando noticias…</p> : news.items.length === 0 ? <p className="admin-source-loading">No hay referencias disponibles.</p> : <ul>{news.items.map((item) => <li key={item.id} className="admin-news-row"><span className={`admin-source-status ${item.active ? 'healthy' : 'paused'}`} aria-label={item.active ? 'Publicada' : 'Oculta'} /><div><strong>{item.title}</strong><small>{item.sourceLabel} · {new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(item.publishedAt))}{item.topic ? ` · ${item.topic}` : ''}</small></div><span className="admin-news-actions"><a href={item.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Abrir fuente de ${item.title}`}><ExternalLink aria-hidden="true" /></a>{news.canManage ? <button type="button" disabled={savingNewsId === item.id} onClick={() => void setNewsVisibility(item, !item.active)}>{savingNewsId === item.id ? 'Guardando…' : item.active ? 'Ocultar' : 'Publicar'}</button> : <b className={`admin-source-badge ${item.active ? 'healthy' : 'paused'}`}>{item.active ? 'Publicada' : 'Oculta'}</b>}</span></li>)}</ul>}<p className="admin-news-policy">No se edita el titular ni el enlace: se conserva la fuente oficial y se audita cada cambio de visibilidad.</p></section>
    <section id="admin-activity" className="admin-panel admin-activity-panel card" aria-labelledby="admin-activity-title"><header><span><Activity aria-hidden="true" /><h2 id="admin-activity-title">Actividad administrativa</h2></span><small>Registro de seguridad</small></header>{!activity ? <p className="admin-source-loading">Consultando actividad…</p> : activity.items.length === 0 ? <p className="admin-source-loading">Todavía no hay acciones registradas.</p> : <ol>{activity.items.map((item) => <li key={item.id}><span className="admin-icon"><ShieldCheck aria-hidden="true" /></span><div><strong>{activityLabel(item.action)}</strong><small>{item.targetType ? `${item.targetType}${item.targetId ? ` · ${item.targetId.slice(0, 12)}` : ''}` : 'Consola de plataforma'}</small></div><time dateTime={item.createdAt}>{new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.createdAt))}</time></li>)}</ol>}</section>
  </main>;
}
