import { useState } from 'react';
import { Building2, ChevronRight, MapPin } from 'lucide-react';
import { CooperativeDetail, CooperativeSummary } from './CooperativeDetail';

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
    <section className="section-block hub-panel hub-panel--flush">
      <div className="section-heading"><div><span className="eyebrow">Directorio</span><h2>Cooperativas</h2></div><button className="text-action" type="button"><MapPin size={15} /> Cerca</button></div>
      <div className="coop-list">
        {cooperatives.map((coop) => (
          <article className="coop-card" key={coop.name}>
            <div className="coop-card__head"><div className="coop-card__mark"><Building2 size={22} /></div><div><strong>{coop.name}</strong><span>{coop.town} · {coop.distance}</span></div><small>{coop.status}</small></div>
            <div className="coop-card__metrics"><div><span>AOVE</span><strong>{coop.aove}</strong></div><div><span>Recepción</span><strong>{coop.hours}</strong></div></div>
            <button type="button" className="secondary-button" onClick={() => setSelected(coop)}>Ver ficha completa <ChevronRight size={16} /></button>
          </article>
        ))}
      </div>
    </section>
  );
}
