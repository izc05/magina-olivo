import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, CloudRain, Gift, MapPinned, Sprout } from 'lucide-react';
import { LoyaltyApiError, loyaltyApi, type LoyaltySummary } from './loyalty-api';
import { PublicNavigation } from './PublicNavigation';
import { VisualHeader } from './VisualChrome';

const AOVE_TARGET = 2500;

function formatOlives(value: number): string {
  return new Intl.NumberFormat('es-ES').format(Math.max(0, Math.round(value)));
}

function progressPercent(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (value / target) * 100));
}

export function LoyaltyOlivePage() {
  const [summary, setSummary] = useState<LoyaltySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [harvesting, setHarvesting] = useState(false);
  const [lastCollected, setLastCollected] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    let active = true;
    void loyaltyApi.bootstrap()
      .then((result) => {
        if (!active) return;
        setSummary(result.summary);
        if (result.awarded && !result.duplicate && result.olives > 0) {
          setNotice(`Tu primera parcela ha cargado ${formatOlives(result.olives)} aceitunas en el olivo.`);
        } else if (result.reason === 'no_plot') {
          setNotice('Añade tu primera parcela para empezar a llenar el olivo.');
        }
      })
      .catch((reason: unknown) => {
        if (!active) return;
        if (reason instanceof LoyaltyApiError && reason.status === 401) {
          setAuthRequired(true);
          return;
        }
        setError(reason instanceof Error ? reason.message : 'No se ha podido cargar Tu Olivo.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const available = summary?.availableBalance ?? 0;
  const pending = summary?.pendingBalance ?? 0;
  const rewardProgress = progressPercent(available, AOVE_TARGET);
  const levelProgress = useMemo(() => {
    if (!summary?.nextLevel || !summary.level) return summary?.nextLevel ? 0 : 100;
    const start = summary.level.minLifetimeEarned;
    const end = summary.nextLevel.minLifetimeEarned;
    return progressPercent(summary.lifetimeEarned - start, Math.max(1, end - start));
  }, [summary]);

  async function harvest() {
    if (!summary || summary.pendingBalance <= 0 || harvesting) return;

    setHarvesting(true);
    setLastCollected(0);
    setError(null);
    setNotice(null);

    try {
      const result = await loyaltyApi.collect(crypto.randomUUID());
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduceMotion) {
        await new Promise((resolve) => window.setTimeout(resolve, 1050));
      }
      setSummary(result.summary);
      setLastCollected(result.collected);
      setNotice(result.collected > 0
        ? `Has recogido ${formatOlives(result.collected)} aceitunas. Ya están disponibles para futuras recompensas.`
        : 'No había aceitunas pendientes de recoger.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido recoger la cosecha.');
    } finally {
      setHarvesting(false);
    }
  }

  if (authRequired) {
    return (
      <main className="loyalty-page loyalty-state-page">
        <section className="loyalty-state-card">
          <span className="loyalty-kicker">Mágina Olivo</span>
          <h1>Tu Olivo es privado</h1>
          <p>Inicia sesión para ver tus aceitunas y recoger las recompensas que hayas generado.</p>
          <a className="loyalty-primary-link" href="/">Ir a iniciar sesión</a>
        </section>
      </main>
    );
  }

  if (loading) {
    return <main className="loyalty-page loyalty-state-page"><p className="loyalty-loading" role="status">Preparando tu olivo…</p></main>;
  }

  return (
    <div className="loyalty-shell">
      <VisualHeader />
      <main className="loyalty-page" id="main-content">
      <section className="loyalty-page-intro">
        <p className="loyalty-eyebrow">Recompensas</p>
        <h1>Retos</h1>
        <p>Completa acciones útiles y haz crecer tu olivo.</p>
      </section>

      <section className="loyalty-hero-card">
        <div className="loyalty-heading-row">
          <div>
            <p className="loyalty-eyebrow">Mis Aceitunas</p>
            <h2>Tu olivo está creciendo contigo</h2>
            <p>Las acciones útiles que haces en Mágina Olivo cargan fruto en este árbol. Varea para pasarlo a tu saldo.</p>
          </div>
          <div className="loyalty-pending-chip">
            <span>Pendientes</span>
            <strong>{formatOlives(pending)} aceitunas</strong>
          </div>
        </div>

        <div className={`loyalty-tree-scene${harvesting ? ' harvesting' : ''}`}>
          <img src="/brand/loyalty-olive-tree.png" alt="Olivo entre las lomas de Sierra Mágina" />
          {harvesting || lastCollected > 0 ? (
            <div className={`loyalty-harvest-pop${harvesting ? ' active' : ''}`} aria-live="polite">
              {harvesting ? 'Recogiendo…' : `+${formatOlives(lastCollected)} aceitunas`}
            </div>
          ) : null}
        </div>

        <button
          className="loyalty-harvest-button"
          type="button"
          disabled={pending <= 0 || harvesting}
          onClick={() => void harvest()}
        >
          <Sprout aria-hidden="true" />
          {harvesting ? 'Recogiendo…' : pending > 0 ? `Recoger ${formatOlives(pending)} aceitunas` : 'Olivo recogido'}
        </button>

        {notice ? <p className="loyalty-notice" role="status">{notice}</p> : null}
        {error ? <p className="loyalty-error" role="alert">{error}</p> : null}
      </section>

      <section className="loyalty-grid">
        <article className="loyalty-card">
          <span className="loyalty-card-label">Nivel</span>
          <div className="loyalty-level-title">
            <strong>{summary?.level?.name ?? 'Brote'}</strong>
            <span>{formatOlives(summary?.lifetimeEarned ?? 0)} aceitunas históricas</span>
          </div>
          <div className="loyalty-progress"><span style={{ width: `${levelProgress}%` }} /></div>
          <p>{summary?.nextLevel
            ? `Te faltan ${formatOlives(summary.nextLevel.olivesRemaining)} para ${summary.nextLevel.name}.`
            : 'Has alcanzado el nivel más alto disponible.'}</p>
        </article>

        <article className="loyalty-card loyalty-reward-card">
          <span className="loyalty-card-label">Próxima recompensa</span>
          <div className="loyalty-reward-head">
            <span className="loyalty-reward-icon" aria-hidden="true"><Gift /></span>
            <div>
              <strong>Botella AOVE 500 ml</strong>
              <span>Objetivo inicial · {formatOlives(AOVE_TARGET)} aceitunas</span>
            </div>
          </div>
          <div className="loyalty-progress"><span style={{ width: `${rewardProgress}%` }} /></div>
          <p>{available >= AOVE_TARGET
            ? 'Ya has alcanzado el objetivo de referencia. Comprueba si hay alguna campaña con stock activo.'
            : `Te faltan ${formatOlives(AOVE_TARGET - available)} aceitunas disponibles para llegar al objetivo.`}</p>
          <small>El catálogo solo permite canjear campañas con stock real confirmado.</small>
          <a className="loyalty-primary-link" href="/recompensas">Ver recompensas</a>
        </article>
      </section>

      <section className="loyalty-how-card">
        <div>
          <span className="loyalty-card-label">Cómo llenar tu olivo</span>
          <h2>Usa Mágina Olivo y el fruto llegará aquí</h2>
        </div>
        <div className="loyalty-actions-preview">
          <span><MapPinned aria-hidden="true" /><b>+150</b> Primera parcela</span>
          <span><BookOpenCheck aria-hidden="true" /><b>+50</b> Añadir rendimiento</span>
          <span><CloudRain aria-hidden="true" /><b>+250</b> Completar campaña</span>
        </div>
      </section>
      </main>
      <PublicNavigation activePath="/mi-campo" />
    </div>
  );
}
