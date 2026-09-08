import { useEffect, useRef } from 'react';
import { BookOpen, CalendarPlus, Camera, Droplets, FilePlus2, FlaskConical, MapPinned, PackagePlus, Sprout, Tractor, X } from 'lucide-react';
import type { Farm } from './api.ts';

type ActionItem = { label: string; detail: string; href?: string; icon: typeof BookOpen; tone: string; action?: 'camera' };

const primaryActions: ActionItem[] = [
  { label: 'Registrar labor', detail: 'Trabajo, poda, abonado u observación', href: '/mi-campo/cuaderno?new=activity', icon: BookOpen, tone: 'olive' },
  { label: 'Tratamiento', detail: 'Producto, dosis y plazo de seguridad', href: '/mi-campo/tratamientos?new=activity', icon: FlaskConical, tone: 'leaf' },
  { label: 'Riego', detail: 'Agua, duración y superficie', href: '/mi-campo/riegos?new=activity', icon: Droplets, tone: 'water' },
  { label: 'Entrega', detail: 'Kilos, destino y albarán', href: '/campana?new=delivery', icon: PackagePlus, tone: 'gold' },
  { label: 'Tarea', detail: 'Planificar un trabajo pendiente', href: '/calendario?new=task', icon: CalendarPlus, tone: 'sky' },
];

const moreActions: ActionItem[] = [
  { label: 'Foto u observación', detail: 'Cámara y ubicación de campo', icon: Camera, tone: 'clay', action: 'camera' },
  { label: 'Nueva parcela', detail: 'Mapa, GPS, Catastro o SIGPAC', href: '/mi-campo/mapa?new=plot', icon: MapPinned, tone: 'map' },
  { label: 'Jornales y maquinaria', detail: 'Personas, equipos, aperos y QR', href: '/mi-campo/recursos', icon: Tractor, tone: 'mechanic' },
  { label: 'Documento', detail: 'Tickets y justificantes de campaña', href: '/campana?new=document', icon: FilePlus2, tone: 'paper' },
];

function contextualHref(href: string | undefined, farmId: string | null): string | undefined {
  if (!href || !farmId) return href;
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}finca=${encodeURIComponent(farmId)}`;
}

export function FieldActionCenter({ farms, selectedFarmId, onSelectFarm, onClose, onCamera }: { farms: Farm[]; selectedFarmId: string; onSelectFarm: (farmId: string) => void; onClose: () => void; onCamera: () => void }) {
  const sheetRef = useRef<HTMLElement>(null);
  const selectedFarm = farms.find((farm) => farm.id === selectedFarmId) ?? null;
  useEffect(() => {
    sheetRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const renderAction = (item: ActionItem) => {
    const Icon = item.icon;
    const content = <><span className={`field-action-icon ${item.tone}`}><Icon aria-hidden="true" /></span><span><strong>{item.label}</strong><small>{item.detail}</small></span></>;
    return item.action === 'camera'
      ? <button key={item.label} type="button" className="field-action-item" onClick={() => { onClose(); onCamera(); }}>{content}</button>
      : <a key={item.label} className="field-action-item" href={contextualHref(item.href, selectedFarm?.id ?? null)} onClick={onClose}>{content}</a>;
  };

  return <div className="field-action-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={sheetRef} className="field-action-sheet" role="dialog" aria-modal="true" aria-labelledby="field-action-title" tabIndex={-1}>
      <div className="field-action-handle" aria-hidden="true" />
      <header><div><p className="eyebrow">CENTRO DE ACCIONES</p><h2 id="field-action-title">¿Qué quieres añadir?</h2><p>Añade algo a tu campo sin salir del contexto elegido.</p></div><button type="button" className="field-action-close" onClick={onClose} aria-label="Cerrar centro de acciones"><X aria-hidden="true" /></button></header>
      <label className="field-action-context"><span><Sprout aria-hidden="true" /> Destino de trabajo</span><select value={selectedFarmId} onChange={(event) => onSelectFarm(event.target.value)} aria-label="Finca para la nueva acción"><option value="">Elegir al abrir el formulario</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select><small>{selectedFarm ? `Finca ${selectedFarm.name} · elegirás la parcela antes de guardar.` : 'Puedes elegir la finca y la parcela antes de confirmar.'}</small></label>
      <div className="field-action-primary">{primaryActions.map(renderAction)}</div>
      <details className="field-action-more"><summary>Más acciones</summary><div>{moreActions.map(renderAction)}</div></details>
    </section>
  </div>;
}
