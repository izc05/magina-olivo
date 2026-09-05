import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ApiError,
  api,
  cachedOwnerUserId,
  type Campaign,
  type CampaignSummary,
  type Delivery,
  type Farm,
  type Holding,
  type Plot,
  type User,
} from './api';
import { CampaignDocuments } from './CampaignDocuments.tsx';
import { DeliveryEntryCard, DeliveryTicketButton } from './DeliveryEntryCard.tsx';
import { FieldNotebook } from './FieldNotebook.tsx';
import { MaginaPrivateHub } from './MaginaPrivateHub.tsx';
import { OfflineColdStart } from './OfflineColdStart.tsx';
import { listPendingOperations } from './offline/outbox.ts';
import { PrivateAccessGate } from './PrivateAccessGate.tsx';

type Tab = 'home' | 'field' | 'campaign' | 'magina' | 'more';
type SessionState = 'checking' | 'signed_out' | 'signed_in' | 'offline_locked';
type ActionRunner = (action: () => Promise<void>) => Promise<void>;

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

export function App({ initialTab = 'home' }: { initialTab?: Tab }) {
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>(initialTab);
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
  const pageRef = useRef<HTMLElement | null>(null);

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

  const checkSession = useCallback(async () => {
    setSessionState('checking');
    setError(null);
    try {
      const result = await api.me();
      setUser(result.user);
      setSessionState('signed_in');
    } catch (reason) {
      const hasKnownLocalOwner = Boolean(cachedOwnerUserId());
      const sessionDefinitelyRejected = reason instanceof ApiError && (reason.status === 401 || reason.status === 403);
      const unavailable = typeof navigator !== 'undefined' && navigator.onLine === false;

      if (hasKnownLocalOwner && !sessionDefinitelyRejected && (unavailable || !(reason instanceof ApiError) || reason.status >= 500)) {
        setSessionState('offline_locked');
        return;
      }

      setUser(null);
      setSessionState('signed_out');
    }
  }, []);

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
    void checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (sessionState === 'signed_in') void loadHoldings().catch((reason) => setError(messageFrom(reason)));
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

  useEffect(() => {
    const refreshAfterSync = () => {
      if (selectedCampaignId) void loadCampaign(selectedCampaignId).catch((reason) => setError(messageFrom(reason)));
    };
    window.addEventListener('magina:sync-complete', refreshAfterSync);
    return () => window.removeEventListener('magina:sync-complete', refreshAfterSync);
  }, [selectedCampaignId, loadCampaign]);

  useEffect(() => {
    if (sessionState !== 'signed_in') return;
    const frame = window.requestAnimationFrame(() => {
      pageRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [tab, sessionState]);

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
      const ownerUserId = cachedOwnerUserId();
      if (ownerUserId) {
        const pending = await listPendingOperations(ownerUserId);
        if (pending.length > 0) {
          throw new Error(`Hay ${pending.length} cambio${pending.length === 1 ? '' : 's'} pendiente${pending.length === 1 ? '' : 's'}. Sincronízalos antes de cerrar sesión para no dejar trabajo privado pendiente en este dispositivo.`);
        }
      }

      await api.signOut();
      setUser(null);
      setSessionState('signed_out');
      setHoldings([]);
      setSelectedHoldingId('');
    });
  }

  if (sessionState === 'checking') return <div className="loading-screen" role="status" aria-live="polite">Abriendo Mágina Olivo…</div>;
  if (sessionState === 'offline_locked') return <OfflineColdStart onRetry={() => void checkSession()} />;
  if (sessionState === 'signed_out' || !user) return <PrivateAccessGate returnTo={window.location.pathname} />;

  const initials = (user.name || user.email).trim().slice(0, 1).toUpperCase();
  const coverage = Math.min(100, Math.max(0, Number(summary?.coveragePercent ?? 0)));

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup" aria-label="Mágina Olivo">
          <span className="brand-title">Mágina Olivo</span>
          <span className="brand-kicker">Sierra Mágina · Jaén</span>
        </div>
        <button type="button" className="user-chip" onClick={() => setTab('more')} aria-label="Abrir perfil" aria-current={tab === 'more' ? 'page' : undefined}>{initials}</button>
      </header>

      <main className="page" ref={pageRef} tabIndex={-1}>
        {error ? <div className="alert" role="alert">{error}</div> : null}
        {holdings.length > 1 ? (
          <select className="selector" value={selectedHoldingId} onChange={(event) => setSelectedHoldingId(event.target.value)} aria-label="Explotación activa">
            {holdings.map((holding) => <option key={holding.id} value={holding.id}>{holding.name}</option>)}
          </select>
        ) : null}

        {tab === 'home' ? <HomeTab holding={selectedHolding} campaign={selectedCampaign} summary={summary} coverage={coverage} onNavigate={setTab} /> : null}
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
            deliveries={deliveries}
            summary={summary}
            busy={busy}
            runAction={runAction}
            reloadHoldingData={() => loadHoldingData(selectedHoldingId)}
            reloadCampaign={() => loadCampaign(selectedCampaignId)}
          />
        ) : null}
        {tab === 'magina' ? <MaginaPrivateHub /> : null}
        {tab === 'more' ? <MoreTab user={user} holding={selectedHolding} busy={busy} onSignOut={() => void signOut()} /> : null}
      </main>

      <nav className="bottom-nav bottom-nav-v2" aria-label="Navegación principal">
        <NavButton active={tab === 'home'} icon="⌂" label="Inicio" onClick={() => setTab('home')} />
        <NavButton active={tab === 'field'} icon="◒" label="Mi Campo" onClick={() => setTab('field')} />
        <button type="button" className="nav-plus" onClick={() => setTab('campaign')} aria-label="Registrar una entrega"><span aria-hidden="true">+</span></button>
        <NavButton active={tab === 'magina'} icon="◇" label="Mágina" onClick={() => setTab('magina')} />
        <NavButton active={tab === 'more'} icon="•••" label="Mi Mágina" onClick={() => setTab('more')} />
      </nav>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return <button type="button" className={`nav-button${active ? ' active' : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined}><span aria-hidden="true">{icon}</span>{label}</button>;
}

function HomeTab({ holding, campaign, summary, coverage, onNavigate }: { holding: Holding | null; campaign: Campaign | null; summary: CampaignSummary | null; coverage: number; onNavigate: (tab: Tab) => void }) {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">{campaign ? `Campaña ${campaign.seasonStartYear}/${String(campaign.seasonEndYear).slice(-2)}` : 'Tu campaña'}</p>
        <h1>{holding?.name ?? 'Tu olivar'}</h1>
        <p className="hero-sub">Un vistazo rápido a la campaña, sin perder de vista lo importante.</p>
        <div className="metrics">
          <Metric value={formatKg(summary?.totalKilograms)} label="entregados" />
          <Metric value={formatPercent(summary?.weightedYieldPercent)} label="rendimiento" />
          <Metric value={String(summary?.deliveriesCount ?? 0)} label="entregas" />
          <Metric value={String(summary?.pendingResultCount ?? 0)} label="sin rendimiento" />
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
        <div className="section-heading"><div><h2 className="section-title">Hoy en tu olivar</h2><p className="section-copy">Prioridades reales de campaña, sin ruido.</p></div></div>
        <article className="card list-card"><div className="list-card-main"><p className="list-card-title">Rendimientos pendientes</p><p className="list-card-meta">Añade el resultado cuando te lo facilite la almazara.</p></div><span className="badge gold">{summary?.pendingResultCount ?? 0}</span></article>
      </section>
    </>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="metric"><span className="metric-value">{value}</span><span className="metric-label">{label}</span></div>;
}

function FieldTab({ holdings, selectedHolding, farms, selectedFarm, selectedFarmId, plots, busy, setSelectedFarmId, runAction, reloadHoldings, reloadHoldingData, reloadPlots }: { holdings: Holding[]; selectedHolding: Holding | null; farms: Farm[]; selectedFarm: Farm | null; selectedFarmId: string; plots: Plot[]; busy: boolean; setSelectedFarmId: (id: string) => void; runAction: ActionRunner; reloadHoldings: () => Promise<void>; reloadHoldingData: () => Promise<void>; reloadPlots: () => Promise<void> }) {
  return (
    <>
      <PageIntro eyebrow="Mi Campo" title="Fincas y parcelas" copy="Tu estructura agrícola es la base de todo el histórico." />
      {holdings.length === 0 ? <CreateHoldingCard busy={busy} runAction={runAction} onCreated={reloadHoldings} /> : null}
      {selectedHolding ? (
        <>
          <section className="section">
            <div className="section-heading"><div><h2 className="section-title">Fincas</h2><p className="section-copy">{selectedHolding.municipality || 'Sierra Mágina'}{selectedHolding.province ? ` · ${selectedHolding.province}` : ''}</p></div></div>
            {farms.map((farm) => (
              <button key={farm.id} type="button" className="card list-card interactive" style={{ width: '100%', textAlign: 'left' }} onClick={() => setSelectedFarmId(farm.id)} aria-pressed={farm.id === selectedFarmId}>
                <div className="list-card-main"><p className="list-card-title">{farm.name}</p><p className="list-card-meta">{farm.areaHa ? `${farm.areaHa} ha` : 'Superficie pendiente'}</p></div>
                <span className={`badge${farm.id === selectedFarmId ? ' gold' : ''}`}>{farm.id === selectedFarmId ? 'Activa' : 'Ver'}</span>
              </button>
            ))}
            {!farms.length ? <EmptyState title="Añade tu primera finca">Después podrás dividirla en parcelas y asociar tus entregas.</EmptyState> : null}
          </section>
          <CreateFarmCard holdingId={selectedHolding.id} busy={busy} runAction={runAction} onCreated={reloadHoldingData} />
        </>
      ) : null}

      {selectedFarm && selectedHolding ? (
        <>
          <section className="section">
            <div className="section-heading"><div><h2 className="section-title">Parcelas de {selectedFarm.name}</h2><p className="section-copy">SIGPAC, superficie, olivos y tipo de riego.</p></div></div>
            {plots.map((plot) => (
              <article className="card list-card" key={plot.id}>
                <div className="list-card-main"><p className="list-card-title">{plot.name}</p><p className="list-card-meta">{plot.areaHa ? `${plot.areaHa} ha` : 'Sin superficie'} · {plot.oliveTreeCount ?? '—'} olivos · {plot.irrigationType || 'riego sin definir'}</p></div>
                <span className="badge">{plot.sigpacReference ? 'SIGPAC' : 'Manual'}</span>
              </article>
            ))}
            {!plots.length ? <EmptyState title="Sin parcelas todavía">Añade una para construir su línea de tiempo.</EmptyState> : null}
            <CreatePlotCard farmId={selectedFarm.id} busy={busy} runAction={runAction} onCreated={reloadPlots} />
          </section>
          <FieldNotebook holdingId={selectedHolding.id} farmId={selectedFarm.id} plots={plots} />
        </>
      ) : null}
    </>
  );
}

function CampaignTab({ selectedHolding, campaigns, selectedCampaignId, setSelectedCampaignId, selectedCampaign, farms, deliveries, summary, busy, runAction, reloadHoldingData, reloadCampaign }: { selectedHolding: Holding | null; campaigns: Campaign[]; selectedCampaignId: string; setSelectedCampaignId: (id: string) => void; selectedCampaign: Campaign | null; farms: Farm[]; deliveries: Delivery[]; summary: CampaignSummary | null; busy: boolean; runAction: ActionRunner; reloadHoldingData: () => Promise<void>; reloadCampaign: () => Promise<void> }) {
  return (
    <>
      <PageIntro eyebrow="Campaña" title="Entregas y rendimiento" copy="El núcleo productivo del olivar, con trazabilidad por entrega." />
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
              <Metric value={formatKg(summary?.totalKilograms)} label="kilos" />
              <Metric value={formatPercent(summary?.weightedYieldPercent)} label="rendimiento" />
            </div>
          </section>

          {selectedHolding ? (
            <DeliveryEntryCard
              holdingId={selectedHolding.id}
              campaignId={selectedCampaign.id}
              farms={farms}
              onSaved={reloadCampaign}
            />
          ) : null}

          <section className="section">
            <div className="section-heading"><div><h2 className="section-title">Entregas</h2><p className="section-copy">{deliveries.length} registradas en esta campaña.</p></div></div>
            {deliveries.map((delivery) => (
              <article className="card delivery-row" key={delivery.id}>
                <div>
                  <div className="delivery-kilos">{formatKg(delivery.kilograms)}</div>
                  <div className="delivery-date">{new Date(delivery.deliveredAt).toLocaleDateString('es-ES')} · {delivery.customDestination || 'Cooperativa'}{delivery.ticketNumber ? ` · Ticket ${delivery.ticketNumber}` : ''}</div>
                </div>
                <div className="delivery-actions">
                  <YieldForm deliveryId={delivery.id} busy={busy} runAction={runAction} onCreated={reloadCampaign} />
                  {selectedHolding ? <DeliveryTicketButton holdingId={selectedHolding.id} deliveryId={delivery.id} /> : null}
                </div>
              </article>
            ))}
            {!deliveries.length ? <EmptyState title="Aún no hay entregas">Registra la primera cuando lleves aceituna a la almazara.</EmptyState> : null}
          </section>
          {selectedHolding ? <CampaignDocuments holdingId={selectedHolding.id} campaignId={selectedCampaign.id} deliveries={deliveries} /> : null}
        </>
      ) : null}
    </>
  );
}

function MoreTab({ user, holding, busy, onSignOut }: { user: User; holding: Holding | null; busy: boolean; onSignOut: () => void }) {
  return (
    <>
      <PageIntro eyebrow="Mi Mágina" title="Cuenta y proyecto" />
      <section className="section card card-body"><p className="list-card-title">{user.name || 'Agricultor'}</p><p className="list-card-meta">{user.email}</p>{holding ? <p className="list-card-meta">Explotación activa · {holding.name}</p> : null}</section>
      <section className="section card card-body"><h2 className="section-title more-card-title">Identidad visual</h2><p className="section-copy">Esta rama usa la Biblia Visual V2. El logo gráfico aprobado se importará como activo único; aquí no se genera uno alternativo.</p></section>
      <section className="section"><button className="ghost-button danger-button" type="button" onClick={onSignOut} disabled={busy}>Cerrar sesión</button></section>
    </>
  );
}

function PageIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) {
  return <section><p className="eyebrow page-eyebrow">{eyebrow}</p><h1 className="section-title">{title}</h1>{copy ? <p className="section-copy">{copy}</p> : null}</section>;
}

function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="card empty-state"><strong>{title}</strong>{children}</div>;
}

function CreateHoldingCard({ busy, runAction, onCreated }: { busy: boolean; runAction: ActionRunner; onCreated: () => Promise<void> }) {
  return <FormCard title="Crear explotación" submitLabel="Guardar explotación" busy={busy} onSubmit={(form) => runAction(async () => {
    const municipality = String(form.get('municipality') || '').trim();
    const body: { name: string; municipality?: string; province?: string } = { name: String(form.get('name') || '').trim(), province: 'Jaén' };
    if (municipality) body.municipality = municipality;
    await api.createHolding(body);
    await onCreated();
  })} fields={<><Field name="name" label="Nombre" placeholder="Mi explotación" required /><Field name="municipality" label="Municipio" placeholder="Bedmar, Huelma, Cambil…" /></>} />;
}

function CreateFarmCard({ holdingId, busy, runAction, onCreated }: { holdingId: string; busy: boolean; runAction: ActionRunner; onCreated: () => Promise<void> }) {
  return <FormCard title="Añadir finca" submitLabel="Guardar finca" busy={busy} onSubmit={(form) => runAction(async () => {
    const area = String(form.get('areaHa') || '').trim();
    const body: { name: string; areaHa?: number } = { name: String(form.get('name') || '').trim() };
    if (area) body.areaHa = Number(area);
    await api.createFarm(holdingId, body);
    await onCreated();
  })} fields={<div className="inline-fields"><Field name="name" label="Nombre" placeholder="Las Viñas" required /><Field name="areaHa" label="Hectáreas" type="number" step="0.001" placeholder="2.50" /></div>} />;
}

function CreatePlotCard({ farmId, busy, runAction, onCreated }: { farmId: string; busy: boolean; runAction: ActionRunner; onCreated: () => Promise<void> }) {
  return <FormCard title="Añadir parcela" submitLabel="Guardar parcela" busy={busy} onSubmit={(form) => runAction(async () => {
    const area = String(form.get('areaHa') || '').trim();
    const trees = String(form.get('oliveTreeCount') || '').trim();
    const sigpac = String(form.get('sigpacReference') || '').trim();
    const body: { name: string; areaHa?: number; oliveTreeCount?: number; sigpacReference?: string; irrigationType?: 'dryland' | 'irrigated' | 'mixed' | 'unknown' } = {
      name: String(form.get('name') || '').trim(),
      irrigationType: String(form.get('irrigationType') || 'unknown') as 'dryland' | 'irrigated' | 'mixed' | 'unknown',
    };
    if (area) body.areaHa = Number(area);
    if (trees) body.oliveTreeCount = Number(trees);
    if (sigpac) body.sigpacReference = sigpac;
    await api.createPlot(farmId, body);
    await onCreated();
  })} fields={<><Field name="name" label="Nombre" placeholder="Parcela Norte" required /><div className="inline-fields"><Field name="areaHa" label="Hectáreas" type="number" step="0.001" /><Field name="oliveTreeCount" label="Olivos" type="number" step="1" /></div><Field name="sigpacReference" label="Referencia SIGPAC" placeholder="Opcional" /><div className="field"><label htmlFor="irrigationType">Riego</label><select id="irrigationType" name="irrigationType" defaultValue="unknown"><option value="unknown">Sin definir</option><option value="dryland">Secano</option><option value="irrigated">Regadío</option><option value="mixed">Mixto</option></select></div></>} />;
}

function CreateCampaignCard({ holdingId, busy, runAction, onCreated }: { holdingId: string; busy: boolean; runAction: ActionRunner; onCreated: () => Promise<void> }) {
  const year = new Date().getFullYear();
  return <FormCard title="Crear campaña" submitLabel="Abrir campaña" busy={busy} onSubmit={(form) => runAction(async () => {
    const seasonStartYear = Number(form.get('seasonStartYear') || year);
    await api.createCampaign(holdingId, { name: String(form.get('name') || '').trim(), seasonStartYear });
    await onCreated();
  })} fields={<div className="inline-fields"><Field name="name" label="Nombre" placeholder={`Campaña ${year}/${String(year + 1).slice(-2)}`} required /><Field name="seasonStartYear" label="Año inicio" type="number" defaultValue={String(year)} required /></div>} />;
}

function YieldForm({ deliveryId, busy, runAction, onCreated }: { deliveryId: string; busy: boolean; runAction: ActionRunner; onCreated: () => Promise<void> }) {
  const [value, setValue] = useState('');
  return (
    <form className="yield-form" aria-label="Añadir rendimiento" onSubmit={(event) => {
      event.preventDefault();
      if (!value) return;
      void runAction(async () => {
        await api.createYield(deliveryId, value);
        setValue('');
        await onCreated();
      });
    }}>
      <label className="sr-only" htmlFor={`yield-${deliveryId}`}>Rendimiento porcentual</label>
      <input id={`yield-${deliveryId}`} type="number" min="0" max="100" step="0.01" inputMode="decimal" placeholder="21,7" value={value} onChange={(event) => setValue(event.target.value)} />
      <button type="submit" disabled={busy || !value} aria-label="Guardar rendimiento porcentual">% +</button>
    </form>
  );
}

function FormCard({ title, submitLabel, busy, fields, onSubmit }: { title: string; submitLabel: string; busy: boolean; fields: ReactNode; onSubmit: (form: FormData) => Promise<void> }) {
  return (
    <section className="section card card-body">
      <h2 className="section-title form-card-title">{title}</h2>
      <form className="form-grid" onSubmit={(event) => {
        event.preventDefault();
        const target = event.currentTarget;
        const form = new FormData(target);
        void onSubmit(form).then(() => target.reset());
      }}>
        {fields}
        <div className="form-actions"><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Guardando…' : submitLabel}</button></div>
      </form>
    </section>
  );
}

type FieldProps = {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
  defaultValue?: string;
  autoComplete?: string;
  value?: string;
  onChange?: (value: string) => void;
};

function Field({ name, label, type = 'text', placeholder, required, step, defaultValue, autoComplete, value, onChange }: FieldProps) {
  return <div className="field"><label htmlFor={name}>{label}</label><input id={name} name={name} type={type} placeholder={placeholder} required={required} step={step} defaultValue={defaultValue} autoComplete={autoComplete} value={value} onChange={onChange ? (event) => onChange(event.target.value) : undefined} /></div>;
}
