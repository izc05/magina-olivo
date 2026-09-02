import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  api,
  type Campaign,
  type CampaignSummary,
  type Delivery,
  type Farm,
  type Holding,
  type Plot,
  type User,
} from './api';

type Tab = 'home' | 'field' | 'campaign' | 'more';
type SessionState = 'checking' | 'signed_out' | 'signed_in';

function formatKg(value: string | number | null | undefined): string {
  const number = Number(value ?? 0);
  return Number.isFinite(number)
    ? `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(number)} kg`
    : '0 kg';
}

function formatPercent(value: string | null | undefined): string {
  if (value == null) return '—';
  const number = Number(value);
  return Number.isFinite(number)
    ? `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(number)} %`
    : '—';
}

function messageFrom(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Ha ocurrido un error inesperado.';
}

function LoginScreen({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api.signIn(email.trim(), password);
      const session = await api.me();
      onSignedIn(session.user);
    } catch (reason) {
      setError('No se ha podido iniciar sesión. Revisa el correo y la contraseña.');
      console.warn('Sign in failed', reason instanceof ApiError ? reason.code : 'unknown');
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!email.trim()) {
      setError('Escribe primero tu correo para solicitar la recuperación.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.requestPasswordReset(email.trim());
      setNotice('Si existe una cuenta con ese correo, recibirás instrucciones para recuperar el acceso.');
    } catch {
      setNotice('Si existe una cuenta con ese correo, recibirás instrucciones para recuperar el acceso.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="brand-title">Mágina Olivo</span>
          <span className="brand-kicker">Tu olivar, campaña tras campaña</span>
        </div>
        <h1 id="login-title" className="login-title">Bienvenido</h1>
        <p className="login-copy">Accede a tus fincas, entregas y rendimientos desde un único lugar.</p>

        <form className="form-grid" onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={10} />
          </div>
          {error ? <div className="alert" role="alert">{error}</div> : null}
          {notice ? <div className="alert success" role="status">{notice}</div> : null}
          <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        </form>

        <div className="login-footer">
          <button className="text-button" type="button" onClick={() => void resetPassword()} disabled={busy}>He olvidado mi contraseña</button>
        </div>
      </section>
    </main>
  );
}

export function App() {
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>('home');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [selectedHoldingId, setSelectedHoldingId] = useState('');
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [plots, setPlots] = useState<Plot[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [summary, setSummary] = useState<CampaignSummary | null>(null);

  const selectedHolding = useMemo(
    () => holdings.find((item) => item.id === selectedHoldingId) ?? null,
    [holdings, selectedHoldingId],
  );
  const selectedFarm = useMemo(
    () => farms.find((item) => item.id === selectedFarmId) ?? null,
    [farms, selectedFarmId],
  );
  const selectedCampaign = useMemo(
    () => campaigns.find((item) => item.id === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId],
  );

  const loadHoldings = useCallback(async () => {
    const result = await api.holdings();
    setHoldings(result.items);
    setSelectedHoldingId((current) => current || result.items[0]?.id || '');
  }, []);

  const loadHoldingData = useCallback(async (holdingId: string) => {
    if (!holdingId) {
      setFarms([]);
      setCampaigns([]);
      return;
    }
    const [farmResult, campaignResult] = await Promise.all([api.farms(holdingId), api.campaigns(holdingId)]);
    setFarms(farmResult.items);
    setCampaigns(campaignResult.items);
    setSelectedFarmId((current) => farmResult.items.some((item) => item.id === current) ? current : (farmResult.items[0]?.id ?? ''));
    setSelectedCampaignId((current) => campaignResult.items.some((item) => item.id === current) ? current : (campaignResult.items[0]?.id ?? ''));
  }, []);

  const loadPlots = useCallback(async (farmId: string) => {
    if (!farmId) {
      setPlots([]);
      return;
    }
    const result = await api.plots(farmId);
    setPlots(result.items);
  }, []);

  const loadCampaign = useCallback(async (campaignId: string) => {
    if (!campaignId) {
      setDeliveries([]);
      setSummary(null);
      return;
    }
    const [deliveryResult, campaignSummary] = await Promise.all([
      api.deliveries(campaignId),
      api.campaignSummary(campaignId),
    ]);
    setDeliveries(deliveryResult.items);
    setSummary(campaignSummary);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api.me()
      .then((result) => {
        if (cancelled) return;
        setUser(result.user);
        setSessionState('signed_in');
      })
      .catch(() => {
        if (cancelled) return;
        setSessionState('signed_out');
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (sessionState !== 'signed_in') return;
    void loadHoldings().catch((reason) => setError(messageFrom(reason)));
  }, [sessionState, loadHoldings]);

  useEffect(() => {
    void loadHoldingData(selectedHoldingId).catch((reason) => setError(messageFrom(reason)));
  }, [selectedHoldingId, loadHoldingData]);

  useEffect(() => {
    void loadPlots(selectedFarmId).catch((reason) => setError(messageFrom(reason)));
  }, [selectedFarmId, loadPlots]);

  useEffect(() => {
    void loadCampaign(selectedCampaignId).catch((reason) => setError(messageFrom(reason)));
  }, [selectedCampaignId, loadCampaign]);

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (reason) {
      setError(messageFrom(reason));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await runAction(async () => {
      await api.signOut();
      setUser(null);
      setSessionState('signed_out');
      setHoldings([]);
      setSelectedHoldingId('');
    });
  }

  if (sessionState === 'checking') return <div className="loading-screen">Abriendo Mágina Olivo…</div>;
  if (sessionState === 'signed_out' || !user) {
    return <LoginScreen onSignedIn={(signedInUser) => { setUser(signedInUser); setSessionState('signed_in'); }} />;
  }

  const initials = (user.name || user.email).trim().slice(0, 1).toUpperCase();
  const coverage = Math.min(100, Math.max(0, Number(summary?.coveragePercent ?? 0)));

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup" aria-label="Mágina Olivo">
          <span className="brand-title">Mágina Olivo</span>
          <span className="brand-kicker">Sierra Mágina · Jaén</span>
        </div>
        <button type="button" className="user-chip" onClick={() => setTab('more')} aria-label="Abrir perfil">{initials}</button>
      </header>

      <main className="page">
        {error ? <div className="alert" role="alert">{error}</div> : null}

        {holdings.length > 1 ? (
          <section className="section" aria-label="Explotación activa">
            <select className="selector" value={selectedHoldingId} onChange={(event) => setSelectedHoldingId(event.target.value)}>
              {holdings.map((holding) => <option key={holding.id} value={holding.id}>{holding.name}</option>)}
            </select>
          </section>
        ) : null}

        {tab === 'home' ? (
          <HomeTab
            holding={selectedHolding}
            campaign={selectedCampaign}
            summary={summary}
            coverage={coverage}
            onNavigate={setTab}
          />
        ) : null}

        {tab === 'field' ? (
          <FieldTab
            holdings={holdings}
            selectedHolding={selectedHolding}
            farms={farms}
            selectedFarm={selectedFarm}
            selectedFarmId={selectedFarmId}
            plots={plots}
            busy={busy}
            setSelectedFarmId={setSelectedFarmId}
            runAction={runAction}
            reloadHoldings={loadHoldings}
            reloadHoldingData={() => loadHoldingData(selectedHoldingId)}
            reloadPlots={() => loadPlots(selectedFarmId)}
          />
        ) : null}

        {tab === 'campaign' ? (
          <CampaignTab
            selectedHolding={selectedHolding}
            campaigns={campaigns}
            selectedCampaignId={selectedCampaignId}
            setSelectedCampaignId={setSelectedCampaignId}
            selectedCampaign={selectedCampaign}
            farms={farms}
            plots={plots}
            deliveries={deliveries}
            summary={summary}
            busy={busy}
            runAction={runAction}
            reloadHoldingData={() => loadHoldingData(selectedHoldingId)}
            reloadCampaign={() => loadCampaign(selectedCampaignId)}
          />
        ) : null}

        {tab === 'more' ? (
          <MoreTab user={user} holding={selectedHolding} busy={busy} onSignOut={() => void signOut()} />
        ) : null}
      </main>

      <nav className="bottom-nav" aria-label="Navegación principal">
        <NavButton active={tab === 'home'} icon="⌂" label="Inicio" onClick={() => setTab('home')} />
        <NavButton active={tab === 'field'} icon="◒" label="Mi Campo" onClick={() => setTab('field')} />
        <NavButton active={tab === 'campaign'} icon="◎" label="Campaña" onClick={() => setTab('campaign')} />
        <NavButton active={tab === 'more'} icon="•••" label="Mi Mágina" onClick={() => setTab('more')} />
      </nav>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return <button type="button" className={`nav-button${active ? ' active' : ''}`} onClick={onClick}><span aria-hidden="true">{icon}</span>{label}</button>;
}

function HomeTab({
  holding,
  campaign,
  summary,
  coverage,
  onNavigate,
}: {
  holding: Holding | null;
  campaign: Campaign | null;
  summary: CampaignSummary | null;
  coverage: number;
  onNavigate: (tab: Tab) => void;
}) {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">{campaign ? `Campaña ${campaign.seasonStartYear}/${String(campaign.seasonEndYear).slice(-2)}` : 'Tu campaña'}</p>
        <h1>{holding?.name ?? 'Tu olivar'}</h1>
        <p className="hero-sub">Un vistazo rápido a la campaña, sin perder de vista lo importante.</p>
        <div className="metrics">
          <div className="metric"><span className="metric-value">{formatKg(summary?.totalKilograms)}</span><span className="metric-label">entregados</span></div>
          <div className="metric"><span className="metric-value">{formatPercent(summary?.weightedYieldPercent)}</span><span className="metric-label">rendimiento</span></div>
          <div className="metric"><span className="metric-value">{summary?.deliveriesCount ?? 0}</span><span className="metric-label">entregas</span></div>
          <div className="metric"><span className="metric-value">{summary?.pendingResultCount ?? 0}</span><span className="metric-label">sin rendimiento</span></div>
        </div>
        <div className="coverage">Cobertura de rendimiento · {formatPercent(summary?.coveragePercent)}<div className="coverage-track"><div className="coverage-fill" style={{ width: `${coverage}%` }} /></div></div>
      </section>

      <section className="quick-actions" aria-label="Acciones rápidas">
        <button type="button" className="quick-button" onClick={() => onNavigate('campaign')}>+ Entrega</button>
        <button type="button" className="quick-button" onClick={() => onNavigate('field')}>+ Parcela</button>
        <button type="button" className="quick-button" onClick={() => onNavigate('campaign')}>Rendimientos</button>
        <button type="button" className="quick-button" onClick={() => onNavigate('field')}>Mi campo</button>
      </section>

      <section className="section">
        <div className="section-heading"><div><h2 className="section-title">Hoy en tu olivar</h2><p className="section-copy">El MVP ya prioriza pendientes reales de campaña.</p></div></div>
        <article className="card list-card"><div className="list-card-main"><p className="list-card-title">Rendimientos pendientes</p><p className="list-card-meta">Añade el resultado cuando te lo facilite la almazara.</p></div><span className="badge gold">{summary?.pendingResultCount ?? 0}</span></article>
      </section>
    </>
  );
}

function FieldTab({
  holdings,
  selectedHolding,
  farms,
  selectedFarm,
  selectedFarmId,
  plots,
  busy,
  setSelectedFarmId,
  runAction,
  reloadHoldings,
  reloadHoldingData,
  reloadPlots,
}: {
  holdings: Holding[];
  selectedHolding: Holding | null;
  farms: Farm[];
  selectedFarm: Farm | null;
  selectedFarmId: string;
  plots: Plot[];
  busy: boolean;
  setSelectedFarmId: (id: string) => void;
  runAction: (action: () => Promise<void>) => Promise<void>;
  reloadHoldings: () => Promise<void>;
  reloadHoldingData: () => Promise<void>;
  reloadPlots: () => Promise<void>;
}) {
  return (
    <>
      <section>
        <p className="eyebrow" style={{ color: 'var(--olive-650)' }}>Mi Campo</p>
        <h1 className="section-title">Fincas y parcelas</h1>
        <p className="section-copy">Tu estructura agrícola es la base de todo el histórico.</p>
      </section>

      {holdings.length === 0 ? <CreateHoldingCard busy={busy} runAction={runAction} onCreated={reloadHoldings} /> : null}

      {selectedHolding ? (
        <>
          <section className="section">
            <div className="section-heading"><div><h2 className="section-title">Fincas</h2><p className="section-copy">{selectedHolding.municipality || 'Sierra Mágina'}{selectedHolding.province ? ` · ${selectedHolding.province}` : ''}</p></div></div>
            {farms.length ? farms.map((farm) => (
              <button key={farm.id} type="button" className="card list-card interactive" style={{ width: '100%', textAlign: 'left' }} onClick={() => setSelectedFarmId(farm.id)}>
                <div className="list-card-main"><p className="list-card-title">{farm.name}</p><p className="list-card-meta">{farm.areaHa ? `${farm.areaHa} ha` : 'Superficie pendiente'}</p></div>
                <span className={`badge${farm.id === selectedFarmId ? ' gold' : ''}`}>{farm.id === selectedFarmId ? 'Activa' : 'Ver'}</span>
              </button>
            )) : <div className="card empty-state"><strong>Añade tu primera finca</strong>Después podrás dividirla en parcelas y asociar tus entregas.</div>}
          </section>
          <CreateFarmCard holdingId={selectedHolding.id} busy={busy} runAction={runAction} onCreated={reloadHoldingData} />
        </>
      ) : null}

      {selectedFarm ? (
        <section className="section">
          <div className="section-heading"><div><h2 className="section-title">Parcelas de {selectedFarm.name}</h2><p className="section-copy">SIGPAC, superficie, olivos y tipo de riego.</p></div></div>
          {plots.map((plot) => <article className="card list-card" key={plot.id}><div className="list-card-main"><p className="list-card-title">{plot.name}</p><p className="list-card-meta">{plot.areaHa ? `${plot.areaHa} ha` : 'Sin superficie'} · {plot.oliveTreeCount ?? '—'} olivos · {plot.irrigationType || 'riego sin definir'}</p></div><span className="badge">{plot.sigpacReference ? 'SIGPAC' : 'Manual'}</span></article>)}
          {!plots.length ? <div className="card empty-state"><strong>Sin parcelas todavía</strong>Añade una para construir su línea de tiempo.</div> : null}
          <CreatePlotCard farmId={selectedFarm.id} busy={busy} runAction={runAction} onCreated={reloadPlots} />
        </section>
      ) : null}
    </>
  );
}

function CampaignTab({
  selectedHolding,
  campaigns,
  selectedCampaignId,
  setSelectedCampaignId,
  selectedCampaign,
  farms,
  plots,
  deliveries,
  summary,
  busy,
  runAction,
  reloadHoldingData,
  reloadCampaign,
}: {
  selectedHolding: Holding | null;
  campaigns: Campaign[];
  selectedCampaignId: string;
  setSelectedCampaignId: (id: string) => void;
  selectedCampaign: Campaign | null;
  farms: Farm[];
  plots: Plot[];
  deliveries: Delivery[];
  summary: CampaignSummary | null;
  busy: boolean;
  runAction: (action: () => Promise<void>) => Promise<void>;
  reloadHoldingData: () => Promise<void>;
  reloadCampaign: () => Promise<void>;
}) {
  return (
    <>
      <section>
        <p className="eyebrow" style={{ color: 'var(--olive-650)' }}>Campaña</p>
        <h1 className="section-title">Entregas y rendimiento</h1>
        <p className="section-copy">El núcleo productivo del olivar, con trazabilidad por entrega.</p>
      </section>

      {selectedHolding && !campaigns.length ? <CreateCampaignCard holdingId={selectedHolding.id} busy={busy} runAction={runAction} onCreated={reloadHoldingData} /> : null}

      {campaigns.length ? (
        <section className="section">
          <select className="selector" value={selectedCampaignId} onChange={(event) => setSelectedCampaignId(event.target.value)} aria-label="Campaña activa">
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </select>
        </section>
      ) : null}

      {selectedCampaign ? (
        <>
          <section className="section card card-body">
            <div className="metrics" style={{ marginTop: 0 }}>
              <div><span className="metric-value" style={{ color: 'var(--olive-950)' }}>{formatKg(summary?.totalKilograms)}</span><span className="metric-label" style={{ color: 'var(--muted)' }}>kilos</span></div>
              <div><span className="metric-value" style={{ color: 'var(--olive-950)' }}>{formatPercent(summary?.weightedYieldPercent)}</span><span className="metric-label" style={{ color: 'var(--muted)' }}>rendimiento</span></div>
            </div>
          </section>
          <CreateDeliveryCard campaignId={selectedCampaign.id} farms={farms} plots={plots} busy={busy} runAction={runAction} onCreated={reloadCampaign} />

          <section className="section">
            <div className="section-heading"><div><h2 className="section-title">Entregas</h2><p className="section-copy">{deliveries.length} registradas en esta campaña.</p></div></div>
            {deliveries.map((delivery) => (
              <article className="card delivery-row" key={delivery.id}>
                <div>
                  <div className="delivery-kilos">{formatKg(delivery.kilograms)}</div>
                  <div className="delivery-date">{new Date(delivery.deliveredAt).toLocaleDateString('es-ES')} · {delivery.customDestination || 'Cooperativa'}{delivery.ticketNumber ? ` · Ticket ${delivery.ticketNumber}` : ''}</div>
                </div>
                <YieldForm deliveryId={delivery.id} busy={busy} runAction={runAction} onCreated={reloadCampaign} />
              </article>
            ))}
            {!deliveries.length ? <div className="card empty-state"><strong>Aún no hay entregas</strong>Registra la primera cuando lleves aceituna a la almazara.</div> : null}
          </section>
        </>
      ) : null}
    </>
  );
}

function MoreTab({ user, holding, busy, onSignOut }: { user: User; holding: Holding | null; busy: boolean; onSignOut: () => void }) {
  return (
    <>
      <section><p className="eyebrow" style={{ color: 'var(--olive-650)' }}>Mi Mágina</p><h1 className="section-title">Cuenta y proyecto</h1></section>
      <section className="section card card-body"><p className="list-card-title">{user.name || 'Agricultor'}</p><p className="list-card-meta">{user.email}</p>{holding ? <p className="list-card-meta">Explotación activa · {holding.name}</p> : null}</section>
      <section className="section card card-body"><h2 className="section-title" style={{ fontSize: '1.25rem' }}>Identidad visual</h2><p className="section-copy">Esta rama usa la paleta, tipografía, tarjetas y navegación fijadas en la Biblia Visual V2. El recurso gráfico del logo aprobado se importará como activo único; no se genera un logo alternativo.</p></section>
      <section className="section"><button className="ghost-button danger-button" type="button" onClick={onSignOut} disabled={busy}>Cerrar sesión</button></section>
    </>
  );
}

function CreateHoldingCard({ busy, runAction, onCreated }: { busy: boolean; runAction: (action: () => Promise<void>) => Promise<void>; onCreated: () => Promise<void> }) {
  return <FormCard title="Crear explotación" submitLabel="Guardar explotación" busy={busy} onSubmit={(form) => runAction(async () => {
    await api.createHolding({ name: String(form.get('name') || ''), municipality: String(form.get('municipality') || '') || undefined, province: 'Jaén' });
    await onCreated();
  })} fields={<><Field name="name" label="Nombre" placeholder="Mi explotación" required /><Field name="municipality" label="Municipio" placeholder="Bedmar, Huelma, Cambil…" /></>} />;
}

function CreateFarmCard({ holdingId, busy, runAction, onCreated }: { holdingId: string; busy: boolean; runAction: (action: () => Promise<void>) => Promise<void>; onCreated: () => Promise<void> }) {
  return <FormCard title="Añadir finca" submitLabel="Guardar finca" busy={busy} onSubmit={(form) => runAction(async () => {
    const area = String(form.get('areaHa') || '');
    await api.createFarm(holdingId, { name: String(form.get('name') || ''), areaHa: area ? Number(area) : undefined });
    await onCreated();
  })} fields={<div className="inline-fields"><Field name="name" label="Nombre" placeholder="Las Viñas" required /><Field name="areaHa" label="Hectáreas" type="number" step="0.001" placeholder="2,50" /></div>} />;
}

function CreatePlotCard({ farmId, busy, runAction, onCreated }: { farmId: string; busy: boolean; runAction: (action: () => Promise<void>) => Promise<void>; onCreated: () => Promise<void> }) {
  return <FormCard title="Añadir parcela" submitLabel="Guardar parcela" busy={busy} onSubmit={(form) => runAction(async () => {
    const area = String(form.get('areaHa') || '');
    const trees = String(form.get('oliveTreeCount') || '');
    await api.createPlot(farmId, {
      name: String(form.get('name') || ''),
      areaHa: area ? Number(area) : undefined,
      oliveTreeCount: trees ? Number(trees) : undefined,
      sigpacReference: String(form.get('sigpacReference') || '') || undefined,
      irrigationType: (String(form.get('irrigationType') || 'unknown') as 'dryland' | 'irrigated' | 'mixed' | 'unknown'),
    });
    await onCreated();
  })} fields={<><Field name="name" label="Nombre" placeholder="Parcela Norte" required /><div className="inline-fields"><Field name="areaHa" label="Hectáreas" type="number" step="0.001" /><Field name="oliveTreeCount" label="Olivos" type="number" step="1" /></div><Field name="sigpacReference" label="Referencia SIGPAC" placeholder="Opcional" /><div className="field"><label htmlFor="irrigationType">Riego</label><select id="irrigationType" name="irrigationType" defaultValue="unknown"><option value="unknown">Sin definir</option><option value="dryland">Secano</option><option value="irrigated">Regadío</option><option value="mixed">Mixto</option></select></div></>} />;
}

function CreateCampaignCard({ holdingId, busy, runAction, onCreated }: { holdingId: string; busy: boolean; runAction: (action: () => Promise<void>) => Promise<void>; onCreated: () => Promise<void> }) {
  const year = new Date().getFullYear();
  return <FormCard title="Crear campaña" submitLabel="Abrir campaña" busy={busy} onSubmit={(form) => runAction(async () => {
    const seasonStartYear = Number(form.get('seasonStartYear') || year);
    await api.createCampaign(holdingId, { name: String(form.get('name') || `Campaña ${seasonStartYear}/${String(seasonStartYear + 1).slice(-2)}`), seasonStartYear });
    await onCreated();
  })} fields={<div className="inline-fields"><Field name="name" label="Nombre" placeholder={`Campaña ${year}/${String(year + 1).slice(-2)}`} required /><Field name="seasonStartYear" label="Año inicio" type="number" defaultValue={String(year)} required /></div>} />;
}

function CreateDeliveryCard({ campaignId, farms, plots, busy, runAction, onCreated }: { campaignId: string; farms: Farm[]; plots: Plot[]; busy: boolean; runAction: (action: () => Promise<void>) => Promise<void>; onCreated: () => Promise<void> }) {
  return <FormCard title="Nueva entrega" submitLabel="Guardar entrega" busy={busy} onSubmit={(form) => runAction(async () => {
    const clientGeneratedId = crypto.randomUUID();
    await api.createDelivery(campaignId, {
      deliveredAt: new Date(String(form.get('deliveredAt') || new Date().toISOString())).toISOString(),
      kilograms: String(form.get('kilograms') || ''),
      customDestination: String(form.get('destination') || ''),
      farmId: String(form.get('farmId') || '') || undefined,
      plotId: String(form.get('plotId') || '') || undefined,
      ticketNumber: String(form.get('ticketNumber') || '') || undefined,
      clientGeneratedId,
    }, clientGeneratedId);
    await onCreated();
  })} fields={<><div className="inline-fields"><Field name="kilograms" label="Kilos" type="number" step="0.001" placeholder="1842" required /><Field name="destination" label="Almazara / cooperativa" placeholder="San Sebastián" required /></div><div className="inline-fields"><div className="field"><label htmlFor="delivery-farm">Finca</label><select id="delivery-farm" name="farmId" defaultValue=""><option value="">Sin especificar</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select></div><div className="field"><label htmlFor="delivery-plot">Parcela</label><select id="delivery-plot" name="plotId" defaultValue=""><option value="">Sin especificar</option>{plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name}</option>)}</select></div></div><div className="inline-fields"><Field name="ticketNumber" label="Ticket" placeholder="004281" /><Field name="deliveredAt" label="Fecha y hora" type="datetime-local" defaultValue={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} required /></div></>} />;
}

function YieldForm({ deliveryId, busy, runAction, onCreated }: { deliveryId: string; busy: boolean; runAction: (action: () => Promise<void>) => Promise<void>; onCreated: () => Promise<void> }) {
  const [value, setValue] = useState('');
  return <form className="yield-form" aria-label="Añadir rendimiento" onSubmit={(event) => {
    event.preventDefault();
    if (!value) return;
    void runAction(async () => { await api.createYield(deliveryId, value); setValue(''); await onCreated(); });
  }}><label className="sr-only" htmlFor={`yield-${deliveryId}`}>Rendimiento porcentual</label><input id={`yield-${deliveryId}`} type="number" min="0" max="100" step="0.01" placeholder="21,7" value={value} onChange={(event) => setValue(event.target.value)} /><button type="submit" disabled={busy || !value}>% +</button></form>;
}

function FormCard({ title, submitLabel, busy, fields, onSubmit }: { title: string; submitLabel: string; busy: boolean; fields: React.ReactNode; onSubmit: (form: FormData) => Promise<void> }) {
  return (
    <section className="section card card-body">
      <h2 className="section-title" style={{ fontSize: '1.28rem', marginBottom: 14 }}>{title}</h2>
      <form className="form-grid" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void onSubmit(form).then(() => event.currentTarget.reset()); }}>
        {fields}
        <div className="form-actions"><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Guardando…' : submitLabel}</button></div>
      </form>
    </section>
  );
}

function Field({ name, label, type = 'text', placeholder, required, step, defaultValue }: { name: string; label: string; type?: string; placeholder?: string; required?: boolean; step?: string; defaultValue?: string }) {
  return <div className="field"><label htmlFor={name}>{label}</label><input id={name} name={name} type={type} placeholder={placeholder} required={required} step={step} defaultValue={defaultValue} /></div>;
}
