import { BellRing, ChevronRight, Landmark, MapPinned, Users } from 'lucide-react';
import '../../styles/more-real.css';

type Props = {
  onDiscover: () => void;
  onMunicipalNews: () => void;
  onAlerts: () => void;
};

export function MorePanel({ onDiscover, onMunicipalNews, onAlerts }: Props) {
  return (
    <section className="more-real section-block section-block--last">
      <div className="more-real__intro">
        <span className="eyebrow">Servicios de Mágina</span>
        <h2>Más territorio, sin contenido de demostración</h2>
        <p>Accesos a información que ya está verificada. Las funciones sociales permanecerán cerradas hasta disponer de cuenta, moderación y reglas de publicación.</p>
      </div>

      <div className="more-real__grid">
        <button type="button" className="more-real__card" onClick={onDiscover}>
          <span className="more-real__icon"><MapPinned size={21} /></span>
          <span className="more-real__copy"><strong>Mágina Local</strong><small>Lugares y recursos turísticos con fuente institucional.</small></span>
          <ChevronRight size={17} />
        </button>

        <button type="button" className="more-real__card" onClick={onMunicipalNews}>
          <span className="more-real__icon"><Landmark size={21} /></span>
          <span className="more-real__copy"><strong>Ayuntamientos</strong><small>Actualidad municipal oficial de los pueblos incorporados.</small></span>
          <ChevronRight size={17} />
        </button>

        <button type="button" className="more-real__card" onClick={onAlerts}>
          <span className="more-real__icon"><BellRing size={21} /></span>
          <span className="more-real__copy"><strong>Alertas</strong><small>Avisos de campo y municipales sólo cuando existe información operativa trazable.</small></span>
          <ChevronRight size={17} />
        </button>

        <div className="more-real__card more-real__card--disabled" aria-disabled="true">
          <span className="more-real__icon"><Users size={21} /></span>
          <span className="more-real__copy"><strong>Comunidad</strong><small>En preparación. Se activará con cuentas, moderación y normas de publicación.</small></span>
          <span className="more-real__pending">Próximamente</span>
        </div>
      </div>
    </section>
  );
}
