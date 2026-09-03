import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, type Campaign, type Farm, type Holding, type Plot } from './api.ts';

const SKIP_FARM_KEY = 'magina-onboarding-skip-farm';
const SKIP_PLOT_KEY = 'magina-onboarding-skip-plot';

type Step = 1 | 2 | 3 | 4 | 5;

function currentYear(): number {
  return new Date().getFullYear();
}

export function OnboardingPage() {
  const [step, setStep] = useState<Step>(1);
  const [holding, setHolding] = useState<Holding | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resume() {
      setLoading(true);
      setError(null);
      try {
        await api.me();
        const holdingResult = await api.holdings();
        if (cancelled) return;

        const existingHolding = holdingResult.items[0] ?? null;
        setHolding(existingHolding);
        if (!existingHolding) {
          setStep(1);
          return;
        }

        const [farmResult, campaignResult] = await Promise.all([
          api.farms(existingHolding.id),
          api.campaigns(existingHolding.id),
        ]);
        if (cancelled) return;

        const existingFarm = farmResult.items[0] ?? null;
        const existingCampaign = campaignResult.items[0] ?? null;
        setFarm(existingFarm);
        setCampaign(existingCampaign);

        if (existingCampaign) {
          setStep(5);
          return;
        }

        const farmSkipped = sessionStorage.getItem(SKIP_FARM_KEY) === '1';
        if (!existingFarm && !farmSkipped) {
          setStep(2);
          return;
        }

        if (existingFarm) {
          const plotResult = await api.plots(existingFarm.id);
          if (cancelled) return;
          const plotSkipped = sessionStorage.getItem(SKIP_PLOT_KEY) === '1';
          if (!plotResult.items.length && !plotSkipped) {
            setStep(3);
            return;
          }
        }

        setStep(4);
      } catch (reason) {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'No se ha podido recuperar el onboarding.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void resume();
    return () => { cancelled = true; };
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido guardar este paso.');
    } finally {
      setBusy(false);
    }
  }

  async function createHolding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await run(async () => {
      const municipality = String(data.get('municipality') || '').trim();
      const created = await api.createHolding({
        name: String(data.get('name') || '').trim(),
        province: 'Jaén',
        ...(municipality ? { municipality } : {}),
      });
      setHolding(created);
      setStep(2);
    });
  }

  async function createFarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!holding) return;
    const data = new FormData(event.currentTarget);
    await run(async () => {
      const area = String(data.get('areaHa') || '').trim();
      const created = await api.createFarm(holding.id, {
        name: String(data.get('name') || '').trim(),
        ...(area ? { areaHa: Number(area) } : {}),
      });
      sessionStorage.removeItem(SKIP_FARM_KEY);
      setFarm(created);
      setStep(3);
    });
  }

  async function createPlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!farm) return;
    const data = new FormData(event.currentTarget);
    await run(async () => {
      const area = String(data.get('areaHa') || '').trim();
      const sigpacReference = String(data.get('sigpacReference') || '').trim();
      const oliveTreeCount = String(data.get('oliveTreeCount') || '').trim();
      await api.createPlot(farm.id, {
        name: String(data.get('name') || '').trim(),
        irrigationType: String(data.get('irrigationType') || 'unknown') as 'dryland' | 'irrigated' | 'mixed' | 'unknown',
        ...(area ? { areaHa: Number(area) } : {}),
        ...(sigpacReference ? { sigpacReference } : {}),
        ...(oliveTreeCount ? { oliveTreeCount: Number(oliveTreeCount) } : {}),
      });
      sessionStorage.removeItem(SKIP_PLOT_KEY);
      setStep(4);
    });
  }

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!holding) return;
    const data = new FormData(event.currentTarget);
    await run(async () => {
      const startYear = Number(data.get('seasonStartYear') || currentYear());
      const created = await api.createCampaign(holding.id, {
        name: String(data.get('name') || '').trim(),
        seasonStartYear: startYear,
      });
      sessionStorage.removeItem(SKIP_FARM_KEY);
      sessionStorage.removeItem(SKIP_PLOT_KEY);
      setCampaign(created);
      setStep(5);
    });
  }

  if (loading) {
    return <div className="loading-screen" role="status" aria-live="polite">Preparando tu olivar…</div>;
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-card" aria-labelledby="onboarding-title">
        <div className="login-brand">
          <span className="brand-title">Mágina Olivo</span>
          <span className="brand-kicker">Tu campo. Tu campaña. Tu Mágina.</span>
        </div>

        <div className="onboarding-progress" aria-label={`Paso ${Math.min(step, 4)} de 4`}>
          <span>{step === 5 ? 'Configuración inicial completada' : `Paso ${step} de 4`}</span>
          <div className="coverage-track"><div className="coverage-fill" style={{ width: `${step === 5 ? 100 : step * 25}%` }} /></div>
        </div>

        {error ? (
          <div className="alert" role="alert">
            {error}
            <div className="form-actions"><a className="text-button" href="/">Volver al acceso</a></div>
          </div>
        ) : null}

        {step === 1 ? (
          <section aria-labelledby="onboarding-title">
            <p className="eyebrow page-eyebrow">Tu explotación</p>
            <h1 id="onboarding-title" className="login-title">Vamos a preparar tu Mágina</h1>
            <p className="login-copy">En cuatro pasos dejamos lista la base de tu cuaderno digital: explotación, finca, parcela y campaña. Puedes empezar con lo imprescindible y completar el resto más adelante.</p>
            <form className="form-grid" onSubmit={createHolding} aria-busy={busy}>
              <div className="field"><label htmlFor="holding-name">Nombre de la explotación</label><input id="holding-name" name="name" required maxLength={160} placeholder="Mi olivar" /></div>
              <div className="field"><label htmlFor="holding-municipality">Municipio</label><input id="holding-municipality" name="municipality" maxLength={120} placeholder="Huelma, Bedmar, Cambil…" /></div>
              <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Continuar'}</button>
            </form>
          </section>
        ) : null}

        {step === 2 && holding ? (
          <section aria-labelledby="onboarding-farm-title">
            <p className="eyebrow page-eyebrow">Primera finca</p>
            <h1 id="onboarding-farm-title" className="login-title">Añade una finca</h1>
            <p className="login-copy">Te ayudará a ordenar parcelas y labores, pero puedes completarla más tarde.</p>
            <form className="form-grid" onSubmit={createFarm} aria-busy={busy}>
              <div className="field"><label htmlFor="farm-name">Nombre de la finca</label><input id="farm-name" name="name" required maxLength={160} placeholder="Las Viñas" /></div>
              <div className="field"><label htmlFor="farm-area">Superficie aproximada (ha)</label><input id="farm-area" name="areaHa" type="number" min="0" step="0.001" inputMode="decimal" /></div>
              <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar finca'}</button>
              <button className="text-button" type="button" disabled={busy} onClick={() => { sessionStorage.setItem(SKIP_FARM_KEY, '1'); setStep(4); }}>Lo haré después</button>
            </form>
          </section>
        ) : null}

        {step === 3 && farm ? (
          <section aria-labelledby="onboarding-plot-title">
            <p className="eyebrow page-eyebrow">Primera parcela</p>
            <h1 id="onboarding-plot-title" className="login-title">Añade una parcela</h1>
            <p className="login-copy">SIGPAC es opcional. Puedes empezar con un nombre y completar el resto cuando quieras.</p>
            <form className="form-grid" onSubmit={createPlot} aria-busy={busy}>
              <div className="field"><label htmlFor="plot-name">Nombre de la parcela</label><input id="plot-name" name="name" required maxLength={160} placeholder="Parcela Norte" /></div>
              <div className="inline-fields">
                <div className="field"><label htmlFor="plot-area">Hectáreas</label><input id="plot-area" name="areaHa" type="number" min="0" step="0.001" inputMode="decimal" /></div>
                <div className="field"><label htmlFor="plot-trees">Olivos</label><input id="plot-trees" name="oliveTreeCount" type="number" min="0" step="1" inputMode="numeric" /></div>
              </div>
              <div className="field"><label htmlFor="plot-sigpac">Referencia SIGPAC</label><input id="plot-sigpac" name="sigpacReference" maxLength={240} placeholder="Opcional" /></div>
              <div className="field"><label htmlFor="plot-irrigation">Riego</label><select id="plot-irrigation" name="irrigationType" defaultValue="unknown"><option value="unknown">Sin definir</option><option value="dryland">Secano</option><option value="irrigated">Regadío</option><option value="mixed">Mixto</option></select></div>
              <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar parcela'}</button>
              <button className="text-button" type="button" disabled={busy} onClick={() => { sessionStorage.setItem(SKIP_PLOT_KEY, '1'); setStep(4); }}>Lo haré después</button>
            </form>
          </section>
        ) : null}

        {step === 4 && holding ? (
          <section aria-labelledby="onboarding-campaign-title">
            <p className="eyebrow page-eyebrow">Campaña actual</p>
            <h1 id="onboarding-campaign-title" className="login-title">Abre tu primera campaña</h1>
            <p className="login-copy">La sugerimos según el año actual, pero puedes cambiarla.</p>
            <form className="form-grid" onSubmit={createCampaign} aria-busy={busy}>
              <div className="field"><label htmlFor="campaign-name">Nombre de campaña</label><input id="campaign-name" name="name" required maxLength={160} defaultValue={`Campaña ${currentYear()}/${String(currentYear() + 1).slice(-2)}`} /></div>
              <div className="field"><label htmlFor="campaign-year">Año de inicio</label><input id="campaign-year" name="seasonStartYear" type="number" required min="2000" max="2200" defaultValue={currentYear()} /></div>
              <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Abriendo campaña…' : 'Abrir campaña'}</button>
            </form>
          </section>
        ) : null}

        {step === 5 ? (
          <section aria-labelledby="onboarding-complete-title">
            <p className="eyebrow page-eyebrow">Todo listo</p>
            <h1 id="onboarding-complete-title" className="login-title">Tu Mágina está preparada</h1>
            <p className="login-copy">{holding?.name ?? 'Tu explotación'}{campaign ? ` · ${campaign.name}` : ''}. Ya puedes registrar labores, entregas y rendimientos y consultar la información útil de Sierra Mágina desde el mismo lugar. La cooperativa no es obligatoria: podrás elegirla al registrar una entrega.</p>
            <button className="primary-button" type="button" onClick={() => window.location.assign('/')}>Entrar en Mágina Olivo</button>
          </section>
        ) : null}
      </section>
    </main>
  );
}
