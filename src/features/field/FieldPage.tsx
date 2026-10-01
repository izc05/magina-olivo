import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
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
  Scissors,
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
import { FarmManagementPanel } from './FarmManagementPanel';
import {
  loadFieldData,
  nextRecordId,
  saveFieldData,
  type ExpenseRecord,
  type JournalKind,
  type ParcelRecord,
} from './fieldStore';

type FieldPageProps = {
  onNavigate: AppNavigate;
  initialTab?: FieldTarget;
};

type FieldPrimaryTab = 'overview' | 'journal' | 'campaign' | 'management';
type ManagementMode = 'costs' | 'machinery';
type JournalFilter = 'Todas' | 'Tratamientos' | 'Riego' | 'Labores';

function getInitialPrimaryTab(initialTab: FieldTarget): FieldPrimaryTab {
  return initialTab === 'costs' || initialTab === 'machinery' ? 'management' : initialTab;
}

function compactDate(date: string) {
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(new Date(`${date}T12:00:00`)).replace('.', '').toUpperCase();
}

function journalIcon(kind: JournalKind) {
  if (kind === 'Riego') return <Droplets size={20} />;
  if (kind === 'Labor') return <Scissors size={20} />;
  if (kind === 'Abonado') return <Sprout size={20} />;
  if (kind === 'Cosecha') return <Weight size={20} />;
  return <Leaf size={20} />;
}

export function FieldPage({ onNavigate, initialTab = 'overview' }: FieldPageProps) {
  const [fieldData, setFieldData] = useState(loadFieldData);
  const [selectedId, setSelectedId] = useState(() => loadFieldData().parcels[0]?.id ?? 0);
  const [tab, setTab] = useState<FieldPrimaryTab>(() => getInitialPrimaryTab(initialTab));
  const [managementMode, setManagementMode] = useState<ManagementMode>(initialTab === 'machinery' ? 'machinery' : 'costs');
  const [parcelOpen, setParcelOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [journalFilter, setJournalFilter] = useState<JournalFilter>('Todas');

  const [parcelName, setParcelName] = useState('');
  const [parcelArea, setParcelArea] = useState('');
  const [parcelVariety, setParcelVariety] = useState('Picual');
  const [parcelAltitude, setParcelAltitude] = useState('650');
  const [parcelSlope, setParcelSlope] = useState('10');

  const [journalKind, setJournalKind] = useState<JournalKind>('Labor');
  const [journalTitle, setJournalTitle] = useState('');
  const [journalDetail, setJournalDetail] = useState('');
  const [journalParcel, setJournalParcel] = useState('');

  const [deliveryKilos, setDeliveryKilos] = useState('');
  const [deliveryYield, setDeliveryYield] = useState('');
  const [deliveryCooperative, setDeliveryCooperative] = useState('');

  useEffect(() => saveFieldData(fieldData), [fieldData]);

  const selected = useMemo(() => fieldData.parcels.find((parcel) => parcel.id === selectedId) ?? fieldData.parcels[0], [fieldData.parcels, selectedId]);
  const totalArea = useMemo(() => fieldData.parcels.reduce((sum, parcel) => sum + parcel.areaHa, 0), [fieldData.parcels]);
  const totalKilos = useMemo(() => fieldData.deliveries.reduce((sum, delivery) => sum + delivery.kilos, 0), [fieldData.deliveries]);
  const averageYield = useMemo(() => {
    if (!totalKilos) return 0;
    return fieldData.deliveries.reduce((sum, delivery) => sum + delivery.kilos * delivery.yieldPct, 0) / totalKilos;
  }, [fieldData.deliveries, totalKilos]);

  const filteredJournal = useMemo(() => fieldData.journal.filter((entry) => {
    if (journalFilter === 'Todas') return true;
    if (journalFilter === 'Tratamientos') return entry.kind === 'Tratamiento';
    if (journalFilter === 'Riego') return entry.kind === 'Riego';
    return entry.kind === 'Labor' || entry.kind === 'Abonado' || entry.kind === 'Cosecha' || entry.kind === 'Otro';
  }).sort((a, b) => b.date.localeCompare(a.date)), [fieldData.journal, journalFilter]);

  const addParcel = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const areaHa = Number(parcelArea.replace(',', '.'));
    const altitudeM = Number(parcelAltitude.replace(',', '.'));
    const slopePct = Number(parcelSlope.replace(',', '.'));
    if (!parcelName.trim() || !Number.isFinite(areaHa) || areaHa <= 0) return;
    const parcel: ParcelRecord = {
      id: nextRecordId(fieldData.parcels),
      name: parcelName.trim(),
      areaHa,
      variety: parcelVariety.trim() || 'Picual',
      altitudeM: Number.isFinite(altitudeM) ? altitudeM : 0,
      frame: '7 × 7 m',
      slopePct: Number.isFinite(slopePct) ? slopePct : 0,
      status: 'Bueno',
      note: 'Parcela creada desde Mi Campo.',
    };
    setFieldData((current) => ({ ...current, parcels: [...current.parcels, parcel] }));
    setSelectedId(parcel.id);
    setParcelName('');
    setParcelArea('');
    setParcelOpen(false);
  };

  const addJournalEntry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!journalTitle.trim() || !journalDetail.trim()) return;
    const parcelId = Number(journalParcel);
    setFieldData((current) => ({
      ...current,
      journal: [{
        id: nextRecordId(current.journal),
        date: new Date().toISOString().slice(0, 10),
        kind: journalKind,
        title: journalTitle.trim(),
        detail: journalDetail.trim(),
        parcelId: Number.isFinite(parcelId) && parcelId > 0 ? parcelId : undefined,
      }, ...current.journal],
    }));
    setJournalTitle('');
    setJournalDetail('');
    setJournalParcel('');
    setJournalOpen(false);
  };

  const addDelivery = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const kilos = Number(deliveryKilos.replace(',', '.'));
    const yieldPct = Number(deliveryYield.replace(',', '.'));
    if (!Number.isFinite(kilos) || kilos <= 0 || !Number.isFinite(yieldPct) || yieldPct <= 0) return;
    setFieldData((current) => ({
      ...current,
      deliveries: [{
        id: nextRecordId(current.deliveries),
        date: new Date().toISOString().slice(0, 10),
        kilos,
        yieldPct,
        cooperative: deliveryCooperative.trim() || 'Sin especificar',
      }, ...current.deliveries],
      journal: [{
        id: nextRecordId(current.journal),
        date: new Date().toISOString().slice(0, 10),
        kind: 'Cosecha',
        title: 'Entrega de aceituna',
        detail: `${kilos.toLocaleString('es-ES')} kg · ${yieldPct.toLocaleString('es-ES')} % · ${deliveryCooperative.trim() || 'Sin especificar'}`,
      }, ...current.journal],
    }));
    setDeliveryKilos('');
    setDeliveryYield('');
    setDeliveryCooperative('');
    setDeliveryOpen(false);
  };

  const addExpense = (expense: Omit<ExpenseRecord, 'id'>) => {
    setFieldData((current) => ({ ...current, expenses: [{ ...expense, id: nextRecordId(current.expenses) }, ...current.expenses] }));
  };

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
            <h1>{fieldData.farmName}</h1>
            <p>{fieldData.municipality} · {fieldData.region}</p>
          </div>
          <div className="farm-hero__metrics">
            <div><small>Superficie</small><strong>{totalArea.toLocaleString('es-ES', { maximumFractionDigits: 2 })} ha</strong></div>
            <div><small>Parcelas</small><strong>{fieldData.parcels.length}</strong></div>
            <div><small>Variedad</small><strong>{fieldData.parcels[0]?.variety ?? '—'}</strong></div>
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
                <button className="text-action" type="button" onClick={() => setParcelOpen((open) => !open)}>+ Añadir</button>
              </div>

              {parcelOpen && (
                <form className="field-entry-form" onSubmit={addParcel}>
                  <div className="field-entry-form__grid">
                    <label>Nombre<input value={parcelName} onChange={(event) => setParcelName(event.target.value)} placeholder="Ej. Parcela del Cerro" required /></label>
                    <label>Superficie (ha)<input inputMode="decimal" value={parcelArea} onChange={(event) => setParcelArea(event.target.value)} placeholder="2,80" required /></label>
                    <label>Variedad<input value={parcelVariety} onChange={(event) => setParcelVariety(event.target.value)} /></label>
                    <label>Altitud (m)<input inputMode="numeric" value={parcelAltitude} onChange={(event) => setParcelAltitude(event.target.value)} /></label>
                    <label>Pendiente (%)<input inputMode="decimal" value={parcelSlope} onChange={(event) => setParcelSlope(event.target.value)} /></label>
                  </div>
                  <div className="field-entry-form__actions"><button type="button" className="secondary-button" onClick={() => setParcelOpen(false)}>Cancelar</button><button type="submit" className="primary-button">Guardar parcela</button></div>
                </form>
              )}

              <div className="parcel-list">
                {fieldData.parcels.map((parcel) => (
                  <button
                    key={parcel.id}
                    type="button"
                    className={`parcel-row${selectedId === parcel.id ? ' parcel-row--active' : ''}`}
                    onClick={() => setSelectedId(parcel.id)}
                  >
                    <div className="parcel-row__thumb"><Sprout size={22} /></div>
                    <div className="parcel-row__copy">
                      <strong>{parcel.name}</strong>
                      <span>{parcel.areaHa.toLocaleString('es-ES')} ha · {parcel.variety}</span>
                    </div>
                    <span className={`status-pill status-pill--${parcel.status === 'Bueno' ? 'good' : 'review'}`}>{parcel.status}</span>
                    <ChevronRight size={18} />
                  </button>
                ))}
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
                    <g opacity=".22" stroke="#d9cca5" strokeWidth="2"><path d="M0 55L520 5M0 115L520 65M0 175L520 125M0 235L520 185M60 0L20 300M155 0L105 300M250 0L205 300M350 0L300 300M455 0L405 300" /></g>
                    <path d="M105 50L335 38L415 155L315 255L105 220L65 125Z" fill="rgba(123,151,83,.82)" stroke="#f7f1df" strokeWidth="5" />
                    <circle cx="260" cy="145" r="20" fill="#D4A017" />
                    <path d="M260 132c-6 0-11 5-11 11 0 9 11 20 11 20s11-11 11-20c0-6-5-11-11-11Zm0 15a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z" fill="#fff" />
                  </svg>
                </div>

                <div className="parcel-detail-grid">
                  <article><Trees size={18} /><span>Variedad</span><strong>{selected.variety}</strong></article>
                  <article><Ruler size={18} /><span>Superficie</span><strong>{selected.areaHa.toLocaleString('es-ES')} ha</strong></article>
                  <article><Mountain size={18} /><span>Altitud</span><strong>{selected.altitudeM} m</strong></article>
                  <article><Leaf size={18} /><span>Marco</span><strong>{selected.frame}</strong></article>
                </div>

                <article className={`parcel-health parcel-health--${selected.status === 'Bueno' ? 'good' : 'review'}`}>
                  <div><span>Estado actual</span><strong>{selected.status}</strong><p>{selected.note}</p></div>
                  {selected.status === 'Revisar' ? <Droplets size={23} /> : <Sprout size={23} />}
                </article>
              </section>
            )}

            <section className="section-block section-block--last">
              <div className="section-heading"><div><span className="eyebrow">Resumen</span><h2>Datos guardados</h2></div></div>
              <div className="field-week-grid">
                <article><span>Anotaciones</span><strong>{fieldData.journal.length}</strong><small>Cuaderno</small></article>
                <article><span>Entregas</span><strong>{fieldData.deliveries.length}</strong><small>{totalKilos.toLocaleString('es-ES')} kg</small></article>
                <article><span>Gastos</span><strong>{fieldData.expenses.length}</strong><small>Registros</small></article>
              </div>
            </section>
          </>
        )}

        {tab === 'journal' && (
          <section className="section-block section-block--last">
            <div className="section-heading">
              <div><span className="eyebrow">Cuaderno de campo</span><h1>Actividad reciente</h1></div>
              <button className="text-action" type="button" onClick={() => setJournalOpen((open) => !open)}>+ Añadir</button>
            </div>

            <div className="journal-filters">
              {(['Todas', 'Tratamientos', 'Riego', 'Labores'] as JournalFilter[]).map((filter) => <button key={filter} type="button" className={journalFilter === filter ? 'journal-filter journal-filter--active' : 'journal-filter'} onClick={() => setJournalFilter(filter)}>{filter}</button>)}
            </div>

            {journalOpen && (
              <form className="field-entry-form" onSubmit={addJournalEntry}>
                <div className="field-entry-form__grid">
                  <label>Tipo<select value={journalKind} onChange={(event) => setJournalKind(event.target.value as JournalKind)}><option>Tratamiento</option><option>Riego</option><option>Labor</option><option>Abonado</option><option>Cosecha</option><option>Otro</option></select></label>
                  <label>Parcela<select value={journalParcel} onChange={(event) => setJournalParcel(event.target.value)}><option value="">General</option>{fieldData.parcels.map((parcel) => <option key={parcel.id} value={parcel.id}>{parcel.name}</option>)}</select></label>
                  <label>Título<input value={journalTitle} onChange={(event) => setJournalTitle(event.target.value)} placeholder="Ej. Poda en verde" required /></label>
                  <label>Detalle<input value={journalDetail} onChange={(event) => setJournalDetail(event.target.value)} placeholder="Trabajo realizado, dosis, observaciones…" required /></label>
                </div>
                <div className="field-entry-form__actions"><button type="button" className="secondary-button" onClick={() => setJournalOpen(false)}>Cancelar</button><button type="submit" className="primary-button">Guardar anotación</button></div>
              </form>
            )}

            <div className="journal-list">
              {filteredJournal.map((entry) => (
                <article key={entry.id} className="journal-entry">
                  <div className="journal-entry__date">{compactDate(entry.date)}</div>
                  <div className="journal-entry__icon">{journalIcon(entry.kind)}</div>
                  <div className="journal-entry__copy"><strong>{entry.title}</strong><span>{entry.detail}</span></div>
                  <small>Guardado</small>
                </article>
              ))}
            </div>

            <button className="primary-button primary-button--wide" type="button" onClick={() => setJournalOpen(true)}>+ Nueva anotación</button>
          </section>
        )}

        {tab === 'campaign' && (
          <section className="section-block section-block--last">
            <div className="section-heading">
              <div><span className="eyebrow">Campaña 2026/27</span><h1>Producción y rendimiento</h1></div>
              <button type="button" className="text-action" onClick={() => setDeliveryOpen((open) => !open)}>+ Entrega</button>
            </div>

            <div className="campaign-metrics">
              <article><Weight size={20} /><span>Producción registrada</span><strong>{totalKilos.toLocaleString('es-ES')} kg</strong></article>
              <article><TrendingUp size={20} /><span>Rendimiento medio</span><strong>{averageYield.toLocaleString('es-ES', { maximumFractionDigits: 1 })} %</strong></article>
              <article><ClipboardList size={20} /><span>Entregas</span><strong>{fieldData.deliveries.length}</strong></article>
            </div>

            {deliveryOpen && (
              <form className="field-entry-form field-entry-form--spaced" onSubmit={addDelivery}>
                <div className="field-entry-form__grid">
                  <label>Kilos entregados<input inputMode="decimal" value={deliveryKilos} onChange={(event) => setDeliveryKilos(event.target.value)} placeholder="8450" required /></label>
                  <label>Rendimiento (%)<input inputMode="decimal" value={deliveryYield} onChange={(event) => setDeliveryYield(event.target.value)} placeholder="21,4" required /></label>
                  <label>Cooperativa<input value={deliveryCooperative} onChange={(event) => setDeliveryCooperative(event.target.value)} placeholder="Nombre de la cooperativa" /></label>
                </div>
                <div className="field-entry-form__actions"><button type="button" className="secondary-button" onClick={() => setDeliveryOpen(false)}>Cancelar</button><button type="submit" className="primary-button">Guardar entrega</button></div>
              </form>
            )}

            <article className="campaign-chart-card">
              <div className="campaign-chart-card__head"><div><strong>Entregas registradas</strong><span>Histórico local de esta campaña</span></div><CalendarDays size={20} /></div>
              <div className="campaign-delivery-list">
                {fieldData.deliveries.slice().sort((a, b) => b.date.localeCompare(a.date)).map((delivery) => (
                  <div key={delivery.id} className="campaign-delivery-row"><div><strong>{delivery.kilos.toLocaleString('es-ES')} kg</strong><span>{delivery.cooperative}</span></div><div><strong>{delivery.yieldPct.toLocaleString('es-ES')} %</strong><span>{compactDate(delivery.date)}</span></div></div>
                ))}
              </div>
            </article>

            <article className="campaign-status-card">
              <div><span>Estado actual</span><strong>{fieldData.deliveries.length ? 'En recolección' : 'Sin entregas registradas'}</strong><small>{fieldData.deliveries[0] ? `Última entrega: ${fieldData.deliveries[0].kilos.toLocaleString('es-ES')} kg` : 'Añade la primera entrega'}</small></div>
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
            <FarmManagementPanel mode={managementMode} expenses={fieldData.expenses} onAddExpense={addExpense} />
          </section>
        )}
      </main>

      <BottomNav active="field" onNavigate={onNavigate} onCreate={() => { setTab('journal'); setJournalOpen(true); }} />
    </div>
  );
}
