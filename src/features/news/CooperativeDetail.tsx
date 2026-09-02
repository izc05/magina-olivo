import {
  ArrowLeft,
  BellRing,
  Bookmark,
  Building2,
  CalendarClock,
  ChevronRight,
  Clock3,
  FileText,
  MapPin,
  Scale,
  Truck,
} from 'lucide-react';
import { Brand } from '../../components/Brand';
import '../../styles/cooperative.css';

export type CooperativeSummary = {
  name: string;
  town: string;
  distance: string;
  status: string;
  aove: string;
  hours: string;
};

type CooperativeDetailProps = {
  cooperative: CooperativeSummary;
  onBack: () => void;
};

export function CooperativeDetail({ cooperative, onBack }: CooperativeDetailProps) {
  return (
    <main className="mobile-page">
      <header className="topbar coop-detail-topbar">
        <button className="icon-button" type="button" aria-label="Volver" onClick={onBack}><ArrowLeft size={20} /></button>
        <Brand compact />
        <button className="icon-button" type="button" aria-label="Guardar cooperativa"><Bookmark size={19} /></button>
      </header>

      <section className="coop-detail-hero">
        <div className="coop-detail-hero__mark"><Building2 size={34} /></div>
        <div className="coop-detail-hero__copy">
          <span className="eyebrow">Cooperativa</span>
          <h1>{cooperative.name}</h1>
          <p><MapPin size={14} /> {cooperative.town} · {cooperative.distance}</p>
        </div>
        <span className="coop-detail-status">{cooperative.status}</span>
      </section>

      <section className="coop-detail-metrics">
        <article><span>Referencia AOVE</span><strong>{cooperative.aove}</strong><small>Dato de demostración</small></article>
        <article><span>Recepción</span><strong>{cooperative.hours}</strong><small>Horario orientativo</small></article>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">Campaña</span><h2>Información útil</h2></div></div>
        <div className="coop-service-list">
          <article><Truck size={20} /><div><strong>Recepción de aceituna</strong><span>Acceso a horarios, cambios de última hora y estado de recepción.</span></div><ChevronRight size={18} /></article>
          <article><Scale size={20} /><div><strong>Entregas y pesajes</strong><span>Preparado para incorporar tus entregas cuando exista integración con la cooperativa.</span></div><ChevronRight size={18} /></article>
          <article><CalendarClock size={20} /><div><strong>Turnos y servicios</strong><span>Información de campaña, citas y servicios al socio.</span></div><ChevronRight size={18} /></article>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">Avisos</span><h2>Últimas novedades</h2></div><BellRing size={20} /></div>
        <article className="coop-notice-card"><strong>Información de campaña disponible</strong><p>Este espacio mostrará los avisos publicados por la cooperativa con fecha y fuente claramente identificadas.</p><small>Demostración visual</small></article>
      </section>

      <section className="section-block section-block--last">
        <div className="section-heading"><div><span className="eyebrow">Documentación</span><h2>Documentos</h2></div></div>
        <button className="coop-document-row" type="button"><FileText size={20} /><div><strong>Normas de recepción</strong><span>Documento de ejemplo · PDF</span></div><ChevronRight size={18} /></button>
        <button className="coop-document-row" type="button"><FileText size={20} /><div><strong>Información de campaña</strong><span>Documento de ejemplo · PDF</span></div><ChevronRight size={18} /></button>
        <div className="coop-source-note"><Clock3 size={16} /><span>En la versión con datos reales, horarios, precios y avisos mostrarán siempre fuente y última actualización.</span></div>
      </section>
    </main>
  );
}
