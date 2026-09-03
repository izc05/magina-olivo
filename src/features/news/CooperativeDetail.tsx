import {
  ArrowLeft,
  BellRing,
  Bookmark,
  Building2,
  ChevronRight,
  ExternalLink,
  FileText,
  MapPin,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import type { CooperativeRecord } from './cooperativesFeed';
import '../../styles/cooperative.css';

export type CooperativeSummary = CooperativeRecord & {
  sourceLabel: string;
  sourceUrl: string;
};

type CooperativeDetailProps = {
  cooperative: CooperativeSummary;
  onBack: () => void;
};

export function CooperativeDetail({ cooperative, onBack }: CooperativeDetailProps) {
  return (
    <section className="section-block hub-panel hub-panel--flush section-block--last coop-detail-view">
      <div className="coop-detail-inline-head">
        <button className="coop-detail-back" type="button" onClick={onBack}><ArrowLeft size={17} /> Cooperativas</button>
        <button className="icon-button" type="button" aria-label="Guardar cooperativa"><Bookmark size={18} /></button>
      </div>

      <section className="coop-detail-hero">
        <div className="coop-detail-hero__mark"><Building2 size={34} /></div>
        <div className="coop-detail-hero__copy">
          <span className="eyebrow">Cooperativa · Sierra Mágina</span>
          <h1>{cooperative.name}</h1>
          <p><MapPin size={14} /> {cooperative.town}</p>
        </div>
        <span className="coop-detail-status">D.O.P.</span>
      </section>

      <section className="coop-detail-metrics coop-detail-metrics--verified">
        <article><span>Marca vinculada</span><strong>{cooperative.brand}</strong><small>Directorio D.O.P. Sierra Mágina</small></article>
        <article><span>Estado de la ficha</span><strong>Verificada</strong><small>Sin horarios ni precios inventados</small></article>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">Información</span><h2>Ficha oficial</h2></div><ShieldCheck size={20} /></div>
        <div className="coop-service-list">
          <article><ShieldCheck size={20} /><div><strong>Entidad verificada</strong><span>El nombre, municipio y marca proceden del directorio público de la D.O.P. Sierra Mágina.</span></div></article>
          <article><Truck size={20} /><div><strong>Campaña y recepción</strong><span>Este bloque queda preparado para incorporar horarios y avisos cuando exista una fuente directa y actualizada de la cooperativa.</span></div><ChevronRight size={18} /></article>
          <article><BellRing size={20} /><div><strong>Avisos al socio</strong><span>Podremos mostrar novedades de campaña, recepción, servicios y documentación manteniendo siempre fecha y fuente.</span></div><ChevronRight size={18} /></article>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">Fuente</span><h2>Trazabilidad</h2></div></div>
        <a className="coop-document-row" href={cooperative.sourceUrl} target="_blank" rel="noreferrer">
          <FileText size={20} />
          <div><strong>{cooperative.sourceLabel}</strong><span>Consulta el directorio original</span></div>
          <ExternalLink size={18} />
        </a>
      </section>

      <section className="section-block section-block--last">
        <div className="coop-source-note"><ShieldCheck size={16} /><span>Mágina Olivo no mostrará precios, horarios o estados operativos como reales hasta poder verificarlos en una fuente oficial o autorizada.</span></div>
      </section>
    </section>
  );
}
