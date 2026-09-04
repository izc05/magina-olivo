import { useEffect, useMemo, useState } from 'react';
import { rewardApi, RewardApiError } from './reward-api';
import { buildRewardRedemptionNotifications } from './reward-redemption-notifications';

type Preferences = {
  notifyWeather: boolean;
  notifyTasks: boolean;
  notifyPendingYield: boolean;
  notifyFieldAlerts: boolean;
  notifyRewards: boolean;
  notifyMarket: boolean;
  notifyNews: boolean;
};

type Holding = {
  id: string;
  name: string;
};

type Task = {
  id: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'cancelled';
  overdue: boolean;
};

type Campaign = {
  id: string;
  status: string;
};

type CampaignSummary = {
  pendingResultCount: number;
};

type RainAlert = {
  id: string;
  municipalityName: string;
  forecastDate: string;
  precipitationProbabilityPercent: number;
  thresholdPercent: number;
  provider: string;
};

type RainAlertResponse = {
  enabled: boolean;
  items: RainAlert[];
};

type FieldAlertResponse = {
  source: {
    provider: string;
    hasError: boolean;
  };
  freshness: {
    status: 'current' | 'review' | 'stale' | 'unknown';
  };
};

type CenterTone = 'warning' | 'info' | 'success';
type CenterCategory = 'weather' | 'tasks' | 'yield' | 'field' | 'rewards';

type CenterItem = {
  id: string;
  category: CenterCategory;
  tone: CenterTone;
  title: string;
  detail: string;
  href: string;
  source?: string;
  occurredAt?: string;
};

const CATEGORY_LABELS: Record<CenterCategory, string> = {
  weather: 'Tiempo',
  tasks: 'Tareas',
  yield: 'Campaña',
  field: 'Campo',
  rewards: 'Recompensas',
};

async function json<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
}

function dayLabel(value: string): string {
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(date);
}

function dateDistanceDays(value: string, now: Date): number | null {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  return Math.ceil((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function toneRank(tone: CenterTone): number {
  if (tone === 'warning') return 0;
  if (tone === 'info') return 1;
  return 2;
}

export function NotificationCenterPage() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [items, setItems] = useState<CenterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const prefs = await json<Preferences>('/api/v1/account/preferences');
        if (cancelled) return;
        setPreferences(prefs);

        const next: CenterItem[] = [];
        const holdings = await json<{ items: Holding[] }>('/api/v1/holdings');
        if (cancelled) return;

        if (prefs.notifyWeather) {
          const rain = await json<RainAlertResponse>('/api/v1/account/rain-alerts').catch(() => null);
          if (rain?.enabled) {
            for (const alert of rain.items.slice(0, 2)) {
              next.push({
                id: `rain-${alert.id}`,
                category: 'weather',
                tone: 'warning',
                title: `Alarma de lluvia · ${dayLabel(alert.forecastDate)}`,
                detail: `${alert.municipalityName}: ${alert.precipitationProbabilityPercent}% de probabilidad (umbral ${alert.thresholdPercent}%).`,
                href: '/magina/tiempo',
                source: alert.provider,
                occurredAt: alert.forecastDate,
              });
            }
          }
        }

        if (prefs.notifyTasks && holdings.items.length > 0) {
          const taskGroups = await Promise.all(holdings.items.map(async (holding) => {
            const response = await json<{ items: Task[] }>(`/api/v1/holdings/${holding.id}/tasks?status=all`);
            return response.items.map((task) => ({ task, holding }));
          }));
          const allTasks = taskGroups.flat();
          const overdue = allTasks.filter(({ task }) => task.status === 'pending' && task.overdue);
          if (overdue.length > 0) {
            next.push({
              id: 'tasks-overdue',
              category: 'tasks',
              tone: 'warning',
              title: `${overdue.length} tarea${overdue.length === 1 ? '' : 's'} vencida${overdue.length === 1 ? '' : 's'}`,
              detail: overdue.slice(0, 2).map(({ task, holding }) => `${task.title} · ${holding.name}`).join(' · '),
              href: '/calendario',
            });
          }

          const now = new Date();
          const upcoming = allTasks
            .filter(({ task }) => task.status === 'pending' && !task.overdue)
            .map((entry) => ({ ...entry, days: dateDistanceDays(entry.task.dueDate, now) }))
            .filter((entry) => entry.days !== null && entry.days >= 0 && entry.days <= 7)
            .sort((a, b) => (a.days ?? 99) - (b.days ?? 99));
          if (upcoming.length > 0) {
            const first = upcoming[0];
            next.push({
              id: 'tasks-upcoming',
              category: 'tasks',
              tone: 'info',
              title: upcoming.length === 1 ? 'Próxima tarea del campo' : `${upcoming.length} tareas en los próximos 7 días`,
              detail: first ? `${first.task.title} · ${first.holding.name} · ${dayLabel(first.task.dueDate)}` : 'Consulta el calendario.',
              href: '/calendario',
              occurredAt: first?.task.dueDate,
            });
          }
        }

        if (prefs.notifyPendingYield && holdings.items.length > 0) {
          for (const holding of holdings.items) {
            const campaigns = await json<{ items: Campaign[] }>(`/api/v1/holdings/${holding.id}/campaigns`).catch(() => null);
            const campaign = campaigns?.items.find((item) => item.status === 'active') ?? campaigns?.items[0] ?? null;
            if (!campaign) continue;
            const summary = await json<CampaignSummary>(`/api/v1/campaigns/${campaign.id}/summary`).catch(() => null);
            if (summary && summary.pendingResultCount > 0) {
              next.push({
                id: `yield-${campaign.id}`,
                category: 'yield',
                tone: 'info',
                title: `${summary.pendingResultCount} rendimiento${summary.pendingResultCount === 1 ? '' : 's'} pendiente${summary.pendingResultCount === 1 ? '' : 's'}`,
                detail: `${holding.name}: completa el resultado cuando te lo facilite la almazara.`,
                href: '/',
              });
            }
          }
        }

        if (prefs.notifyFieldAlerts) {
          const field = await json<FieldAlertResponse>('/api/v1/public/field-alerts').catch(() => null);
          if (field && (field.source.hasError || field.freshness.status !== 'current')) {
            const freshnessCopy = field.source.hasError
              ? 'La última comprobación de la fuente registró una incidencia.'
              : field.freshness.status === 'review'
                ? 'La fuente regional necesita revisión de fecha antes de interpretarla como actual.'
                : field.freshness.status === 'stale'
                  ? 'La información regional disponible es antigua.'
                  : 'No se ha podido verificar la frescura de la fuente.';
            next.push({
              id: 'field-source-health',
              category: 'field',
              tone: field.freshness.status === 'stale' || field.source.hasError ? 'warning' : 'info',
              title: 'Revisa el estado de la información de campo',
              detail: `${freshnessCopy} Es contexto RAIF regional, no un diagnóstico de tu parcela.`,
              href: '/magina/campo',
              source: field.source.provider,
            });
          }
        }

        if (prefs.notifyRewards) {
          const redemptions = await rewardApi.myRedemptions().catch((reason: unknown) => {
            if (reason instanceof RewardApiError && reason.status === 401) throw reason;
            return [];
          });
          for (const notice of buildRewardRedemptionNotifications(redemptions).slice(0, 4)) {
            next.push({
              id: notice.id,
              category: 'rewards',
              tone: notice.tone,
              title: notice.title,
              detail: notice.detail,
              href: '/recompensas#mis-canjes',
              occurredAt: notice.occurredAt,
            });
          }
        }

        if (!cancelled) {
          setItems(next.sort((left, right) => {
            const toneDelta = toneRank(left.tone) - toneRank(right.tone);
            if (toneDelta !== 0) return toneDelta;
            return (right.occurredAt ?? '').localeCompare(left.occurredAt ?? '');
          }));
        }
      } catch (reason) {
        if (cancelled) return;
        const status = reason instanceof RewardApiError
          ? reason.status
          : (reason as Error & { status?: number })?.status;
        if (status === 401 || status === 403) {
          setAuthRequired(true);
          return;
        }
        setError(reason instanceof Error ? reason.message : 'No se ha podido cargar el centro de avisos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const refresh = () => void load();
    window.addEventListener('magina:sync-complete', refresh);
    window.addEventListener('magina:yield-saved', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('magina:sync-complete', refresh);
      window.removeEventListener('magina:yield-saved', refresh);
    };
  }, []);

  const enabledCount = useMemo(() => {
    if (!preferences) return 0;
    return [
      preferences.notifyWeather,
      preferences.notifyTasks,
      preferences.notifyPendingYield,
      preferences.notifyFieldAlerts,
      preferences.notifyRewards,
      preferences.notifyMarket,
      preferences.notifyNews,
    ].filter(Boolean).length;
  }, [preferences]);

  const channels = preferences ? [
    { label: 'Tiempo', enabled: preferences.notifyWeather, note: 'Lluvia, helada y viento.' },
    { label: 'Tareas', enabled: preferences.notifyTasks, note: 'Próximas y vencidas del calendario.' },
    { label: 'Rendimientos', enabled: preferences.notifyPendingYield, note: 'Entregas pendientes de resultado.' },
    { label: 'Campo / RAIF', enabled: preferences.notifyFieldAlerts, note: 'Estado y frescura de fuentes regionales.' },
    { label: 'Recompensas', enabled: preferences.notifyRewards, note: 'Caducidad, recogida y devolución de 🫒.' },
    { label: 'Mercado', enabled: preferences.notifyMarket, note: 'Solo cuando existan cambios estructurados y verificados; no se generan alertas de precio todavía.' },
    { label: 'Noticias importantes', enabled: preferences.notifyNews, note: 'Preparado para noticias verificadas relevantes, separado del consentimiento publicitario.' },
  ] : [];

  if (authRequired) {
    return (
      <main className="notification-center-shell notification-center-state">
        <section className="notification-state-card">
          <span className="eyebrow">Centro de avisos</span>
          <h1>Tus avisos son privados</h1>
          <p>Inicia sesión para consultar tareas, campaña y preferencias personales.</p>
          <a className="primary-button" href="/">Ir a iniciar sesión</a>
        </section>
      </main>
    );
  }

  return (
    <main className="notification-center-shell" id="main-content">
      <header className="notification-center-topbar">
        <a className="text-button" href="/">← Volver</a>
        <div className="brand-lockup">
          <span className="brand-title">Mágina Olivo</span>
          <span className="brand-kicker">Centro de avisos</span>
        </div>
        <a className="text-button" href="/cuenta">Configurar</a>
      </header>

      <div className="notification-center-page">
        <section className="notification-center-hero">
          <div>
            <p className="eyebrow page-eyebrow">Lo que necesita tu atención</p>
            <h1 className="section-title">Avisos de tu olivar, en un solo sitio</h1>
            <p className="section-copy">Mágina Olivo reúne señales reales de tu calendario, campaña, tiempo, fuentes de campo y recompensas. No convierte una alerta regional en una recomendación técnica de parcela.</p>
          </div>
          <div className="notification-center-counter" aria-label={`${items.length} avisos activos`}>
            <strong>{items.length}</strong>
            <span>Avisos activos</span>
          </div>
        </section>

        {loading ? <div className="notification-loading" role="status">Revisando tus avisos…</div> : null}
        {error ? <div className="alert" role="alert">{error}</div> : null}

        {!loading && !error ? (
          <section className="notification-feed" aria-label="Avisos activos">
            {items.length === 0 ? (
              <article className="notification-empty card">
                <span aria-hidden="true">✓</span>
                <div>
                  <h2>No tienes avisos activos</h2>
                  <p>Cuando haya una tarea, alarma, rendimiento pendiente o canje que requiera atención aparecerá aquí.</p>
                </div>
              </article>
            ) : items.map((item) => (
              <a className={`notification-item notification-item--${item.tone}`} href={item.href} key={item.id}>
                <div className="notification-item-marker" aria-hidden="true" />
                <div className="notification-item-copy">
                  <div className="notification-item-meta">
                    <span>{CATEGORY_LABELS[item.category]}</span>
                    {item.source ? <small>Fuente: {item.source}</small> : null}
                  </div>
                  <h2>{item.title}</h2>
                  <p>{item.detail}</p>
                </div>
                <span className="notification-item-arrow" aria-hidden="true">→</span>
              </a>
            ))}
          </section>
        ) : null}

        <section className="notification-channels card">
          <div className="notification-section-heading">
            <div>
              <p className="eyebrow">Preferencias</p>
              <h2>Canales configurados</h2>
            </div>
            <span>{enabledCount} activos</span>
          </div>
          <div className="notification-channel-grid">
            {channels.map((channel) => (
              <article className="notification-channel" key={channel.label}>
                <span className={`notification-channel-status ${channel.enabled ? 'is-enabled' : ''}`} aria-hidden="true" />
                <div>
                  <strong>{channel.label}</strong>
                  <small>{channel.note}</small>
                </div>
                <b>{channel.enabled ? 'Activo' : 'Desactivado'}</b>
              </article>
            ))}
          </div>
          <a className="secondary-button notification-config-link" href="/cuenta">Cambiar preferencias</a>
        </section>

        <section className="notification-push-card card">
          <div className="notification-push-icon" aria-hidden="true">↗</div>
          <div>
            <p className="eyebrow">Siguiente fase</p>
            <h2>Notificaciones push al móvil</h2>
            <p>Las categorías ya quedan guardadas en tu cuenta, pero el push todavía no está activado. No pediremos permiso al navegador hasta disponer de una suscripción Web Push segura, revocable y asociada a estas preferencias.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
