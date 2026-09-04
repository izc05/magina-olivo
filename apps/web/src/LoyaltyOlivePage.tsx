import { useEffect, useMemo, useState } from 'react';
import { LoyaltyApiError, loyaltyApi, type LoyaltySummary } from './loyalty-api';

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
    <main className="loyalty-page">
      <header className="loyalty-topbar">
        <a className="loyalty-back" href="/" aria-label="Volver a Mágina Olivo">←</a>
        <div>
          <span className="loyalty-kicker">Mágina Olivo</span>
          <strong>Tu Olivo</strong>
        </div>
        <div className="loyalty-balance-pill" aria-label={`${available} aceitunas disponibles`}>
          <span>{formatOlives(available)}</span><span aria-hidden="true">🫒</span>
        </div>
      </header>

      <section className="loyalty-hero-card">
        <div className="loyalty-heading-row">
          <div>
            <p className="loyalty-eyebrow">Mis Aceitunas</p>
            <h1>Tu olivo está creciendo contigo</h1>
            <p>Las acciones útiles que haces en Mágina Olivo cargan fruto en este árbol. Varea para pasarlo a tu saldo.</p>
          </div>
          <div className="loyalty-pending-chip">
            <span>Pendientes</span>
            <strong>{formatOlives(pending)} 🫒</strong>
          </div>
        </div>

        <div className={`loyalty-tree-scene${harvesting ? ' harvesting' : ''}`} aria-label="Olivo con aceitunas pendientes">
          <div className="loyalty-sun" aria-hidden="true" />
          <svg className="loyalty-tree" viewBox="0 0 420 360" role="img" aria-label="Ilustración de un olivo">
            <ellipse className="loyalty-ground" cx="210" cy="326" rx="174" ry="24" />
            <g className="loyalty-tree-body">
              <path className="loyalty-trunk" d="M205 322 C198 281 207 246 187 209 C175 188 185 167 202 149 C211 183 218 207 218 232 C226 205 243 185 264 168 C259 205 246 231 234 253 C230 280 232 302 235 322 Z" />
              <path className="loyalty-branch" d="M207 232 C174 194 148 170 119 153" />
              <path className="loyalty-branch" d="M215 217 C239 181 269 158 309 143" />
              <path className="loyalty-branch" d="M210 196 C198 159 190 136 170 110" />
              <path className="loyalty-branch" d="M224 200 C237 164 244 133 260 107" />
              <g className="loyalty-canopy">
                <ellipse cx="112" cy="145" rx="70" ry="47" />
                <ellipse cx="168" cy="112" rx="79" ry="55" />
                <ellipse cx="237" cy="105" rx="82" ry="57" />
                <ellipse cx="305" cy="144" rx="72" ry="49" />
                <ellipse cx="197" cy="158" rx="91" ry="58" />
                <ellipse cx="262" cy="166" rx="78" ry="52" />
              </g>
              <g className="loyalty-fruit">
                <circle cx="116" cy="130" r="7" /><circle cx="145" cy="156" r="6" /><circle cx="171" cy="105" r="7" />
                <circle cx="202" cy="134" r="6" /><circle cx="231" cy="91" r="7" /><circle cx="258" cy="128" r="6" />
                <circle cx="294" cy="151" r="7" /><circle cx="274" cy="179" r="6" /><circle cx="184" cy="173" r="7" />
                <circle cx="322" cy="129" r="6" /><circle cx="218" cy="184" r="6" /><circle cx="138" cy="112" r="6" />
              </g>
            </g>
          </svg>
          <div className="loyalty-net" aria-hidden="true" />
          <div className="loyalty-stick" aria-hidden="true" />
          {Array.from({ length: 12 }, (_, index) => (
            <span key={index} className={`loyalty-falling-olive olive-${index + 1}`} aria-hidden="true">●</span>
          ))}
          {harvesting || lastCollected > 0 ? (
            <div className={`loyalty-harvest-pop${harvesting ? ' active' : ''}`} aria-live="polite">
              {harvesting ? 'Recogiendo…' : `+${formatOlives(lastCollected)} 🫒`}
            </div>
          ) : null}
        </div>

        <button
          className="loyalty-harvest-button"
          type="button"
          disabled={pending <= 0 || harvesting}
          onClick={() => void harvest()}
        >
          <span aria-hidden="true">╱</span>
          {harvesting ? 'Vareando…' : pending > 0 ? `Varear y recoger ${formatOlives(pending)} 🫒` : 'Olivo recogido'}
        </button>

        {notice ? <p className="loyalty-notice" role="status">{notice}</p> : null}
        {error ? <p className="loyalty-error" role="alert">{error}</p> : null}
      </section>

      <section className="loyalty-grid">
        <article className="loyalty-card">
          <span className="loyalty-card-label">Nivel</span>
          <div className="loyalty-level-title">
            <strong>{summary?.level?.name ?? 'Brote'}</strong>
            <span>{formatOlives(summary?.lifetimeEarned ?? 0)} 🫒 históricas</span>
          </div>
          <div className="loyalty-progress"><span style={{ width: `${levelProgress}%` }} /></div>
          <p>{summary?.nextLevel
            ? `Te faltan ${formatOlives(summary.nextLevel.olivesRemaining)} para ${summary.nextLevel.name}.`
            : 'Has alcanzado el nivel más alto disponible.'}</p>
        </article>

        <article className="loyalty-card loyalty-reward-card">
          <span className="loyalty-card-label">Próxima recompensa</span>
          <div className="loyalty-reward-head">
            <div className="loyalty-bottle" aria-hidden="true">AOVE</div>
            <div>
              <strong>Botella AOVE 500 ml</strong>
              <span>Objetivo inicial · {formatOlives(AOVE_TARGET)} 🫒</span>
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
          <span><b>+150 🫒</b> Primera parcela</span>
          <span><b>+50 🫒</b> Añadir rendimiento</span>
          <span><b>+250 🫒</b> Completar campaña</span>
        </div>
      </section>
    </main>
  );
}
