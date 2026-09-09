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
import { PlotMapPanel } from './PlotMapPanel.tsx';
import { MaginaPrivateHub } from './MaginaPrivateHub.tsx';
import { MaginaAiAssistant } from './MaginaAiAssistant.tsx';
import { FieldCameraModal } from './FieldCameraModal.tsx';
import { OfflineColdStart } from './OfflineColdStart.tsx';
import { listPendingOperations } from './offline/outbox.ts';
import { PrivateAccessGate } from './PrivateAccessGate.tsx';
import { BarChart3, Bell, BookOpen, Building2, CalendarDays, ChevronLeft, ChevronRight, CircleHelp, Compass, Droplets, FileText, House, Leaf, Map, MapPin, Moon, Mountain, PackageCheck, Pencil, Plus, Settings, ShieldCheck, Sparkles, Sprout, Sun, Tractor, UserRound } from 'lucide-react';
import { PhotoCredit, VisualHeader, navigationIcons } from './VisualChrome';
import { FieldActionCenter } from './FieldActionCenter';

type Tab = 'home' | 'field' | 'campaign' | 'magina' | 'more';
export type FieldInitialView = 'home' | 'plots' | 'plot' | 'notebook' | 'map' | 'treatments' | 'irrigation';
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

function formatHa(value: string | number): string {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4 }).format(numeric)} ha` : 'Superficie pendiente';
}

function messageFrom(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Ha ocurrido un error inesperado.';
}

export function App({ initialTab = 'home', initialFieldView = 'home', initialPlotId = '' }: { initialTab?: Tab; initialFieldView?: FieldInitialView; initialPlotId?: string }) {
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
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [sunMode, setSunMode] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const pageRef = useRef<HTMLElement | null>(null);
  const activePlotsRequestFarmId = useRef('');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [darkMode]);

  useEffect(() => {
    if (sunMode) {
      document.documentElement.setAttribute('data-sun-mode', 'true');
    } else {
      document.documentElement.removeAttribute('data-sun-mode');
    }
  }, [sunMode]);

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
    let rememberedFarm = '';
    try { rememberedFarm = localStorage.getItem(`magina:farm:${cachedOwnerUserId()}:${holdingId}`) ?? ''; } catch { /* Storage may be unavailable. */ }
    const requestedFarmId = new URLSearchParams(window.location.search).get('finca') ?? '';
    setSelectedFarmId((current) => {
      const candidate = requestedFarmId || current || rememberedFarm;
      return farmResult.items.some((item) => item.id === candidate) ? candidate : (farmResult.items[0]?.id ?? '');
    });
    setSelectedCampaignId((current) => campaignResult.items.some((item) => item.id === current) ? current : (campaignResult.items[0]?.id ?? ''));
  }, []);

  const loadPlots = useCallback(async (farmId: string) => {
    if (!farmId) {
      activePlotsRequestFarmId.current = '';
      setPlots([]);
      return;
    }
    activePlotsRequestFarmId.current = farmId;
    const result = await api.plots(farmId);
    // Si el usuario cambia de finca mientras llega la respuesta, no mostramos
    // las parcelas de la finca anterior en el nuevo contexto.
    if (activePlotsRequestFarmId.current === farmId) setPlots(result.items);
  }, []);

  useEffect(() => {
    if (!user || !selectedHoldingId || !selectedFarmId) return;
    try { localStorage.setItem(`magina:farm:${user.id}:${selectedHoldingId}`, selectedFarmId); } catch { /* Navigation remains available without storage. */ }
  }, [user, selectedHoldingId, selectedFarmId]);

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
  if (sessionState === 'signed_out' || !user) return <PrivateAccessGate returnTo={window.location.pathname} area="field" />;

  const initials = (user.name || user.email).trim().slice(0, 1).toUpperCase();
  const coverage = Math.min(100, Math.max(0, Number(summary?.coveragePercent ?? 0)));

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <VisualHeader>
        <div className="visual-header-tools">
          <button
            type="button"
            className={`visual-header-tool-btn ${darkMode ? 'active' : ''}`}
            onClick={() => setDarkMode((prev) => !prev)}
            aria-label={darkMode ? 'Modo día' : 'Modo noche agrícola'}
            title="Modo noche (Dark Olive Glass)"
          >
            <Moon size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`visual-header-tool-btn ${sunMode ? 'active' : ''}`}
            onClick={() => setSunMode((prev) => !prev)}
            aria-label={sunMode ? 'Desactivar modo a pleno sol' : 'Activar modo a pleno sol'}
            title="Modo a pleno sol (alto contraste)"
          >
            <Sun size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`visual-header-tool-btn ai-btn ${showAiAssistant ? 'active' : ''}`}
            onClick={() => setShowAiAssistant((prev) => !prev)}
            aria-label="Abrir asistente Mágina IA"
            title="Mágina IA (Voz y Texto)"
          >
            <Sparkles size={18} aria-hidden="true" />
          </button>
          <a className="visual-header-action" href="/cuenta" aria-label="Abrir perfil">{initials}</a>
        </div>
      </VisualHeader>

      <main id="main-content" className="page" ref={pageRef} tabIndex={-1}>
        {showAiAssistant ? (
          <MaginaAiAssistant
            holdingId={selectedHoldingId}
            campaignId={selectedCampaignId}
            onSaved={() => {
              if (selectedCampaignId) void loadCampaign(selectedCampaignId);
              if (selectedHoldingId) void loadHoldingData(selectedHoldingId);
            }}
            onClose={() => setShowAiAssistant(false)}
          />
        ) : null}
        {showCameraModal ? (
          <FieldCameraModal
            onClose={() => setShowCameraModal(false)}
          />
        ) : null}
        {showQuickMenu ? <FieldActionCenter farms={farms} plots={plots} selectedFarmId={selectedFarmId} initialPlotId={initialPlotId} holdingId={selectedHoldingId} campaignId={selectedCampaignId} onSelectFarm={setSelectedFarmId} onSaved={async () => { await Promise.all([selectedHoldingId ? loadHoldingData(selectedHoldingId) : Promise.resolve(), selectedFarmId ? loadPlots(selectedFarmId) : Promise.resolve(), selectedCampaignId ? loadCampaign(selectedCampaignId) : Promise.resolve()]); }} onClose={() => setShowQuickMenu(false)} onCamera={() => setShowCameraModal(true)} /> : null}
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
            plots={plots}
            busy={busy}
            setSelectedFarmId={setSelectedFarmId}
            runAction={runAction}
            reloadHoldings={loadHoldings}
            reloadHoldingData={() => loadHoldingData(selectedHoldingId)}
            initialView={initialFieldView}
            initialPlotId={initialPlotId}
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
        {tab === 'more' ? <MoreTab user={user} holding={selectedHolding} farms={farms} deliveries={deliveries} summary={summary} busy={busy} onSignOut={() => void signOut()} /> : null}
      </main>

      <nav className="bottom-nav bottom-nav-v2" aria-label="Navegación principal">
        <a className="nav-button" href="/"><House aria-hidden="true" />Inicio</a>
        <a className={`nav-button${tab === 'field' || tab === 'campaign' ? ' active' : ''}`} href="/mi-campo" aria-current={tab === 'field' || tab === 'campaign' ? 'page' : undefined}><Sprout aria-hidden="true" />Mi Campo</a>
        <a className="nav-button" href="/magina"><Mountain aria-hidden="true" />Mágina</a>
        <a className="nav-button" href="/descubre"><Compass aria-hidden="true" />Descubre</a>
        <a className={`nav-button${tab === 'more' ? ' active' : ''}`} href="/cuenta" aria-current={tab === 'more' ? 'page' : undefined}><UserRound aria-hidden="true" />Perfil</a>
        <button type="button" className={`nav-plus${showQuickMenu ? ' active' : ''}`} onClick={() => setShowQuickMenu((prev) => !prev)} aria-label="Centro de acciones" aria-expanded={showQuickMenu}><Plus aria-hidden="true" /></button>
      </nav>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: 'home' | 'field' | 'magina' | 'profile'; label: string; onClick: () => void }) {
  const Icon = navigationIcons[icon];
  return <button type="button" className={`nav-button${active ? ' active' : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined}><Icon aria-hidden="true" strokeWidth={1.7} />{label}</button>;
}

function HomeTab({ holding, campaign, summary, coverage, onNavigate }: { holding: Holding | null; campaign: Campaign | null; summary: CampaignSummary | null; coverage: number; onNavigate: (tab: Tab) => void }) {
  const municipality = holding?.municipality || 'Sierra Mágina';
  const totalKg = Number(summary?.totalKilograms ?? 0);
  const yieldPct = summary?.weightedYieldPercent ? Number(summary.weightedYieldPercent) : 0;
  const estimatedOilKg = Math.round(totalKg * (yieldPct / 100));
  const estimatedRevenueEur = Math.round(estimatedOilKg * 4.85);

  return (
    <>
      {/* Weather & Daily Context Banner */}
      <section className="card" style={{ padding: '1rem', background: 'linear-gradient(135deg, #26301f 0%, #3e4f32 100%)', color: '#fff', borderRadius: '0.85rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="eyebrow" style={{ color: '#d4e1b8', margin: 0 }}>Diario del Olivar · {municipality}</p>
            <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.25rem', color: '#ffffff' }}>{holding?.name ?? 'Tu Explotación'}</h2>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '1.5rem' }}>🌤 22°C</span>
            <small style={{ display: 'block', color: '#d4e1b8', fontSize: '0.75rem' }}>AEMET · Prob. Lluvia 10%</small>
          </div>
        </div>
      </section>

      {/* iOS Style Activity Rings */}
      <section className="card" style={{ padding: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ position: 'relative', width: '90px', height: '90px', flexShrink: 0 }}>
          <svg width="90" height="90" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            {/* Outer Ring: Recolección */}
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(92,122,70,0.2)" strokeWidth="8" />
            <circle cx="50" cy="50" r="40" fill="none" stroke="#5c7a46" strokeWidth="8" strokeDasharray="251" strokeDashoffset={251 - (251 * Math.min(100, Math.max(10, totalKg / 500))) / 100} strokeLinecap="round" />
            {/* Middle Ring: Rendimiento */}
            <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(212,160,23,0.2)" strokeWidth="8" />
            <circle cx="50" cy="50" r="28" fill="none" stroke="#d4a017" strokeWidth="8" strokeDasharray="175" strokeDashoffset={175 - (175 * coverage) / 100} strokeLinecap="round" />
            {/* Inner Ring: Cuaderno */}
            <circle cx="50" cy="50" r="16" fill="none" stroke="rgba(59,130,246,0.2)" strokeWidth="8" />
            <circle cx="50" cy="50" r="16" fill="none" stroke="#3b82f6" strokeWidth="8" strokeDasharray="100" strokeDashoffset="25" strokeLinecap="round" />
          </svg>
        </div>
        <div style={{ flex: 1, display: 'grid', gap: '0.4rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--olive-950)' }}>Anillos de Salud de la Campaña</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#5c7a46', display: 'inline-block' }}></span>
            <strong>Recolección</strong>: {formatKg(totalKg)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d4a017', display: 'inline-block' }}></span>
            <strong>Rendimiento</strong>: {formatPercent(summary?.coveragePercent)} analizado
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }}></span>
            <strong>Cuaderno CUE</strong>: Al día
          </div>
        </div>
      </section>

      {/* Tu Olivo Incentive Tree Card */}
      <section className="card" style={{ padding: '1.2rem', marginBottom: '1rem', background: 'linear-gradient(135deg, rgba(212,160,23,0.12) 0%, rgba(92,122,70,0.15) 100%)', border: '1px solid rgba(212,160,23,0.3)', borderRadius: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <span className="badge gold" style={{ fontSize: '0.7rem', marginBottom: '0.3rem' }}>🌳 Tu Olivo de Incentivos</span>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--olive-950)' }}>Tienes 250 aceitunas para recoger</h3>
            <p style={{ margin: '0.3rem 0 0.75rem', fontSize: '0.8rem', color: 'var(--muted)' }}>Cada labor y pesada carga frutos en tu árbol virtual. ¡Canjéalos por regalos!</p>
          </div>
          <a href="/tu-olivo" style={{ display: 'inline-grid', placeItems: 'center', width: '54px', height: '54px', borderRadius: '50%', background: 'var(--olive-950)', color: '#fff', textDecoration: 'none', flexShrink: 0 }}>
            <span style={{ fontSize: '1.5rem' }}>🫒</span>
          </a>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <a className="primary-button" href="/tu-olivo" style={{ textDecoration: 'none', fontSize: '0.8rem', minHeight: '38px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            🌿 Recoger Cosecha de Aceitunas
          </a>
          <a className="secondary-button" href="/recompensas" style={{ textDecoration: 'none', fontSize: '0.8rem', minHeight: '38px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            🎁 Catálogo de Premios
          </a>
        </div>
      </section>

      <section className="hero">
        <p className="eyebrow">{campaign ? `Campaña ${campaign.seasonStartYear}/${String(campaign.seasonEndYear).slice(-2)}` : 'Tu campaña'}</p>
        <div className="metrics">
          <Metric value={formatKg(summary?.totalKilograms)} label="entregados" />
          <Metric value={formatPercent(summary?.weightedYieldPercent)} label="rendimiento" />
          <Metric value={estimatedOilKg > 0 ? `${new Intl.NumberFormat('es-ES').format(estimatedOilKg)} kg` : '—'} label="aceite AOVE est." />
          <Metric value={estimatedRevenueEur > 0 ? `${new Intl.NumberFormat('es-ES').format(estimatedRevenueEur)} €` : '—'} label="valoración est. (4,85€/kg)" />
        </div>
        <div className="coverage">Cobertura de rendimiento · {formatPercent(summary?.coveragePercent)}<div className="coverage-track"><div className="coverage-fill" style={{ width: `${coverage}%` }} /></div></div>
      </section>

      <section className="quick-actions" aria-label="Acciones rápidas">
        <button type="button" className="quick-button" onClick={() => onNavigate('campaign')}>+ Entrega</button>
        <button type="button" className="quick-button" onClick={() => onNavigate('field')}>Mi Campo</button>
        <a className="quick-button" href="/calendario" style={{ textDecoration: 'none', textAlign: 'center' }}>📅 Tareas</a>
        <a className="quick-button" href="/magina/noticias" style={{ textDecoration: 'none', textAlign: 'center' }}>📰 Noticias</a>
      </section>

      <section className="section">
        <div className="section-heading"><div><h2 className="section-title">Prioridades de Hoy</h2><p className="section-copy">Estado y avisos clave de tu olivar.</p></div></div>
        <article className="card list-card" style={{ marginBottom: '0.5rem' }}>
          <div className="list-card-main">
            <p className="list-card-title">Rendimientos pendientes de almazara</p>
            <p className="list-card-meta">Añade el rendimiento cuando te entreguen el albarán.</p>
          </div>
          <span className="badge gold">{summary?.pendingResultCount ?? 0}</span>
        </article>
        <article className="card list-card">
          <div className="list-card-main">
            <p className="list-card-title">Aviso Sanitario RAIF Olivar</p>
            <p className="list-card-meta">Riesgo moderado de mosca del olivo en Sierra Mágina. Mantener vigilancia.</p>
          </div>
          <span className="badge green">RAIF</span>
        </article>
      </section>
    </>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="metric"><span className="metric-value">{value}</span><span className="metric-label">{label}</span></div>;
}

function irrigationLabel(value: string | null): string {
  if (value === 'dryland') return 'Secano';
  if (value === 'irrigated') return 'Regadío';
  if (value === 'mixed') return 'Mixto';
  return 'Sin definir';
}

function FieldTab({ holdings, selectedHolding, farms, selectedFarm, plots, busy, setSelectedFarmId, runAction, reloadHoldings, reloadHoldingData, initialView, initialPlotId }: { holdings: Holding[]; selectedHolding: Holding | null; farms: Farm[]; selectedFarm: Farm | null; plots: Plot[]; busy: boolean; setSelectedFarmId: (id: string) => void; runAction: ActionRunner; reloadHoldings: () => Promise<void>; reloadHoldingData: () => Promise<void>; initialView: FieldInitialView; initialPlotId: string }) {
  const requestedFarmId = new URLSearchParams(window.location.search).get('finca') ?? '';
  const requestedPlotId = initialPlotId || new URLSearchParams(window.location.search).get('parcela') || '';
  const [selectedPlotId, setSelectedPlotId] = useState('');
  const [fieldView, setFieldView] = useState<FieldInitialView>(initialView);
  const [showFarmDetail, setShowFarmDetail] = useState(initialView === 'plots' || initialView === 'plot' || initialView === 'notebook' || initialView === 'treatments' || initialView === 'irrigation' || Boolean(requestedFarmId));
  const [showMapWorkspace, setShowMapWorkspace] = useState(initialView === 'map');
  const [farmPlotCounts, setFarmPlotCounts] = useState<Record<string, number>>({});
  const selectedPlot = useMemo(() => plots.find((plot) => plot.id === selectedPlotId) ?? null, [plots, selectedPlotId]);

  useEffect(() => {
    setSelectedPlotId((current) => {
      if (requestedPlotId && plots.some((plot) => plot.id === requestedPlotId)) return requestedPlotId;
      return plots.some((plot) => plot.id === current) ? current : '';
    });
  }, [plots, requestedPlotId]);

  useEffect(() => {
    if (requestedFarmId && farms.some((farm) => farm.id === requestedFarmId)) setSelectedFarmId(requestedFarmId);
  }, [farms, requestedFarmId, setSelectedFarmId]);

  useEffect(() => {
    setFieldView(initialView);
    setShowMapWorkspace(initialView === 'map');
    setShowFarmDetail((initialView !== 'home' && initialView !== 'map') || Boolean(requestedFarmId) || Boolean(requestedPlotId));
  }, [initialView, requestedFarmId, requestedPlotId]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all(farms.map(async (farm) => [farm.id, (await api.plots(farm.id)).items.length] as const))
      .then((entries) => { if (!cancelled) setFarmPlotCounts(Object.fromEntries(entries)); })
      .catch(() => { if (!cancelled) setFarmPlotCounts({}); });
    return () => { cancelled = true; };
  }, [farms]);

  const selectedFarmOliveTrees = plots.reduce((total, plot) => total + (plot.oliveTreeCount ?? 0), 0);
  const notebookActivityType = fieldView === 'treatments' ? 'treatment' : fieldView === 'irrigation' ? 'irrigation' : undefined;
  const showingFarmOverview = fieldView === 'home' || fieldView === 'plots';
  const contextualFieldHref = (path: string, includePlot = false) => {
    const search = new URLSearchParams();
    if (selectedFarm?.id) search.set('finca', selectedFarm.id);
    if (includePlot && selectedPlotId) search.set('parcela', selectedPlotId);
    const query = search.toString();
    return query ? `${path}?${query}` : path;
  };
  const openFieldView = (view: Exclude<FieldInitialView, 'plot'>) => {
    const paths = { home: '/mi-campo', plots: '/mi-campo/parcelas', map: '/mi-campo/mapa', notebook: '/mi-campo/cuaderno', treatments: '/mi-campo/tratamientos', irrigation: '/mi-campo/riegos' };
    window.location.assign(contextualFieldHref(paths[view], view !== 'home' && view !== 'plots'));
  };
  const openMapWorkspace = () => {
    openFieldView('map');
  };

  return (
    <>
      {holdings.length === 0 ? <CreateHoldingCard busy={busy} runAction={runAction} onCreated={reloadHoldings} /> : null}
      {selectedHolding && !showFarmDetail && !showMapWorkspace && initialView === 'home' ? <FarmListHome holding={selectedHolding} farms={farms} farmPlotCounts={farmPlotCounts} busy={busy} runAction={runAction} onCreated={reloadHoldingData} /> : null}

      {selectedFarm && selectedHolding && showMapWorkspace ? (
        <>
          <FieldBackBar backHref={contextualFieldHref('/mi-campo')} label="Mis fincas" />
          <section className="field-map-workspace" id="mapa-parcelas" aria-labelledby="field-map-workspace-title">
            <div className="field-map-workspace-heading">
              <div><p className="eyebrow">{selectedFarm.name} · Mi Campo</p><h1 id="field-map-workspace-title">Mapa de parcelas</h1><p>Trabaja con GPS, ortofoto PNOA, relieve y fuentes oficiales sin perder el contexto de tu finca.</p></div>
              <button type="button" className="ghost-button" onClick={() => openFieldView('plots')}>Ver parcelas</button>
            </div>
            <PlotMapPanel farmId={selectedFarm.id} />
          </section>
          <PhotoCredit field />
        </>
      ) : null}

      {selectedFarm && selectedHolding && showFarmDetail && !showMapWorkspace ? (
        <>
          {fieldView === 'plot' ? <FieldBackBar backHref={contextualFieldHref('/mi-campo')} label={selectedFarm.name} /> : <FieldBackBar backHref="/mi-campo" label="Mis fincas" />}
          {fieldView !== 'plot' ? <section className="farm-detail-card farm-detail-hero" aria-labelledby="selected-farm-title">
            <div>
              <p className="eyebrow">Finca activa</p>
              <h1 id="selected-farm-title">{selectedFarm.name}</h1>
              <p>{selectedHolding.name}{selectedHolding.municipality ? ` · ${selectedHolding.municipality}` : ''}</p>
            </div>
            <div className="farm-detail-metrics" aria-label={`Resumen de ${selectedFarm.name}`}>
              <div><span>Superficie</span><strong>{selectedFarm.areaHa != null ? formatHa(selectedFarm.areaHa) : 'Pendiente'}</strong></div>
              <div><span>Parcelas</span><strong>{plots.length}</strong></div>
              <div><span>Olivos</span><strong>{selectedFarmOliveTrees ? new Intl.NumberFormat('es-ES').format(selectedFarmOliveTrees) : '—'}</strong></div>
            </div>
          </section> : null}
          {showingFarmOverview ? <>
          <FarmWorkspaceCards farm={selectedFarm} plots={plots} />
          <section className="section" id="parcelas">
            <div className="section-heading"><div><p className="eyebrow page-eyebrow">Finca activa</p><h2 className="section-title">Parcelas</h2><p className="section-copy">Abre una parcela para consultar sus datos y trabajar dentro de ella.</p></div></div>
            {plots.map((plot) => (
              <a className="card list-card interactive plot-list-card" key={plot.id} href={`/mi-campo/parcelas/${encodeURIComponent(plot.id)}?finca=${encodeURIComponent(selectedFarm.id)}`}>
                <span className="visual-icon-tile"><Sprout aria-hidden="true" /></span>
                <div className="list-card-main"><p className="list-card-title">{plot.name}</p><p className="list-card-meta">{[plot.areaHa != null ? formatHa(plot.areaHa) : null, plot.oliveTreeCount != null ? `${plot.oliveTreeCount} olivos` : null, plot.irrigationType ? irrigationLabel(plot.irrigationType) : null].filter(Boolean).join(' · ') || 'Información pendiente'}</p></div>
                {plot.sigpacReference ? <span className="badge">SIGPAC</span> : null}
                <ChevronRight className="row-chevron" aria-hidden="true" />
              </a>
            ))}
            {!plots.length ? <EmptyState title="Aún no has añadido parcelas a esta finca.">Usa el botón + para crearla con GPS, Catastro o SIGPAC.</EmptyState> : null}
          </section>
          </> : null}
          {fieldView === 'plot' && selectedPlot ? <PlotDetailScreen farm={selectedFarm} holding={selectedHolding} plot={selectedPlot} /> : null}
          {fieldView === 'plot' && !selectedPlot ? <EmptyState title="No encontramos esta parcela en la finca seleccionada.">Vuelve a la finca y elige una de sus parcelas.</EmptyState> : null}
          {fieldView === 'notebook' || fieldView === 'treatments' || fieldView === 'irrigation' ? <div id="cuaderno"><FieldNotebook holdingId={selectedHolding.id} farmId={selectedFarm.id} plots={plots} onOpenMap={openMapWorkspace} initialActivityType={notebookActivityType} openEntry={Boolean(notebookActivityType) || new URLSearchParams(window.location.search).get('new') === 'activity'} /></div> : null}
          <PhotoCredit field />
        </>
      ) : null}
    </>
  );
}

function FarmListHome({ holding, farms, farmPlotCounts, busy, runAction, onCreated }: { holding: Holding; farms: Farm[]; farmPlotCounts: Record<string, number>; busy: boolean; runAction: ActionRunner; onCreated: () => Promise<void> }) {
  const totalArea = farms.reduce((total, farm) => total + (Number(farm.areaHa) || 0), 0);
  const totalPlots = farms.reduce((total, farm) => total + (farmPlotCounts[farm.id] ?? 0), 0);
  const showFarmForm = new URLSearchParams(window.location.search).get('new') === 'farm';

  return <>
    <section className="field-farms-home-intro" aria-labelledby="field-farms-home-title">
      <p className="eyebrow">MI CAMPO</p>
      <h1 id="field-farms-home-title">Mis fincas</h1>
      <p>{holding.name}{[holding.municipality, holding.province].filter(Boolean).length ? ` · ${[holding.municipality, holding.province].filter(Boolean).join(' · ')}` : ''}</p>
    </section>

    <section className="field-farms-summary" aria-label="Resumen de mis fincas">
      <div><span className="visual-icon-tile"><Tractor aria-hidden="true" /></span><small>Fincas</small><strong>{farms.length}</strong></div>
      <div><span className="visual-icon-tile"><Map aria-hidden="true" /></span><small>Parcelas</small><strong>{totalPlots}</strong></div>
      <div><span className="visual-icon-tile"><Sprout aria-hidden="true" /></span><small>Superficie</small><strong>{totalArea > 0 ? formatHa(totalArea) : '—'}</strong></div>
    </section>

    <section className="field-farms-list" aria-labelledby="field-farms-list-title">
      <div className="section-heading"><div><h2 id="field-farms-list-title" className="section-title">Elige una finca</h2><p className="section-copy">Al abrirla verás sus parcelas, mapa y registros de trabajo.</p></div></div>
      {farms.map((farm) => <a key={farm.id} className="field-farm-home-card" href={`/mi-campo?finca=${encodeURIComponent(farm.id)}`}>
        <img className="field-farm-home-photo" src="/photos/field-olivares-magina.webp" alt="" />
        <span className="field-farm-home-copy"><strong>{farm.name}</strong><small>{[farm.areaHa != null ? formatHa(farm.areaHa) : null, `${farmPlotCounts[farm.id] ?? 0} parcela${(farmPlotCounts[farm.id] ?? 0) === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</small><em>Abrir finca</em></span>
        <ChevronRight aria-hidden="true" />
      </a>)}
      <a className="field-farm-add-card" href="/mi-campo?new=farm"><span className="visual-icon-tile"><Plus aria-hidden="true" /></span><span><strong>Nueva finca</strong><small>Añade una finca a tu explotación</small></span><ChevronRight aria-hidden="true" /></a>
      {!farms.length ? <EmptyState title="Aún no has añadido ninguna finca.">Crea tu primera finca para organizar parcelas, mapas y registros.</EmptyState> : null}
    </section>

    {showFarmForm || !farms.length ? <CreateFarmCard holdingId={holding.id} busy={busy} runAction={runAction} onCreated={onCreated} firstFarm={farms.length === 0} /> : null}
    <PhotoCredit field />
  </>;
}

function FarmWorkspaceCards({ farm, plots }: { farm: Farm; plots: Plot[] }) {
  const farmQuery = `finca=${encodeURIComponent(farm.id)}`;
  const cards = [
    { label: 'Mapa y lindes', detail: 'GPS, SIGPAC y Catastro', href: `/mi-campo/mapa?${farmQuery}`, icon: Map, tone: 'map' },
    { label: 'Cuaderno', detail: 'Trabajos e historial', href: `/mi-campo/cuaderno?${farmQuery}`, icon: BookOpen, tone: 'gold' },
    { label: 'Riegos', detail: plots.length ? 'Control del agua' : 'Añade una parcela primero', href: `/mi-campo/riegos?${farmQuery}`, icon: Droplets, tone: 'water' },
    { label: 'Tratamientos', detail: 'Cuaderno fitosanitario', href: `/mi-campo/tratamientos?${farmQuery}`, icon: Leaf, tone: 'leaf' },
  ];
  return <section className="farm-workspace" aria-label={`Herramientas de ${farm.name}`}>
    <div className="farm-workspace-heading"><div><p className="eyebrow page-eyebrow">Ficha de finca</p><h2>Gestiona {farm.name}</h2></div>{farm.description ? <p>{farm.description}</p> : <p>Selecciona una herramienta o entra en una parcela para trabajar con más detalle.</p>}</div>
    <div className="farm-workspace-grid">{cards.map((card) => { const Icon = card.icon; return <a key={card.label} className="farm-workspace-card" href={card.href}><span className={`visual-icon-tile ${card.tone}`}><Icon aria-hidden="true" /></span><span><strong>{card.label}</strong><small>{card.detail}</small></span><ChevronRight aria-hidden="true" /></a>; })}</div>
  </section>;
}

function FieldBackBar({ backHref, label }: { backHref: string; label: string }) {
  return <nav className="field-back-bar" aria-label="Volver a Mi Campo"><a className="field-back-button" href={backHref}><ChevronLeft aria-hidden="true" />{label}</a></nav>;
}

function PlotDetailScreen({ farm, holding, plot }: { farm: Farm; holding: Holding; plot: Plot }) {
  const mapHref = `/mi-campo/mapa?finca=${encodeURIComponent(farm.id)}&parcela=${encodeURIComponent(plot.id)}`;
  const notebookHref = `/mi-campo/cuaderno?finca=${encodeURIComponent(farm.id)}&parcela=${encodeURIComponent(plot.id)}`;
  return <>
    <section className="plot-profile-hero" aria-labelledby="plot-profile-title">
      <img src="/photos/field-olivares-magina.webp" alt="" />
      <div className="plot-profile-copy"><p className="eyebrow">PARCELA</p><h1 id="plot-profile-title">{plot.name}</h1><p><MapPin aria-hidden="true" />{farm.name} · {holding.municipality || holding.province || 'Ubicación pendiente'}</p></div>
    </section>
    <section className="plot-profile-summary" aria-label={`Resumen de ${plot.name}`}>
      <div><span className="visual-icon-tile"><Map aria-hidden="true" /></span><small>Superficie</small><strong>{plot.areaHa != null ? formatHa(plot.areaHa) : 'Pendiente'}</strong></div>
      <div><span className="visual-icon-tile"><Sprout aria-hidden="true" /></span><small>Olivos</small><strong>{plot.oliveTreeCount != null ? new Intl.NumberFormat('es-ES').format(plot.oliveTreeCount) : 'Pendiente'}</strong></div>
      <div><span className="visual-icon-tile"><Droplets aria-hidden="true" /></span><small>Riego</small><strong>{irrigationLabel(plot.irrigationType)}</strong></div>
    </section>
    <section className="plot-profile-details card" aria-labelledby="plot-data-title">
      <div className="section-heading"><div><p className="eyebrow">Ficha de parcela</p><h2 id="plot-data-title" className="section-title">Información</h2></div></div>
      <dl>
        <div><dt>Finca</dt><dd>{farm.name}</dd></div>
        <div><dt>Referencia SIGPAC</dt><dd>{plot.sigpacReference || 'Sin vincular'}</dd></div>
        <div><dt>Superficie</dt><dd>{plot.areaHa != null ? formatHa(plot.areaHa) : 'Sin registrar'}</dd></div>
        <div><dt>Riego</dt><dd>{irrigationLabel(plot.irrigationType)}</dd></div>
        {plot.notes ? <div className="plot-profile-notes"><dt>Notas</dt><dd>{plot.notes}</dd></div> : null}
      </dl>
    </section>
    <section className="plot-profile-links" aria-label="Consultar la parcela">
      <a className="plot-profile-link" href={mapHref}><span className="visual-icon-tile"><Map aria-hidden="true" /></span><span><strong>Mapa, GPS y Catastro</strong><small>Consulta el perímetro y las fuentes oficiales.</small></span><ChevronRight aria-hidden="true" /></a>
      <a className="plot-profile-link" href={notebookHref}><span className="visual-icon-tile"><BookOpen aria-hidden="true" /></span><span><strong>Cuaderno e historial</strong><small>Consulta los trabajos registrados en esta parcela.</small></span><ChevronRight aria-hidden="true" /></a>
    </section>
    <p className="plot-profile-context"><Sprout aria-hidden="true" />El botón + ya tiene seleccionada esta parcela para cualquier nuevo registro.</p>
  </>;
}

function CampaignTab({ selectedHolding, campaigns, selectedCampaignId, setSelectedCampaignId, selectedCampaign, farms, deliveries, summary, busy, runAction, reloadHoldingData, reloadCampaign }: { selectedHolding: Holding | null; campaigns: Campaign[]; selectedCampaignId: string; setSelectedCampaignId: (id: string) => void; selectedCampaign: Campaign | null; farms: Farm[]; deliveries: Delivery[]; summary: CampaignSummary | null; busy: boolean; runAction: ActionRunner; reloadHoldingData: () => Promise<void>; reloadCampaign: () => Promise<void> }) {
  const quickIntent = new URLSearchParams(window.location.search).get('new');
  const deliveryDisclosureRef = useRef<HTMLDetailsElement>(null);
  const latestDelivery = deliveries[0] ?? null;
  const latestDeliveryDate = latestDelivery
    ? new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(latestDelivery.deliveredAt))
    : 'Sin entregas';

  useEffect(() => {
    if (!selectedCampaign) return;
    if (quickIntent === 'delivery') {
      deliveryDisclosureRef.current?.setAttribute('open', '');
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('.delivery-entry-card')?.focus({ preventScroll: false });
      });
    }
    if (quickIntent === 'document') {
      window.requestAnimationFrame(() => document.querySelector('#documentos')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }, [quickIntent, selectedCampaign]);

  return (
    <>
      {selectedHolding && !campaigns.length ? <><EmptyState title="Aún no tienes una campaña creada.">Crea la campaña para empezar a registrar tus entregas.</EmptyState><CreateCampaignCard holdingId={selectedHolding.id} busy={busy} runAction={runAction} onCreated={reloadHoldingData} /></> : null}

      {selectedCampaign ? (
        <>
          <section className="campaign-reference-hero" aria-labelledby="campaign-detail-title">
            <div className="campaign-reference-copy">
              <p className="eyebrow">{selectedCampaign.name}</p>
              <h2 id="campaign-detail-title">{selectedHolding?.name ?? 'Tu olivar'}</h2>
              <p>{selectedHolding?.municipality ? `${selectedHolding.municipality}${selectedHolding.province ? ` · ${selectedHolding.province}` : ''}` : 'Tu explotación activa'}</p>
              <span>Tradición, esfuerzo y un olivar con futuro.</span>
              {campaigns.length > 1 ? <label className="campaign-hero-select"><span>Cambiar campaña</span><select value={selectedCampaignId} onChange={(event) => setSelectedCampaignId(event.target.value)} aria-label="Cambiar campaña">{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label> : null}
            </div>
          </section>

          <section className="campaign-metric-cards" aria-label={`Resumen de ${selectedCampaign.name}`}>
            <article className="card"><span className="campaign-context-icon"><Tractor /></span><small>Total entregado</small><strong>{formatKg(summary?.totalKilograms)}</strong><em>Esta campaña</em></article>
            <article className="card"><span className="campaign-context-icon"><BarChart3 /></span><small>Rendimiento medio</small><strong>{formatPercent(summary?.weightedYieldPercent)}</strong><em>{summary?.pendingResultCount ? `${summary.pendingResultCount} pendiente${summary.pendingResultCount === 1 ? '' : 's'}` : 'Media disponible'}</em></article>
            <article className="card"><span className="campaign-context-icon"><CalendarDays /></span><small>Última entrega</small><strong>{latestDelivery ? formatKg(latestDelivery.kilograms) : '—'}</strong><em>{latestDeliveryDate}</em></article>
            <article className="card campaign-destination-metric"><span className="campaign-context-icon"><Building2 /></span><small>Cooperativa</small><strong>{latestDelivery?.customDestination || 'Pendiente'}</strong><em>{summary?.deliveriesCount ?? 0} entregas</em></article>
          </section>

          {selectedHolding ? <details ref={deliveryDisclosureRef} className="campaign-create-disclosure"><summary><Plus aria-hidden="true" />Registrar entrega</summary><DeliveryEntryCard holdingId={selectedHolding.id} campaignId={selectedCampaign.id} farms={farms} onSaved={reloadCampaign} /></details> : null}

          <CampaignDeliveryTrend deliveries={deliveries} />

          <section className="section campaign-history-section">
            <div className="section-heading"><div><p className="eyebrow page-eyebrow">Campaña · {selectedCampaign.name}</p><h2 className="section-title">Historial de entregas</h2><p className="section-copy">{deliveries.length} registradas con destino y rendimiento.</p></div><a className="text-button" href="#documentos">Documentos</a></div>
            {deliveries.map((delivery) => (
              <DeliveryHistoryRow key={delivery.id} delivery={delivery} holdingId={selectedHolding?.id ?? ''} busy={busy} runAction={runAction} onCreated={reloadCampaign} />
            ))}
            {!deliveries.length ? <EmptyState title="Aún no hay entregas.">Registra la primera cuando lleves aceituna a la almazara.</EmptyState> : null}
          </section>
          <CampaignComparisons campaigns={campaigns} selectedCampaignId={selectedCampaign.id} selectedSummary={summary} />
          {selectedHolding ? <CampaignDocuments holdingId={selectedHolding.id} campaignId={selectedCampaign.id} deliveries={deliveries} /> : null}
        </>
      ) : null}
    </>
  );
}

function CampaignDeliveryTrend({ deliveries }: { deliveries: Delivery[] }) {
  const trendDeliveries = useMemo(() => deliveries
    .slice(0, 7)
    .sort((a, b) => new Date(a.deliveredAt).getTime() - new Date(b.deliveredAt).getTime()), [deliveries]);
  const maxKilograms = Math.max(1, ...trendDeliveries.map((delivery) => Number(delivery.kilograms)));

  if (!trendDeliveries.length) return null;

  return (
    <section className="section campaign-delivery-trend" aria-labelledby="campaign-trend-title">
      <div className="section-heading">
        <div><p className="eyebrow page-eyebrow">DATOS PROPIOS</p><h2 id="campaign-trend-title" className="section-title">Evolución de entregas</h2><p className="section-copy">Kilogramos registrados en esta campaña.</p></div>
      </div>
      <div className="card campaign-trend-card">
        <ol className="campaign-trend-bars" aria-label="Entregas registradas por fecha">
          {trendDeliveries.map((delivery) => {
            const kilograms = Number(delivery.kilograms);
            const percentage = Math.max(8, Math.round((kilograms / maxKilograms) * 100));
            const date = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(new Date(delivery.deliveredAt));
            return <li key={delivery.id} aria-label={`${date}: ${formatKg(delivery.kilograms)}`}><span className="campaign-trend-value">{formatKg(delivery.kilograms)}</span><span className="campaign-trend-bar" style={{ '--delivery-height': `${percentage}%` } as React.CSSProperties} /><span className="campaign-trend-date">{date}</span></li>;
          })}
        </ol>
      </div>
    </section>
  );
}

function CampaignComparisons({ campaigns, selectedCampaignId, selectedSummary }: { campaigns: Campaign[]; selectedCampaignId: string; selectedSummary: CampaignSummary | null }) {
  const [summaries, setSummaries] = useState<Record<string, CampaignSummary>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const otherCampaigns = campaigns.filter((campaign) => campaign.id !== selectedCampaignId);
    if (!otherCampaigns.length) return undefined;

    setIsLoading(true);
    void Promise.all(otherCampaigns.map(async (campaign) => [campaign.id, await api.campaignSummary(campaign.id)] as const))
      .then((items) => {
        if (!active) return;
        setSummaries((current) => ({ ...current, ...Object.fromEntries(items) }));
      })
      .catch(() => {
        // A campaign can still be used without a historical comparison while offline.
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, [campaigns, selectedCampaignId]);

  const comparableCampaigns = useMemo(() => campaigns
    .filter((campaign) => campaign.id === selectedCampaignId || summaries[campaign.id])
    .map((campaign) => ({ campaign, summary: campaign.id === selectedCampaignId ? selectedSummary : summaries[campaign.id] }))
    .filter((item): item is { campaign: Campaign; summary: CampaignSummary } => item.summary != null)
    .sort((a, b) => b.campaign.seasonStartYear - a.campaign.seasonStartYear)
    .slice(0, 3), [campaigns, selectedCampaignId, selectedSummary, summaries]);
  const previous = comparableCampaigns.find((item) => item.campaign.id !== selectedCampaignId) ?? null;
  const currentKg = Number(selectedSummary?.totalKilograms ?? 0);
  const previousKg = Number(previous?.summary.totalKilograms ?? 0);
  const deltaKg = currentKg - previousKg;
  const maxKilograms = Math.max(1, ...comparableCampaigns.map((item) => Number(item.summary.totalKilograms)));

  return (
    <section className="section campaign-comparison-section" aria-labelledby="campaign-comparison-title">
      <div className="section-heading">
        <div><p className="eyebrow page-eyebrow">COMPARATIVAS</p><h2 id="campaign-comparison-title" className="section-title">Evolución de tu explotación</h2><p className="section-copy">Producción y rendimiento por campaña, a partir de tus entregas registradas.</p></div>
      </div>
      <div className="card campaign-comparison-card">
        <div className="campaign-comparison-head"><div><p className="eyebrow">Producción entregada</p><strong>{formatKg(selectedSummary?.totalKilograms)}</strong><span>Campaña seleccionada</span></div><span className="campaign-comparison-chip">Datos propios</span></div>
        {comparableCampaigns.map(({ campaign, summary: campaignSummary }) => {
          const kilograms = Number(campaignSummary.totalKilograms);
          const hasYield = campaignSummary.weightedYieldPercent != null;
          return (
            <div className="campaign-comparison-row" key={campaign.id}>
              <div className="campaign-comparison-label"><strong>{campaign.name}</strong><span>{formatKg(kilograms)} · {hasYield ? `${formatPercent(campaignSummary.weightedYieldPercent)} rendimiento` : 'Rendimiento pendiente'}</span></div>
              <meter min="0" max={maxKilograms} value={kilograms} aria-label={`${campaign.name}: ${formatKg(kilograms)}`} />
            </div>
          );
        })}
        {isLoading ? <p className="campaign-comparison-loading" role="status">Calculando el histórico de campañas…</p> : null}
        {previous ? <div className={`campaign-comparison-insight${deltaKg < 0 ? ' is-negative' : ''}`}><strong>{deltaKg >= 0 ? '↑' : '↓'} {formatKg(Math.abs(deltaKg))}</strong><span>frente a {previous.campaign.name}</span></div> : null}
        {!previous && !isLoading ? <p className="campaign-comparison-empty">Registra al menos una campaña cerrada para ver la evolución entre temporadas.</p> : null}
        <p className="campaign-comparison-note">La comparación con la media de Sierra Mágina se mostrará cuando dispongamos de una fuente comarcal verificada.</p>
      </div>
    </section>
  );
}

function MoreTab({ user, holding, farms, deliveries, summary, busy, onSignOut }: { user: User; holding: Holding | null; farms: Farm[]; deliveries: Delivery[]; summary: CampaignSummary | null; busy: boolean; onSignOut: () => void }) {
  const initials = (user.name || user.email).trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const profileLinks = [
    { href: '/tu-olivo', icon: Leaf, title: 'Tu Olivo', copy: 'Cuida tu árbol virtual y consulta tus recompensas' },
    { href: '/perfil/editar', icon: UserRound, title: 'Datos personales', copy: 'Nombre, contacto e información de tu cuenta' },
    { href: '/cuenta#cooperativa', icon: MapPin, title: 'Municipio y cooperativa', copy: 'Tu ubicación y entidad de referencia' },
    { href: '/perfil/preferencias', icon: Settings, title: 'Preferencias', copy: 'Configura la información de tu inicio' },
    { href: '/perfil/notificaciones', icon: Bell, title: 'Notificaciones', copy: 'Gestiona tus alertas y avisos' },
    { href: '/perfil/privacidad', icon: ShieldCheck, title: 'Privacidad', copy: 'Controla tus datos y permisos' },
    { href: '/perfil/soporte', icon: CircleHelp, title: 'Soporte', copy: 'Ayuda, contacto y preguntas frecuentes' },
  ];
  return (
    <>
      <PageIntro eyebrow="MI PERFIL" title="Mi perfil" copy="Tu información y preferencias en un solo lugar." />
      <section className="section card more-profile-card profile-reference-card" aria-labelledby="more-profile-title">
        <span className="profile-initials" aria-hidden="true">{initials}</span>
        <div className="profile-reference-main">
          <h2 id="more-profile-title" className="section-title more-card-title">{user.name || 'Agricultor'}</h2>
          <p className="list-card-meta"><MapPin aria-hidden="true" />{holding?.municipality || 'Sierra Mágina'}</p>
          <p className="list-card-meta"><Building2 aria-hidden="true" />{holding ? `Explotación · ${holding.name}` : 'Sin explotación activa'}</p>
          <p className="list-card-meta profile-email">{user.email}</p>
        </div>
        <a className="profile-edit-button" href="/perfil/editar"><Pencil aria-hidden="true" /> Editar perfil</a>
        <div className="profile-real-stats"><span><Tractor aria-hidden="true" /><strong>{farms.length}</strong><small>Fincas</small></span><span><PackageCheck aria-hidden="true" /><strong>{deliveries.length}</strong><small>Entregas</small></span><span><BarChart3 aria-hidden="true" /><strong>{formatKg(summary?.totalKilograms)}</strong><small>Aceitunas</small></span></div>
      </section>
      <section className="section more-links profile-reference-links" aria-label="Opciones del perfil">
        {profileLinks.map(({ href, icon: Icon, title, copy }) => (
          <a className="card more-link-card" href={href} key={title}>
            <span className="profile-link-icon"><Icon aria-hidden="true" /></span>
            <span className="profile-link-copy"><strong>{title}</strong><small>{copy}</small></span>
            <ChevronRight aria-hidden="true" />
          </a>
        ))}
      </section>
      <section className="section more-logout"><button className="ghost-button danger-button" type="button" onClick={onSignOut} disabled={busy}>Cerrar sesión</button></section>
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
  return <FormCard title="Crea tu explotación" submitLabel="Guardar explotación" busy={busy} onSubmit={(form) => runAction(async () => {
    const municipality = String(form.get('municipality') || '').trim();
    const body: { name: string; municipality?: string; province?: string } = { name: String(form.get('name') || '').trim(), province: 'Jaén' };
    if (municipality) body.municipality = municipality;
    await api.createHolding(body);
    await onCreated();
  })} fields={<><Field name="name" label="Nombre" placeholder="Mi explotación" required /><Field name="municipality" label="Municipio" placeholder="Bedmar, Huelma, Cambil…" /></>} />;
}

function CreateFarmCard({ holdingId, busy, runAction, onCreated, firstFarm = false }: { holdingId: string; busy: boolean; runAction: ActionRunner; onCreated: () => Promise<void>; firstFarm?: boolean }) {
  return <FormCard title={firstFarm ? 'Crea tu primera finca' : 'Nueva finca'} submitLabel={firstFarm ? 'Guardar mi primera finca' : 'Guardar finca'} busy={busy} onSubmit={(form) => runAction(async () => {
    const area = String(form.get('areaHa') || '').trim();
    const body: { name: string; areaHa?: number } = { name: String(form.get('name') || '').trim() };
    if (area) body.areaHa = Number(area);
    await api.createFarm(holdingId, body);
    await onCreated();
  })} fields={<div className="inline-fields"><Field name="name" label="Nombre" placeholder="Las Viñas" required /><Field name="areaHa" label="Hectáreas" type="number" step="0.001" placeholder="2.50" /></div>} />;
}

function CreateCampaignCard({ holdingId, busy, runAction, onCreated }: { holdingId: string; busy: boolean; runAction: ActionRunner; onCreated: () => Promise<void> }) {
  const year = new Date().getFullYear();
  return <FormCard title="Crear campaña" submitLabel="Crear campaña" busy={busy} onSubmit={(form) => runAction(async () => {
    const seasonStartYear = Number(form.get('seasonStartYear') || year);
    await api.createCampaign(holdingId, { name: String(form.get('name') || '').trim(), seasonStartYear });
    await onCreated();
  })} fields={<div className="inline-fields"><Field name="name" label="Nombre" placeholder={`Campaña ${year}/${String(year + 1).slice(-2)}`} required /><Field name="seasonStartYear" label="Año inicio" type="number" defaultValue={String(year)} required /></div>} />;
}

function DeliveryHistoryRow({ delivery, holdingId, busy, runAction, onCreated }: { delivery: Delivery; holdingId: string; busy: boolean; runAction: ActionRunner; onCreated: () => Promise<void> }) {
  const [yieldValue, setYieldValue] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void api.deliveryResults(delivery.id).then(({ items }) => {
      if (cancelled) return;
      const result = items.find((item) => item.resultType === 'fat_yield');
      setYieldValue(result?.value ?? null);
    }).catch(() => { if (!cancelled) setYieldValue(null); });
    return () => { cancelled = true; };
  }, [delivery.id]);

  const date = new Date(delivery.deliveredAt);
  const day = new Intl.DateTimeFormat('es-ES', { day: 'numeric' }).format(date);
  const weekday = new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(date).replace('.', '').toUpperCase();
  const month = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(date).replace('.', '');
  return <article className="card campaign-delivery-row">
    <time dateTime={delivery.deliveredAt}><small>{weekday}</small><strong>{day}</strong><em>{month}</em></time>
    <span className="campaign-context-icon"><Tractor /></span>
    <div className="campaign-delivery-destination"><strong>{delivery.customDestination || 'Cooperativa sin especificar'}</strong><small>{delivery.variety || 'Variedad pendiente'}{delivery.ticketNumber ? ` · Ticket ${delivery.ticketNumber}` : ''}</small></div>
    <div className="campaign-delivery-kilos"><strong>{formatKg(delivery.kilograms)}</strong><small>{yieldValue == null ? 'Rendimiento pendiente' : `Rend. ${formatPercent(yieldValue)}`}</small></div>
    <div className="campaign-delivery-actions"><span className={`campaign-delivery-status${yieldValue == null ? ' pending' : ''}`}>{yieldValue == null ? 'En análisis' : 'Entregado'}</span>{yieldValue == null ? <YieldForm deliveryId={delivery.id} busy={busy} runAction={runAction} onCreated={onCreated} /> : null}{holdingId ? <DeliveryTicketButton holdingId={holdingId} deliveryId={delivery.id} /> : null}</div>
    <ChevronRight className="campaign-delivery-chevron" aria-hidden="true" />
  </article>;
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
