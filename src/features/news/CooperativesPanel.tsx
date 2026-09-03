import { useState } from 'react';
import { Building2, ChevronRight, Info, MapPin } from 'lucide-react';
import { CooperativeDetail, CooperativeSummary } from './CooperativeDetail';
import '../../styles/cooperatives-v24.css';

const cooperatives: CooperativeSummary[] = [
  { name: 'S.C.A. San Isidro', town: 'Bedmar', distance: '4,2 km', status: 'Abierta', aove: '5,35 €/kg', hours: '07:00–20:00' },
  { name: 'Nuestra Señora de Mágina', town: 'Huelma', distance: '18 km', status: 'Horario normal', aove: '5,29 €/kg', hours: '08:00–19:00' },
  { name: 'S.C.A. Sierra Sur', town: 'Cambil', distance: '22 km', status: 'Información', aove: '5,31 €/kg', hours: '08:00–18:00' },
];

export function CooperativesPanel() {
  const [selected, setSelected] = useState<CooperativeSummary | null>(null);

  if (selected) {
    return <CooperativeDetail cooperative={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <section className="section-block hub-panel hub-panel--flush cooperatives-v24">
      <div className="section-heading">
        <div><span className="eyebrow">Directorio</span><h2>Cooperativas</h2></div>
        <button className="text-action" type="button"><MapPin size={15} /> Cerca</button>
      </div>

      <div className="coop-list">
        {cooperatives.map((coop, index) => (
          <article className="coop-card coop-card--territorial" key={coop.name}>
            <div className={`coop-card__photo coop-card__photo--${index + 1}`}>
              <div className="coop-card__photo-shade" />
              <span><MapPin size={13} /> {coop.town} · {coop.distance}</span>
            </div>

            <div className="coop-card__body">
              <div className="coop-card__head">
                <div className="coop-card__mark"><Building2 size={22} /></div>
                <div><strong>{coop.name}</strong><span>Sierra Mágina · ficha de demostración</span></div>
                <small>{coop.status}</small>
              </div>

              <div className="coop-card__metrics">
                <div><span>Referencia AOVE · demo</span><strong>{coop.aove}</strong></div>
                <div><span>Recepción · demo</span><strong>{coop.hours}</strong></div>
              </div>

              <button type="button" className="secondary-button" onClick={() => setSelected(coop)}>
                Ver ficha completa <ChevronRight size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="coop-demo-note">
        <Info size={17} />
        <span>Precios, horarios, distancia y estados son datos de demostración visual. La versión conectada mostrará información verificada y su fuente.</span>
      </div>
    </section>
  );
}
