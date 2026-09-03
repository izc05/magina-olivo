import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Droplets,
  Leaf,
  MapPinned,
  Mountain,
  Ruler,
  Settings2,
  Sprout,
  Tractor,
  Trees,
  TrendingUp,
  Weight,
} from 'lucide-react';
import type { AppNavigate, FieldTarget } from '../../app/navigation';
import { Brand } from '../../components/Brand';
import { BottomNav } from '../../components/BottomNav';
import type { AppDataRepositories } from '../../data/contracts';
import { demoRepositories } from '../../data/demo/repositories';
import { loadFieldOverview, type FieldOverviewData } from '../../data/fieldOverview';
import type { Parcel } from '../../domain/models';
import { FarmManagementPanel } from './FarmManagementPanel';
import { FieldJournalPanel } from './FieldJournalPanel';

type FieldPageProps = {
  onNavigate: AppNavigate;
  initialTab?: FieldTarget;
  repositories?: AppDataRepositories;
};

type FieldPrimaryTab = 'overview' | 'journal' | 'campaign' | 'management';
type ManagementMode = 'costs' | 'machinery';

function getInitialPrimaryTab(initialTab: FieldTarget): FieldPrimaryTab {
  return initialTab === 'costs' || initialTab === 'machinery' ? 'management' : initialTab;
}

function formatAreaHa(areaHa: number) {
  return `${areaHa.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha`;
}

function getParcelStatus(parcel: Parcel) {
  return parcel.healthStatus === 'review' ? 'Revisar' : 'Bueno';
}

function getParcelNote(parcel: Parcel) {
  return parcel.agronomicNote ?? 'Sin observaciones relevantes.';
}

export function FieldPage({
  onNavigate,
  initialTab = 'overview',
  repositories = demoRepositories,
}: FieldPageProps) {
  const [selectedId, setSelectedId] = useState('parcel-3');
  const [tab, setTab] = useState<FieldPrimaryTab>(() => getInitialPrimaryTab(initialTab));
  const [managementMode, setManagementMode] = useState<ManagementMode>(initialTab === 'machinery' ? 'machinery' : 'costs');
  const [fieldOverview, setFieldOverview] = useState<FieldOverviewData | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFieldOverview(null);
    setLoadFailed(false);

    loadFieldOverview(repositories)
      .then((data) => {
        if (active) setFieldOverview(data);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });

    return () => {
      active = false;
    };
  }, [repositories]);

  const parcels = fieldOverview?.parcels ?? [];
  const selected = useMemo(
    () => parcels.find((parcel) => parcel.id === selectedId) ?? parcels[0],
    [parcels, selectedId],
  );

  if (!fieldOverview) {
    return (
      <div className="app-shell">
        <main className="mobile-page" aria-busy={!loadFailed}>
          <header className="topbar">
            <Brand />
            <button className="icon-button" type="button" aria-label="Notificaciones" onClick={() => onNavigate('news', 'alertas')}><Bell size={20} /></button>
          </header>
          <section className="section-block">
            <div className={loadFailed ? 'notice-card notice-card--warning' : 'notice-card'}>
              {loadFailed ? <AlertTriangle size={20} /> : <Sprout size={20} />}
              <div>
                <strong>{loadFailed ? 'No se pudo cargar Mi Campo' : 'Preparando tu campo'}</strong>
                <span>{loadFailed ? 'Revisa la conexión o la fuente de datos.' : 'Cargando finca y parcelas.'}</span>
              </div>
            </div>
          </section>
        </main>
        <BottomNav active="field" onNavigate={onNavigate} onCreate={() => setTab('journal')} />
      </div>
    );
  }

  const farm = fieldOverview.farm;

  if (!farm) {
    return (
      <div className="app-shell">
        <main className="mobile-page">
          <header className="topbar">
            <Brand />
            <button className="icon-button" type="button" aria-label="Notificaciones" onClick={() => onNavigate('news', 'alertas')}><Bell size={20} /></button>
          </header>
          <section className="section-block">
            <div className="notice-card">
              <Sprout size={20} />
              <div>
                <strong>Aún no hay una finca activa</strong>
                <span>Añade tu primera explotación para empezar a organizar parcelas y labores.</span>
              </div>
            </div>
          </section>
        </main>
        <BottomNav active="field" onNavigate={onNavigate} onCreate={() => setTab('journal')} />
      </div>
    );
  }

  const primaryVariety = fieldOverview.primaryVariety ?? '—';

  return (
    <div className="app-shell">
      <main className="mobile-page">
        <header className="topbar">
          <Brand />
          <button className="icon-button" type="button" aria-label="Notificaciones" onClick={() => onNavigate('news', 'alertas')}><Bell size={20} /></button>
        </header>

        <section className="farm-hero">
          <div className="farm-hero__overlay" />
          <div className="farm-hero__copy">
            <span>Finca activa</span>
            <h1>{farm.name}</h1>
            <p>{farm.municipality}{farm.regionLabel ? ` · ${farm.regionLabel}` : ''}</p>
          </div>
          <div className="farm-hero__metrics">
            <div><small>Superficie</small><strong>{formatAreaHa(farm.areaHa)}</strong></div>
            <div><small>Parcelas</small><strong>{parcels.length}</strong></div>
            <div><small>Variedad</small><strong>{primaryVariety}</strong></div>
          </div>
        </section>

        <div className="field-tabs" role="tablist" aria-label="Secciones de Mi Campo">
          <button type="button" className={tab === 'overview' ? 'field-tab field-tab--active' : 'field-tab'} onClick={() => setTab('overview')}><MapPinned size={17} />Campo</button>
          <button type="button" className={tab === 'journal' ? 'field-tab field-tab--active' : 'field-tab'} onClick={() => setTab('journal')}><ClipboardList size={17} />Cuaderno</button>
          <button type="button" className={tab === 'campaign' ? 'field-tab field-tab--active' : 'field-tab'} onClick={() => setTab('campaign')}><TrendingUp size={17} />Campaña</button>
          <button type="button" className={tab === 'management' ? 'field-tab field-tab--active' : 'field-tab'} onClick={() => setTab('management')}><Settings2 size={17} />Gestión</button>
        </div>

        {tab === 'overview' && (
          <>
            <section className="section-block">
              <div className="section-heading">
                <div><span className="eyebrow">Mi Campo</span><h2>Parcelas</h2></div>
                <button className="text-action" type="button">Ver mapa</button>
              </div>

              <div className="parcel-list">
                {parcels.map((parcel) => {
                  const status = getParcelStatus(parcel);
                  return (
                    <button
                      key={parcel.id}
                      type="button"
                      className={`parcel-row${selectedId === parcel.id ? ' parcel-row--active' : ''}`}
                      onClick={() => setSelectedId(parcel.id)}
                    >
                      <div className="parcel-row__thumb"><Sprout size={22} /></div>
                      <div className="parcel-row__copy">
                        <strong>{parcel.name}</strong>
                        <span>{formatAreaHa(parcel.areaHa)} · {parcel.oliveVariety ?? 'Sin variedad'}</span>
                      </div>
                      <span className={`status-pill status-pill--${status === 'Bueno' ? 'good' : 'review'}`}>{status}</span>
                      <ChevronRight size={18} />
                    </button>
                  );
                })}
              </div>
            </section>

            {selected && (
              <section className="section-block field-map-card">
                <div className="section-heading">
                  <div><span className="eyebrow">Mapa de finca</span><h2>{selected.name}</h2></div>
                  <MapPinned size={21} />
                </div>

                <div className="parcel-map" aria-label={`Vista esquemática de ${selected.name}`}>
                  <svg viewBox="0 0 520 300" role="img" aria-hidden="true">
                    <rect width="520" height="300" fill="#526044" />
                    <g opacity=".22" stroke="#d9cca5" strokeWidth="2">
                      <path d="M0 55L520 5M0 115L520 65M0 175L520 125M0 235L520 185M60 0L20 300M155 0L105 300M250 0L205 300M350 0L300 300M455 0L405 300" />
                    </g>
                    <path d="M105 50L335 38L415 155L315 255L105 220L65 125Z" fill="rgba(123,151,83,.82)" stroke="#f7f1df" strokeWidth="5" />
                    <circle cx="260" cy="145" r="20" fill="#D4A017" />
                    <path d="M260 132c-6 0-11 5-11 11 0 9 11 20 11 20s11-11 11-20c0-6-5-11-11-11Zm0 15a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z" fill="#fff" />
                  </svg>
                </div>

                <div className="parcel-detail-grid">
                  <article><Trees size={18} /><span>Variedad</span><strong>{selected.oliveVariety ?? '—'}</strong></article>
                  <article><Ruler size={18} /><span>Superficie</span><strong>{formatAreaHa(selected.areaHa)}</strong></article>
                  <article><Mountain size={18} /><span>Altitud</span><strong>{selected.altitudeM === undefined ? '—' : `${selected.altitudeM} m`}</strong></article>
                  <article><Leaf size={18} /><span>Marco</span><strong>{selected.plantingFrame ?? '—'}</strong></article>
                </div>

                <article className={`parcel-health parcel-health--${getParcelStatus(selected) === 'Bueno' ? 'good' : 'review'}`}>
                  <div>
                    <span>Estado actual</span>
                    <strong>{getParcelStatus(selected)}</strong>
                    <p>{getParcelNote(selected)}</p>
                  </div>
                  {getParcelStatus(selected) === 'Revisar' ? <Droplets size={23} /> : <Sprout size={23} />}
                </article>
              </section>
            )}

            <section className="section-block section-block--last">
              <div className="section-heading"><div><span className="eyebrow">Resumen</span><h2>Esta semana</h2></div></div>
              <div className="field-week-grid">
                <article><span>Tratamientos</span><strong>2</strong><small>1 pendiente</small></article>
                <article><span>Riegos</span><strong>3</strong><small>30 mm acumulados</small></article>
                <article><span>Labores</span><strong>4</strong><small>3 completadas</small></article>
              </div>
            </section>
          </>
        )}

        {tab === 'journal' && (
          <FieldJournalPanel repositories={repositories} farmId={farm.id} />
        )}

        {tab === 'campaign' && (
          <section className="section-block section-block--last">
            <div className="section-heading">
              <div><span className="eyebrow">Campaña 2026/27</span><h1>Producción y rendimiento</h1></div>
              <CalendarDays size={21} />
            </div>

            <div className="campaign-metrics">
              <article><Weight size={20} /><span>Producción estimada</span><strong>18.650 kg</strong></article>
              <article><TrendingUp size={20} /><span>Rendimiento medio</span><strong>17,2 %</strong></article>
              <article><ClipboardList size={20} /><span>Entregas</span><strong>7</strong></article>
            </div>

            <article className="campaign-chart-card">
              <div className="campaign-chart-card__head"><div><strong>Evolución de la campaña</strong><span>Producción acumulada</span></div><button type="button" className="text-action">Detalle</button></div>
              <svg viewBox="0 0 560 220" role="img" aria-label="Evolución estimada de la campaña">
                <g stroke="#ded9ca" strokeWidth="1"><line x1="36" y1="40" x2="540" y2="40"/><line x1="36" y1="95" x2="540" y2="95"/><line x1="36" y1="150" x2="540" y2="150"/><line x1="36" y1="195" x2="540" y2="195"/></g>
                <path d="M40 184L110 160L180 151L250 121L320 98L390 73L460 50L535 34" fill="none" stroke="#5C7A46" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M40 184L110 160L180 151L250 121L320 98L390 73L460 50L535 34L535 198L40 198Z" fill="#A7B497" opacity=".2" />
              </svg>
            </article>

            <article className="campaign-status-card">
              <div><span>Estado actual</span><strong>En recolección</strong><small>Última entrega: 5.230 kg</small></div>
              <Sprout size={28} />
            </article>
          </section>
        )}

        {tab === 'management' && (
          <section className="field-management-shell section-block--last">
            <div className="field-management-switch" role="tablist" aria-label="Gestión de la explotación">
              <button type="button" className={managementMode === 'costs' ? 'field-management-switch__item field-management-switch__item--active' : 'field-management-switch__item'} onClick={() => setManagementMode('costs')}><CircleDollarSign size={17} />Costes y rentabilidad</button>
              <button type="button" className={managementMode === 'machinery' ? 'field-management-switch__item field-management-switch__item--active' : 'field-management-switch__item'} onClick={() => setManagementMode('machinery')}><Tractor size={17} />Maquinaria</button>
            </div>
            <FarmManagementPanel mode={managementMode} />
          </section>
        )}
      </main>

      <BottomNav active="field" onNavigate={onNavigate} onCreate={() => setTab('journal')} />
    </div>
  );
}
