import { useCallback, useEffect, useMemo, useState } from 'react';
import './admin-command-center.css';

type CommandCenter = {
  administrator: { email: string };
  snapshotAt: string;
  attentionCount: number;
  agriculture: {
    usersWithHolding: number;
    activeHoldings: number;
    activePlots: number;
    openCampaigns: number;
  };
  commercial: {
    pendingApplications: number;
    activeSponsorships: number;
    expiring14Days: number;
  };
  support: {
    openTickets: number;
    urgentTickets: number;
  };
  content: {
    activeAnnouncements: number;
    scheduledAnnouncements: number;
    activeRainAlerts: number;
    featuredNews: number;
  };
  sources: {
    withErrors: number;
    reviewDue: number;
  };
  legal: {
    missingActiveDocuments: number;
    draftDocuments: number;
  };
  system: {
    evidencePending: number;
    evidenceFailed: number;
  };
  audit: {
    eventsLast24Hours: number;
  };
};

type LoadState = 'loading' | 'ready' | 'forbidden' | 'error';
type AttentionTone = 'urgent' | 'warning' | 'notice';
type AttentionItem = {
  key: string;
  title: string;
  detail: string;
  count: number;
  href: string;
  action: string;
  tone: AttentionTone;
};

async function adminRequest<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    try {
      const body = await response.json() as { error?: { message?: string }; message?: string };
      error.message = body.error?.message ?? body.message ?? error.message;
    } catch {
      // Keep the generic status when the backend did not send JSON.
    }
    throw error;
  }
  return await response.json() as T;
}

function buildAttentionItems(data: CommandCenter): AttentionItem[] {
  const items: AttentionItem[] = [];

  if (data.support.urgentTickets > 0) {
    items.push({
      key: 'urgent-support',
      title: 'Soporte urgente',
      detail: 'Hay mensajes marcados como urgentes que conviene revisar primero.',
      count: data.support.urgentTickets,
      href: '/admin/soporte#soporte',
      action: 'Abrir soporte',
      tone: 'urgent',
    });
  }
  if (data.system.evidenceFailed > 0) {
    items.push({
      key: 'system-failed',
      title: 'Evidencia operativa fallida',
      detail: 'Existe al menos una comprobación de backup, restore o despliegue marcada como fallida.',
      count: data.system.evidenceFailed,
      href: '/admin/soporte#sistema',
      action: 'Revisar sistema',
      tone: 'urgent',
    });
  }
  if (data.sources.withErrors > 0) {
    items.push({
      key: 'source-errors',
      title: 'Fuentes con error',
      detail: 'Una fuente pública ha registrado un error y necesita revisión antes de confiar en su actualización.',
      count: data.sources.withErrors,
      href: '/admin/operaciones#fuentes',
      action: 'Ver fuentes',
      tone: 'warning',
    });
  }
  if (data.support.openTickets > 0) {
    items.push({
      key: 'support-open',
      title: 'Mensajes pendientes',
      detail: 'Tickets nuevos, en curso o esperando respuesta del usuario.',
      count: data.support.openTickets,
      href: '/admin/soporte#soporte',
      action: 'Gestionar bandeja',
      tone: 'notice',
    });
  }
  if (data.commercial.pendingApplications > 0) {
    items.push({
      key: 'commercial-pending',
      title: 'Solicitudes publicitarias',
      detail: 'Negocios esperando aprobación o rechazo de su solicitud.',
      count: data.commercial.pendingApplications,
      href: '/admin/publicidad#solicitudes',
      action: 'Revisar solicitudes',
      tone: 'notice',
    });
  }
  if (data.commercial.expiring14Days > 0) {
    items.push({
      key: 'commercial-expiring',
      title: 'Patrocinios próximos a vencer',
      detail: 'Campañas activas cuyo fin está previsto durante los próximos 14 días.',
      count: data.commercial.expiring14Days,
      href: '/admin/publicidad#publicidad',
      action: 'Revisar campañas',
      tone: 'warning',
    });
  }
  if (data.legal.missingActiveDocuments > 0) {
    items.push({
      key: 'legal-missing',
      title: 'Documentos legales sin versión activa',
      detail: 'Privacidad, cookies o términos todavía no tienen una versión publicada.',
      count: data.legal.missingActiveDocuments,
      href: '/admin/soporte#legal',
      action: 'Revisar legal',
      tone: 'warning',
    });
  }
  if (data.system.evidencePending > 0) {
    items.push({
      key: 'system-pending',
      title: 'Evidencias operativas pendientes',
      detail: 'Hay comprobaciones de backup, restore o release que aún no constan como OK.',
      count: data.system.evidencePending,
      href: '/admin/soporte#sistema',
      action: 'Ver evidencias',
      tone: 'warning',
    });
  }
  if (data.sources.reviewDue > 0) {
    items.push({
      key: 'source-review',
      title: 'Fuentes pendientes de revisión',
      detail: 'Fuentes activas que no constan revisadas durante los últimos siete días.',
      count: data.sources.reviewDue,
      href: '/admin/operaciones#fuentes',
      action: 'Comprobar fuentes',
      tone: 'notice',
    });
  }

  return items;
}

function formatSnapshot(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'ahora';
  return date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}

export function AdminCommandCenterPage() {
  const [state, setState] = useState<LoadState>('loading');
  const [data, setData] = useState<CommandCenter | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await adminRequest<CommandCenter>('/api/v1/admin/command-center');
      setData(result);
      setState('ready');
    } catch (reason) {
      const status = (reason as { status?: number }).status;
      if (status === 401 || status === 403) {
        setState('forbidden');
        return;
      }
      setError(reason instanceof Error ? reason.message : 'No se ha podido cargar el centro de mando.');
      setState('error');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const attentionItems = useMemo(() => data ? buildAttentionItems(data) : [], [data]);

  if (state === 'loading') {
    return <main className="admin-loading" role="status">Abriendo centro de mando…</main>;
  }

  if (state === 'forbidden') {
    return (
      <main className="admin-gate">
        <section className="admin-gate-card">
          <p className="admin-eyebrow">Mágina Olivo</p>
          <h1>Panel privado</h1>
          <p>Esta zona requiere una sesión autorizada como administrador global de la plataforma.</p>
          <a className="admin-primary-link" href="/">Volver a Mágina Olivo</a>
        </section>
      </main>
    );
  }

  if (state === 'error' || !data) {
    return (
      <main className="admin-gate">
        <section className="admin-gate-card">
          <h1>No se ha podido abrir el centro de mando</h1>
          <p>{error ?? 'Error inesperado.'}</p>
          <button className="admin-primary-button" type="button" onClick={() => void load()}>Reintentar</button>
        </section>
      </main>
    );
  }

  return (
    <div className="admin-shell admin-command-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/admin">
          <span className="admin-brand-mark">MO</span>
          <span><strong>Mágina Olivo</strong><small>Centro de mando</small></span>
        </a>
        <nav aria-label="Centro de mando">
          <a href="#resumen">Resumen</a>
          <a href="#atencion">Requiere atención</a>
          <a href="#contenido">Contenido y campo</a>
          <a href="#modulos">Módulos</a>
          <a href="#sistema">Sistema</a>
        </nav>
        <div className="admin-sidebar-footer">
          <small>Administrador</small>
          <span>{data.administrator.email}</span>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar admin-command-topbar">
          <div>
            <p className="admin-eyebrow">Control general</p>
            <h1>Centro de mando</h1>
            <p className="admin-command-subtitle">Lo importante de Mágina Olivo en una sola pantalla.</p>
          </div>
          <div className={`admin-attention-pill ${data.attentionCount > 0 ? 'has-attention' : 'is-clear'}`}>
            <span aria-hidden="true" />
            {data.attentionCount > 0 ? `${data.attentionCount} pendientes` : 'Sin pendientes detectados'}
          </div>
        </header>

        <section id="resumen" className="admin-section admin-command-section-first">
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Situación actual</p>
              <h2>Resumen operativo</h2>
              <p>Actualizado {formatSnapshot(data.snapshotAt)}. Los datos son agregados y no muestran información privada de parcelas ni documentos.</p>
            </div>
            <button className="admin-ghost-button" type="button" onClick={() => void load()}>Actualizar</button>
          </div>

          <div className="admin-command-kpis">
            <CommandKpi value={data.agriculture.usersWithHolding} label="Usuarios con explotación" />
            <CommandKpi value={data.agriculture.activeHoldings} label="Explotaciones activas" />
            <CommandKpi value={data.agriculture.activePlots} label="Parcelas activas" />
            <CommandKpi value={data.agriculture.openCampaigns} label="Campañas abiertas" />
            <CommandKpi value={data.commercial.activeSponsorships} label="Patrocinios activos" emphasis />
            <CommandKpi value={data.support.openTickets} label="Mensajes pendientes" alert={data.support.openTickets > 0} />
          </div>
        </section>

        <section id="atencion" className="admin-section">
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Prioridad</p>
              <h2>Requiere atención</h2>
              <p>Acciones que pueden afectar a usuarios, ingresos, fuentes públicas, cumplimiento o capacidad de recuperación.</p>
            </div>
          </div>

          {attentionItems.length ? (
            <div className="admin-attention-list">
              {attentionItems.map((item) => (
                <article className={`admin-attention-card tone-${item.tone}`} key={item.key}>
                  <div className="admin-attention-count">{item.count}</div>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                  <a href={item.href}>{item.action}</a>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-card admin-command-clear">
              <span aria-hidden="true">✓</span>
              <div><strong>No hay pendientes operativos detectados</strong><p>Las comprobaciones agregadas del panel no señalan acciones inmediatas.</p></div>
            </div>
          )}
        </section>

        <section id="contenido" className="admin-section">
          <div className="admin-section-heading">
            <div>
              <p className="admin-eyebrow">Información pública y campo</p>
              <h2>Contenido y alertas</h2>
            </div>
            <a className="admin-command-link" href="/admin/contenido">Gestionar contenido</a>
          </div>
          <div className="admin-command-kpis admin-command-kpis-four">
            <CommandKpi value={data.content.activeAnnouncements} label="Avisos de plataforma activos" />
            <CommandKpi value={data.content.scheduledAnnouncements} label="Avisos programados" />
            <CommandKpi value={data.content.activeRainAlerts} label="Alertas de lluvia activas" />
            <CommandKpi value={data.content.featuredNews} label="Noticias destacadas" />
          </div>
        </section>

        <section id="modulos" className="admin-section">
          <div className="admin-section-heading">
            <div><p className="admin-eyebrow">Gestión</p><h2>Módulos administrativos</h2><p>Cada bloque mantiene su propia responsabilidad y permisos server-side.</p></div>
          </div>
          <div className="admin-command-module-grid">
            <CommandModule href="/admin/publicidad" title="Publicidad" metric={`${data.commercial.pendingApplications} solicitudes`} detail={`${data.commercial.activeSponsorships} patrocinios activos`} />
            <CommandModule href="/admin/soporte" title="Soporte y legal" metric={`${data.support.openTickets} tickets abiertos`} detail={`${data.legal.missingActiveDocuments} documentos legales sin versión activa`} />
            <CommandModule href="/admin/contenido" title="Noticias y avisos" metric={`${data.content.activeAnnouncements} avisos activos`} detail={`${data.content.activeRainAlerts} alertas de lluvia`} />
            <CommandModule href="/admin/operaciones" title="Usuarios y directorio" metric={`${data.sources.withErrors} fuentes con error`} detail={`${data.audit.eventsLast24Hours} acciones admin · 24 h`} />
          </div>
        </section>

        <section id="sistema" className="admin-section">
          <div className="admin-section-heading">
            <div><p className="admin-eyebrow">Infraestructura y cumplimiento</p><h2>Salud operativa</h2><p>El panel informa sobre evidencias; nunca ejecuta una restauración desde el navegador.</p></div>
            <a className="admin-command-link" href="/admin/soporte#sistema">Abrir sistema</a>
          </div>
          <div className="admin-command-health-grid">
            <HealthCard label="Fuentes con error" value={data.sources.withErrors} state={data.sources.withErrors > 0 ? 'warning' : 'ok'} />
            <HealthCard label="Revisiones de fuente pendientes" value={data.sources.reviewDue} state={data.sources.reviewDue > 0 ? 'warning' : 'ok'} />
            <HealthCard label="Evidencias no OK" value={data.system.evidencePending} state={data.system.evidenceFailed > 0 ? 'danger' : data.system.evidencePending > 0 ? 'warning' : 'ok'} />
            <HealthCard label="Borradores legales" value={data.legal.draftDocuments} state="neutral" />
          </div>
        </section>
      </main>
    </div>
  );
}

function CommandKpi({ value, label, emphasis = false, alert = false }: { value: number; label: string; emphasis?: boolean; alert?: boolean }) {
  return (
    <article className={`admin-command-kpi${emphasis ? ' emphasis' : ''}${alert ? ' alert' : ''}`}>
      <strong>{new Intl.NumberFormat('es-ES').format(value)}</strong>
      <span>{label}</span>
    </article>
  );
}

function CommandModule({ href, title, metric, detail }: { href: string; title: string; metric: string; detail: string }) {
  return (
    <a className="admin-command-module" href={href}>
      <span className="admin-command-module-mark" aria-hidden="true">◆</span>
      <div><strong>{title}</strong><p>{metric}</p><small>{detail}</small></div>
      <span className="admin-command-module-arrow" aria-hidden="true">→</span>
    </a>
  );
}

function HealthCard({ label, value, state }: { label: string; value: number; state: 'ok' | 'warning' | 'danger' | 'neutral' }) {
  return (
    <article className={`admin-command-health state-${state}`}>
      <span className="admin-command-health-dot" aria-hidden="true" />
      <div><strong>{label}</strong><small>{new Intl.NumberFormat('es-ES').format(value)}</small></div>
    </article>
  );
}
