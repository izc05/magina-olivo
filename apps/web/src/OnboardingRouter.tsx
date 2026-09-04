import { useEffect, useState } from 'react';
import { api, type Holding } from './api.ts';
import { CatastroMapFirstSelector } from './CatastroMapFirstSelector.tsx';
import { OnboardingPage } from './OnboardingPage.tsx';

const MANUAL_FARM_KEY = 'magina-onboarding-manual-farm';
const SKIP_FARM_KEY = 'magina-onboarding-skip-farm';
const SKIP_PLOT_KEY = 'magina-onboarding-skip-plot';

type Mode = 'loading' | 'map-first' | 'legacy';

export function OnboardingRouter() {
  const [mode, setMode] = useState<Mode>('loading');
  const [holding, setHolding] = useState<Holding | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await api.me();
        const holdingResult = await api.holdings();
        if (cancelled) return;
        const firstHolding = holdingResult.items[0] ?? null;
        setHolding(firstHolding);

        if (!firstHolding || sessionStorage.getItem(MANUAL_FARM_KEY) === '1') {
          setMode('legacy');
          return;
        }

        const farmResult = await api.farms(firstHolding.id);
        if (cancelled) return;
        setMode(farmResult.items.length ? 'legacy' : 'map-first');
      } catch (reason) {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'No se ha podido preparar el alta guiada.');
          setMode('legacy');
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (mode === 'loading') {
    return <div className="loading-screen" role="status" aria-live="polite">Preparando tu olivar…</div>;
  }

  if (mode === 'legacy' || !holding) {
    return <OnboardingPage />;
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-card" aria-labelledby="onboarding-map-title">
        <div className="login-brand">
          <span className="brand-title">Mágina Olivo</span>
          <span className="brand-kicker">Sierra Mágina · Jaén</span>
        </div>
        <div className="onboarding-progress" aria-label="Paso 2 de 4">
          <span>Paso 2 de 4 · Localiza tu olivar</span>
          <div className="coverage-track"><div className="coverage-fill" style={{ width: '50%' }} /></div>
        </div>

        <section aria-labelledby="onboarding-map-title">
          <p className="eyebrow page-eyebrow">Primera finca y parcelas</p>
          <h1 id="onboarding-map-title" className="login-title">Encuentra tu olivar en el mapa</h1>
          <p className="login-copy">Puedes seleccionar una o varias parcelas de Catastro y crear la finca con todas ellas de una vez. No necesitas conocer coordenadas ni escribir la referencia si sabes localizar la zona.</p>

          <CatastroMapFirstSelector
            holdingId={holding.id}
            allowCreateFarm
            onCompleted={async () => {
              sessionStorage.removeItem(MANUAL_FARM_KEY);
              sessionStorage.removeItem(SKIP_FARM_KEY);
              sessionStorage.removeItem(SKIP_PLOT_KEY);
              window.location.assign('/onboarding');
            }}
          />

          <div className="form-actions">
            <button
              className="text-button"
              type="button"
              onClick={() => {
                sessionStorage.setItem(MANUAL_FARM_KEY, '1');
                setMode('legacy');
              }}
            >
              Prefiero crear la finca manualmente
            </button>
          </div>
          <p className="plot-editor-help">La selección del mapa sirve para organizar tu trabajo en Mágina Olivo; no acredita titularidad ni propiedad.</p>
          {error ? <div className="alert" role="alert">{error}</div> : null}
        </section>
      </section>
    </main>
  );
}
