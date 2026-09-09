import { useEffect, useRef, useState } from 'react';
import { BookOpen, CalendarPlus, Camera, Droplets, FilePlus2, FlaskConical, MapPinned, PackagePlus, Sprout, Tractor, X } from 'lucide-react';
import type { Farm, Plot } from './api.ts';

type ActionItem = { label: string; detail: string; href?: string; icon: typeof BookOpen; tone: string; action?: 'camera'; context?: 'farm' | 'plot' | 'none' };

const primaryActions: ActionItem[] = [
  { label: 'Registrar labor', detail: 'Trabajo, poda, abonado u observación', href: '/mi-campo/cuaderno?new=activity', icon: BookOpen, tone: 'olive', context: 'plot' },
  { label: 'Tratamiento', detail: 'Producto, dosis y plazo de seguridad', href: '/mi-campo/tratamientos?new=activity', icon: FlaskConical, tone: 'leaf', context: 'plot' },
  { label: 'Riego', detail: 'Agua, duración y superficie', href: '/mi-campo/riegos?new=activity', icon: Droplets, tone: 'water', context: 'plot' },
  { label: 'Entrega', detail: 'Kilos, destino y albarán', href: '/campana?new=delivery', icon: PackagePlus, tone: 'gold', context: 'plot' },
  { label: 'Tarea', detail: 'Planificar un trabajo pendiente', href: '/calendario?new=task', icon: CalendarPlus, tone: 'sky', context: 'plot' },
];

const moreActions: ActionItem[] = [
  { label: 'Foto u observación', detail: 'Cámara y ubicación de campo', icon: Camera, tone: 'clay', action: 'camera', context: 'plot' },
  { label: 'Nueva parcela', detail: 'Mapa, GPS, Catastro o SIGPAC', href: '/mi-campo/mapa?new=plot', icon: MapPinned, tone: 'map', context: 'farm' },
  { label: 'Nueva finca', detail: 'Añade una finca a tu explotación', href: '/mi-campo?new=farm', icon: Tractor, tone: 'mechanic', context: 'none' },
  { label: 'Jornales y maquinaria', detail: 'Personas, equipos, aperos y QR', href: '/mi-campo/recursos', icon: Tractor, tone: 'mechanic', context: 'plot' },
  { label: 'Documento', detail: 'Tickets y justificantes de campaña', href: '/campana?new=document', icon: FilePlus2, tone: 'paper', context: 'plot' },
];

function contextualHref(href: string | undefined, farmId: string | null, plotId: string | null, context: ActionItem['context'] = 'plot'): string | undefined {
  if (!href || context === 'none') return href;
  const separator = href.includes('?') ? '&' : '?';
  const search = new URLSearchParams();
  if (farmId) search.set('finca', farmId);
  if (context === 'plot' && plotId) search.set('parcela', plotId);
  const query = search.toString();
  return query ? `${href}${separator}${query}` : href;
}

export function FieldActionCenter({ farms, plots, selectedFarmId, initialPlotId = '', onSelectFarm, onClose, onCamera }: { farms: Farm[]; plots: Plot[]; selectedFarmId: string; initialPlotId?: string; onSelectFarm: (farmId: string) => void; onClose: () => void; onCamera: () => void }) {
  const sheetRef = useRef<HTMLElement>(null);
  const requestedPlotId = initialPlotId || new URLSearchParams(window.location.search).get('parcela') || '';
  const [selectedPlotId, setSelectedPlotId] = useState(requestedPlotId);
  const selectedFarm = farms.find((farm) => farm.id === selectedFarmId) ?? null;
  const selectedPlot = plots.find((plot) => plot.id === selectedPlotId) ?? null;
  useEffect(() => {
    sheetRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  useEffect(() => {
    setSelectedPlotId((current) => {
      if (requestedPlotId && plots.some((plot) => plot.id === requestedPlotId)) return requestedPlotId;
      return plots.some((plot) => plot.id === current) ? current : '';
    });
  }, [requestedPlotId, plots]);

  const changeFarm = (farmId: string) => {
    setSelectedPlotId('');
    onSelectFarm(farmId);
  };

  const renderAction = (item: ActionItem) => {
    const Icon = item.icon;
    const content = <><span className={`field-action-icon ${item.tone}`}><Icon aria-hidden="true" /></span><span><strong>{item.label}</strong><small>{item.detail}</small></span></>;
    return item.action === 'camera'
      ? <button key={item.label} type="button" className="field-action-item" onClick={() => { onClose(); onCamera(); }}>{content}</button>
      : <a key={item.label} className="field-action-item" href={contextualHref(item.href, selectedFarm?.id ?? null, selectedPlot?.id ?? null, item.context)} onClick={onClose}>{content}</a>;
  };

  return <div className="field-action-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={sheetRef} className="field-action-sheet" role="dialog" aria-modal="true" aria-labelledby="field-action-title" tabIndex={-1}>
      <div className="field-action-handle" aria-hidden="true" />
      <header><div><p className="eyebrow">CENTRO DE ACCIONES</p><h2 id="field-action-title">¿Qué quieres añadir?</h2><p>Añade algo a tu campo sin salir del contexto elegido.</p></div><button type="button" className="field-action-close" onClick={onClose} aria-label="Cerrar centro de acciones"><X aria-hidden="true" /></button></header>
      <div className="field-action-context"><span><Sprout aria-hidden="true" /> Destino de trabajo</span><label className="sr-only" htmlFor="action-farm">Finca para la nueva acción</label><select id="action-farm" value={selectedFarmId} onChange={(event) => changeFarm(event.target.value)} aria-label="Finca para la nueva acción"><option value="">Elegir al abrir el formulario</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select>{plots.length ? <><label className="sr-only" htmlFor="action-plot">Parcela para la nueva acción</label><select id="action-plot" value={selectedPlotId} onChange={(event) => setSelectedPlotId(event.target.value)} aria-label="Parcela para la nueva acción"><option value="">Toda la finca / elegir después</option>{plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name}</option>)}</select></> : null}<small>{selectedFarm ? selectedPlot ? `Finca ${selectedFarm.name} · Parcela ${selectedPlot.name}` : `Finca ${selectedFarm.name} · toda la finca` : 'Elige una finca y, si procede, una parcela.'}</small></div>
      <div className="field-action-primary">{primaryActions.map(renderAction)}</div>
      <details className="field-action-more"><summary>Más acciones</summary><div>{moreActions.map(renderAction)}</div></details>
    </section>
  </div>;
}
