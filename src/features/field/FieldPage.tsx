import { useMemo, useState } from 'react';
import {
  Bell,
  ChevronRight,
  Droplets,
  Leaf,
  MapPinned,
  Mountain,
  Ruler,
  Sprout,
  Trees,
} from 'lucide-react';
import { Brand } from '../../components/Brand';
import { BottomNav, MainSection } from '../../components/BottomNav';

type FieldPageProps = {
  onNavigate: (section: MainSection) => void;
};

type Parcel = {
  id: number;
  name: string;
  area: string;
  variety: string;
  altitude: string;
  frame: string;
  slope: string;
  status: 'Bueno' | 'Revisar';
  note: string;
};

const parcels: Parcel[] = [
  { id: 1, name: 'Parcela 1', area: '5,20 ha', variety: 'Picual', altitude: '650 m', frame: '7 × 7 m', slope: '12 %', status: 'Bueno', note: 'Desarrollo vegetativo correcto.' },
  { id: 2, name: 'Parcela 2', area: '4,40 ha', variety: 'Picual', altitude: '625 m', frame: '7 × 7 m', slope: '8 %', status: 'Bueno', note: 'Sin incidencias relevantes.' },
  { id: 3, name: 'Parcela 3', area: '4,10 ha', variety: 'Picual', altitude: '672 m', frame: '7 × 7 m', slope: '16 %', status: 'Revisar', note: 'Riesgo medio de repilo por humedad.' },
  { id: 4, name: 'Parcela 4', area: '5,90 ha', variety: 'Picual', altitude: '705 m', frame: '7 × 7 m', slope: '19 %', status: 'Bueno', note: 'Poda completada esta campaña.' },
  { id: 5, name: 'Parcela 5', area: '3,85 ha', variety: 'Picual', altitude: '640 m', frame: '7 × 7 m', slope: '10 %', status: 'Bueno', note: 'Revisar humedad de suelo en 48 h.' },
];

export function FieldPage({ onNavigate }: FieldPageProps) {
  const [selectedId, setSelectedId] = useState(3);
  const selected = useMemo(() => parcels.find((parcel) => parcel.id === selectedId) ?? parcels[0], [selectedId]);

  return (
    <div className="app-shell">
      <main className="mobile-page">
        <header className="topbar">
          <Brand />
          <button className="icon-button" type="button" aria-label="Notificaciones"><Bell size={20} /></button>
        </header>

        <section className="farm-hero">
          <div className="farm-hero__overlay" />
          <div className="farm-hero__copy">
            <span>Finca activa</span>
            <h1>Los Llanos</h1>
            <p>Bedmar · Sierra Mágina</p>
          </div>
          <div className="farm-hero__metrics">
            <div><small>Superficie</small><strong>23,45 ha</strong></div>
            <div><small>Parcelas</small><strong>5</strong></div>
            <div><small>Variedad</small><strong>Picual</strong></div>
          </div>
        </section>

        <section className="section-block">
          <div className="section-heading">
            <div><span className="eyebrow">Mi Campo</span><h2>Parcelas</h2></div>
            <button className="text-action" type="button">Ver mapa</button>
          </div>

          <div className="parcel-list">
            {parcels.map((parcel) => (
              <button
                key={parcel.id}
                type="button"
                className={`parcel-row${selectedId === parcel.id ? ' parcel-row--active' : ''}`}
                onClick={() => setSelectedId(parcel.id)}
              >
                <div className="parcel-row__thumb"><Sprout size={22} /></div>
                <div className="parcel-row__copy">
                  <strong>{parcel.name}</strong>
                  <span>{parcel.area} · {parcel.variety}</span>
                </div>
                <span className={`status-pill status-pill--${parcel.status === 'Bueno' ? 'good' : 'review'}`}>{parcel.status}</span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        </section>

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
            <article><Trees size={18} /><span>Variedad</span><strong>{selected.variety}</strong></article>
            <article><Ruler size={18} /><span>Superficie</span><strong>{selected.area}</strong></article>
            <article><Mountain size={18} /><span>Altitud</span><strong>{selected.altitude}</strong></article>
            <article><Leaf size={18} /><span>Marco</span><strong>{selected.frame}</strong></article>
          </div>

          <article className={`parcel-health parcel-health--${selected.status === 'Bueno' ? 'good' : 'review'}`}>
            <div>
              <span>Estado actual</span>
              <strong>{selected.status}</strong>
              <p>{selected.note}</p>
            </div>
            {selected.status === 'Revisar' ? <Droplets size={23} /> : <Sprout size={23} />}
          </article>
        </section>

        <section className="section-block section-block--last">
          <div className="section-heading"><div><span className="eyebrow">Resumen</span><h2>Esta semana</h2></div></div>
          <div className="field-week-grid">
            <article><span>Tratamientos</span><strong>2</strong><small>1 pendiente</small></article>
            <article><span>Riegos</span><strong>3</strong><small>30 mm acumulados</small></article>
            <article><span>Labores</span><strong>4</strong><small>3 completadas</small></article>
          </div>
        </section>
      </main>

      <BottomNav active="field" onNavigate={onNavigate} onCreate={() => undefined} />
    </div>
  );
}
