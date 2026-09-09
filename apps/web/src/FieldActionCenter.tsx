import { type FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, CalendarPlus, Camera, Droplets, FilePlus2, FlaskConical, MapPinned, PackagePlus, Sprout, Tractor, X } from 'lucide-react';
import { api, ApiError, type ActivityType, type Farm, type Plot } from './api.ts';

type FormKind = 'activity' | 'delivery' | 'task' | 'farm' | 'plot';
type ActionItem = { label: string; detail: string; icon: typeof BookOpen; tone: string; form?: FormKind; activityType?: ActivityType; action?: 'camera'; href?: string };

const registerActions: ActionItem[] = [
  { label: 'Trabajo', detail: 'Labor, poda o abonado', icon: BookOpen, tone: 'olive', form: 'activity' },
  { label: 'Tratamiento', detail: 'Producto, dosis y control', icon: FlaskConical, tone: 'leaf', form: 'activity', activityType: 'treatment' },
  { label: 'Riego', detail: 'Agua, duración y superficie', icon: Droplets, tone: 'water', form: 'activity', activityType: 'irrigation' },
  { label: 'Recolección', detail: 'Kilos estimados y jornada', icon: Sprout, tone: 'gold', form: 'activity', activityType: 'harvest' },
  { label: 'Entrega', detail: 'Kilos, destino y albarán', icon: PackagePlus, tone: 'gold', form: 'delivery' },
  { label: 'Tarea', detail: 'Planificar un trabajo', icon: CalendarPlus, tone: 'sky', form: 'task' },
];

const organizeActions: ActionItem[] = [
  { label: 'Foto', detail: 'Cámara y ubicación', icon: Camera, tone: 'clay', action: 'camera' },
  { label: 'Nueva finca', detail: 'Añade a tu explotación', icon: Tractor, tone: 'mechanic', form: 'farm' },
  { label: 'Nueva parcela', detail: 'Datos básicos y superficie', icon: MapPinned, tone: 'map', form: 'plot' },
  { label: 'Documento', detail: 'Tickets y justificantes', icon: FilePlus2, tone: 'paper', href: '/campana?new=document' },
  { label: 'Maquinaria', detail: 'Equipos, aperos y QR', icon: Tractor, tone: 'mechanic', href: '/mi-campo/recursos' },
];

const activityLabels: Record<ActivityType, string> = { treatment: 'Tratamiento', fertilization: 'Abonado', pruning: 'Poda', mowing: 'Desbroce', tillage: 'Laboreo', irrigation: 'Riego', harvest: 'Recolección', maintenance: 'Mantenimiento', planting: 'Plantación', sampling: 'Muestreo', observation: 'Observación', other: 'Otro trabajo' };
const todayInput = () => new Date().toISOString().slice(0, 16);
const number = (value: FormDataEntryValue | null) => value === null || value === '' ? null : Number(value);
const isoDateTime = (value: FormDataEntryValue | null) => new Date(String(value)).toISOString();
const formError = (reason: unknown) => {
  if (reason instanceof ApiError) {
    const advice: Record<string, string> = { INVALID_CAMPAIGN: 'Elige una campaña activa.', INVALID_FARM: 'La finca no pertenece a tu explotación.', INVALID_PLOT: 'La parcela no pertenece a la finca seleccionada.', FARM_PLOT_MISMATCH: 'La parcela no corresponde a esta finca.', PLOT_FARM_MISMATCH: 'La parcela no corresponde a esta finca.', DESTINATION_REQUIRED: 'Indica la cooperativa o el destino.', INVALID_KILOGRAMS: 'Introduce kilos mayores que cero.', IDEMPOTENCY_KEY_REQUIRED: 'Vuelve a intentarlo; no se pudo preparar el registro.', TASK_SCOPE_MISMATCH: 'La finca o parcela elegida no coincide con tu explotación.' };
    return advice[reason.code ?? ''] ?? `No se ha podido guardar: ${reason.message}`;
  }
  return reason instanceof Error ? reason.message : 'No se ha podido guardar. Revisa los datos e inténtalo de nuevo.';
};

export function FieldActionCenter({ farms, plots, selectedFarmId, initialPlotId = '', holdingId, campaignId, onSelectFarm, onSaved, onClose, onCamera }: { farms: Farm[]; plots: Plot[]; selectedFarmId: string; initialPlotId?: string; holdingId: string; campaignId: string; onSelectFarm: (farmId: string) => void; onSaved: () => Promise<void>; onClose: () => void; onCamera: () => void }) {
  const sheetRef = useRef<HTMLElement>(null);
  const requestedPlotId = initialPlotId || new URLSearchParams(window.location.search).get('parcela') || '';
  const [selectedPlotId, setSelectedPlotId] = useState(requestedPlotId);
  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selectedFarm = farms.find((farm) => farm.id === selectedFarmId) ?? null;
  const selectedPlot = plots.find((plot) => plot.id === selectedPlotId) ?? null;

  useEffect(() => { sheetRef.current?.focus(); const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') selectedAction ? setSelectedAction(null) : onClose(); }; document.addEventListener('keydown', closeOnEscape); return () => document.removeEventListener('keydown', closeOnEscape); }, [onClose, selectedAction]);
  useEffect(() => { setSelectedPlotId((current) => requestedPlotId && plots.some((plot) => plot.id === requestedPlotId) ? requestedPlotId : plots.some((plot) => plot.id === current) ? current : ''); }, [requestedPlotId, plots]);

  const changeFarm = (farmId: string) => { setSelectedPlotId(''); onSelectFarm(farmId); };
  const contextText = selectedFarm ? selectedPlot ? `Finca ${selectedFarm.name} · Parcela ${selectedPlot.name}` : `Finca ${selectedFarm.name} · toda la finca` : 'Elige una finca antes de guardar.';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAction?.form || !holdingId) return;
    const values = new FormData(event.currentTarget);
    const area = number(values.get('area'));
    const quantity = number(values.get('quantity'));
    const cost = number(values.get('cost'));
    const trees = number(values.get('trees'));
    setBusy(true); setError('');
    try {
      const farmId = selectedFarm?.id;
      const plotId = selectedPlot?.id;
      if (selectedAction.form === 'activity') {
        await api.createActivity(holdingId, {
          activityType: (values.get('activityType') as ActivityType) || selectedAction.activityType || 'observation',
          occurredAt: isoDateTime(values.get('occurredAt')),
          ...(campaignId ? { campaignId } : {}),
          ...(farmId ? { farmId } : {}),
          ...(plotId ? { plotId } : {}),
          ...(area !== null ? { affectedAreaHa: area } : {}),
          ...(String(values.get('product') || '') ? { productName: String(values.get('product')) } : {}),
          ...(String(values.get('productRegistrationNumber') || '') ? { productRegistrationNumber: String(values.get('productRegistrationNumber')) } : {}),
          ...(quantity !== null ? { quantity } : {}),
          ...(String(values.get('unit') || '') ? { quantityUnit: String(values.get('unit')) } : {}),
          ...(cost !== null ? { costEur: cost } : {}),
          ...(String(values.get('notes') || '') ? { notes: String(values.get('notes')) } : {}),
        });
      } else if (selectedAction.form === 'delivery') {
        if (!campaignId) throw new Error('Selecciona una campaña antes de registrar una entrega.');
        await api.createDelivery(campaignId, { deliveredAt: isoDateTime(values.get('occurredAt')), kilograms: String(values.get('kilograms')), ...(String(values.get('destination') || '') ? { customDestination: String(values.get('destination')) } : {}), ...(String(values.get('ticket') || '') ? { ticketNumber: String(values.get('ticket')) } : {}), ...(farmId ? { farmId } : {}), ...(plotId ? { plotId } : {}), clientGeneratedId: crypto.randomUUID() }, crypto.randomUUID());
      } else if (selectedAction.form === 'task') {
        await api.createTask(holdingId, { title: String(values.get('title')).trim(), dueDate: String(values.get('dueDate')), priority: values.get('priority') as 'low' | 'normal' | 'high', ...(String(values.get('notes') || '') ? { notes: String(values.get('notes')) } : {}), ...(farmId ? { farmId } : {}), ...(plotId ? { plotId } : {}) });
      } else if (selectedAction.form === 'farm') {
        const farm = await api.createFarm(holdingId, { name: String(values.get('name')).trim(), ...(area !== null ? { areaHa: area } : {}), ...(String(values.get('notes') || '') ? { description: String(values.get('notes')) } : {}) });
        onSelectFarm(farm.id);
      } else if (selectedAction.form === 'plot') {
        if (!farmId) throw new Error('Elige una finca para crear una parcela.');
        await api.createPlot(farmId, { name: String(values.get('name')).trim(), ...(area !== null ? { areaHa: area } : {}), ...(trees !== null ? { oliveTreeCount: trees } : {}), irrigationType: (values.get('irrigation') as 'dryland' | 'irrigated' | 'mixed' | 'unknown') || 'unknown', ...(String(values.get('sigpac') || '') ? { sigpacReference: String(values.get('sigpac')) } : {}) });
      }
      await onSaved(); onClose();
    } catch (reason) { setError(formError(reason)); } finally { setBusy(false); }
  }

  const field = (name: string, label: string, type = 'text', required = false, placeholder = '') => <label className="field-action-field">{label}<input name={name} type={type} required={required} placeholder={placeholder} /></label>;
  const formTitle = selectedAction?.label ?? '';
  const actionForm = selectedAction?.form ? <form className="field-action-form" onSubmit={submit}>
    <p className="field-action-form-context">{contextText}</p>
    {selectedAction.form === 'activity' ? <>
      <div className="field-action-form-grid">
        {selectedAction.activityType ? <input type="hidden" name="activityType" value={selectedAction.activityType} /> : <label className="field-action-field">Tipo<select name="activityType" defaultValue="observation">{Object.entries(activityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
        <label className="field-action-field">Fecha y hora<input name="occurredAt" type="datetime-local" defaultValue={todayInput()} required /></label>
        {field('area', selectedAction.activityType === 'harvest' ? 'Superficie recolectada (ha)' : 'Superficie (ha)', 'number')}
        {field('cost', 'Coste (€)', 'number')}
      </div>
      {selectedAction.activityType === 'treatment' ? <div className="field-action-form-grid">
        {field('product', 'Producto', 'text', true, 'Ej. caolín')}
        {field('productRegistrationNumber', 'N.º de registro', 'text', false, 'Opcional')}
        {field('quantity', 'Cantidad', 'number')}
        <label className="field-action-field">Unidad<select name="unit" defaultValue="l/ha"><option>l/ha</option><option>kg/ha</option><option>kg</option><option>l</option></select></label>
      </div> : null}
      {selectedAction.activityType === 'irrigation' ? <div className="field-action-form-grid">
        {field('quantity', 'Agua aplicada', 'number')}
        <label className="field-action-field">Unidad<select name="unit" defaultValue="m³"><option>m³</option><option>L</option></select></label>
      </div> : null}
      {selectedAction.activityType === 'harvest' ? <div className="field-action-form-grid">
        {field('quantity', 'Kilos estimados', 'number')}
        <input type="hidden" name="unit" value="kg" />
      </div> : null}
      <label className="field-action-field">Nota<input name="notes" placeholder={selectedAction.activityType === 'harvest' ? 'Jornada, método o detalle opcional' : 'Detalle opcional'} /></label>
    </> : null}
    {selectedAction.form === 'delivery' ? <><div className="field-action-form-grid"><label className="field-action-field">Fecha y hora<input name="occurredAt" type="datetime-local" defaultValue={todayInput()} required /></label>{field('kilograms', 'Kilos entregados', 'number', true)}</div><div className="field-action-form-grid">{field('destination', 'Destino / cooperativa', 'text', true, 'Ej. S.C.A. San Isidro')}{field('ticket', 'N.º albarán')}</div></> : null}
    {selectedAction.form === 'task' ? <><label className="field-action-field">Tarea<input name="title" required placeholder="Ej. Revisar riego" /></label><div className="field-action-form-grid"><label className="field-action-field">Fecha<input name="dueDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label><label className="field-action-field">Prioridad<select name="priority" defaultValue="normal"><option value="low">Baja</option><option value="normal">Normal</option><option value="high">Alta</option></select></label></div><label className="field-action-field">Nota<input name="notes" placeholder="Opcional" /></label></> : null}
    {selectedAction.form === 'farm' ? <><div className="field-action-form-grid">{field('name', 'Nombre de la finca', 'text', true, 'Ej. Cortijo del Río')}{field('area', 'Superficie (ha)', 'number')}</div><label className="field-action-field">Nota<input name="notes" placeholder="Opcional" /></label></> : null}
    {selectedAction.form === 'plot' ? <><div className="field-action-form-grid">{field('name', 'Nombre de la parcela', 'text', true, 'Ej. Parcela Norte')}{field('area', 'Superficie (ha)', 'number')}</div><div className="field-action-form-grid">{field('trees', 'Número de olivos', 'number')}<label className="field-action-field">Riego<select name="irrigation" defaultValue="unknown"><option value="unknown">Sin definir</option><option value="dryland">Secano</option><option value="irrigated">Regadío</option><option value="mixed">Mixto</option></select></label></div>{field('sigpac', 'Referencia SIGPAC')}</> : null}
    {error ? <p className="field-action-form-error" role="alert">{error}</p> : null}<button className="primary-button field-action-submit" type="submit" disabled={busy || (!selectedFarm && selectedAction.form !== 'farm')}>{busy ? 'Guardando…' : `Guardar ${formTitle.toLowerCase()}`}</button>
  </form> : null;

  const FormIcon = selectedAction?.icon;
  const actionGroups = [
    { title: 'Registrar', copy: 'Anota lo que ocurre en el campo.', items: registerActions },
    { title: 'Organizar', copy: 'Añade recursos y datos de tu explotación.', items: organizeActions },
  ];
  return <div className="field-action-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={sheetRef} className="field-action-sheet" role="dialog" aria-modal="true" aria-labelledby="field-action-title" tabIndex={-1}><div className="field-action-handle" aria-hidden="true" />{selectedAction?.form ? <><header><div><button className="field-action-back" type="button" onClick={() => { setSelectedAction(null); setError(''); }}><ArrowLeft aria-hidden="true" /> Acciones</button><p className="eyebrow">REGISTRO RÁPIDO</p><div className="field-action-form-title">{FormIcon ? <span className={`field-action-icon ${selectedAction.tone}`}><FormIcon aria-hidden="true" /></span> : null}<h2 id="field-action-title">{formTitle}</h2></div><p>Completa solo lo necesario. Se guardará en el contexto elegido.</p></div><button type="button" className="field-action-close" onClick={onClose} aria-label="Cerrar centro de acciones"><X aria-hidden="true" /></button></header>{actionForm}</> : <><header><div><p className="eyebrow">CENTRO DE ACCIONES</p><h2 id="field-action-title">¿Qué quieres añadir?</h2><p>Elige una acción; el formulario se abre aquí mismo.</p></div><button type="button" className="field-action-close" onClick={onClose} aria-label="Cerrar centro de acciones"><X aria-hidden="true" /></button></header><div className="field-action-context"><span><Sprout aria-hidden="true" /> Destino de trabajo</span><select value={selectedFarmId} onChange={(event) => changeFarm(event.target.value)} aria-label="Finca para la nueva acción"><option value="">Elegir finca</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select>{plots.length ? <select value={selectedPlotId} onChange={(event) => setSelectedPlotId(event.target.value)} aria-label="Parcela para la nueva acción"><option value="">Toda la finca</option>{plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name}</option>)}</select> : null}<small>{contextText}</small></div><div className="field-action-groups">{actionGroups.map((group) => <section className="field-action-group" key={group.title} aria-labelledby={`field-action-${group.title.toLowerCase()}`}><div className="field-action-group-heading"><h3 id={`field-action-${group.title.toLowerCase()}`}>{group.title}</h3><p>{group.copy}</p></div><div className="field-action-primary">{group.items.map((item) => { const Icon = item.icon; const content = <><span className={`field-action-icon ${item.tone}`}><Icon aria-hidden="true" /></span><span><strong>{item.label}</strong><small>{item.detail}</small></span></>; return item.action === 'camera' ? <button key={item.label} type="button" className="field-action-item" onClick={() => { onClose(); onCamera(); }}>{content}</button> : item.href ? <a key={item.label} className="field-action-item" href={item.href}>{content}</a> : <button key={item.label} type="button" className="field-action-item" onClick={() => setSelectedAction(item)}>{content}</button>; })}</div></section>)}</div></>}</section></div>;
}
