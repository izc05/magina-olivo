import { useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  BriefcaseBusiness,
  ChevronRight,
  Compass,
  Fuel,
  MapPin,
  Mountain,
  Route,
  ShoppingBasket,
  Store,
  Tractor,
  Utensils,
  Wrench,
} from 'lucide-react';
import '../../styles/discover.css';

type LocalDiscoverPanelProps = {
  mode: 'local' | 'discover';
};

type DiscoverRoute = {
  title: string;
  meta: string;
  tag: string;
  className: string;
  distance: string;
  difficulty: string;
  duration: string;
  start: string;
  description: string;
  highlights: string[];
};

const localServices = [
  { icon: Tractor, title: 'Maquinaria y labores', detail: 'Servicios agrícolas y apoyo en campaña', town: 'Sierra Mágina' },
  { icon: Wrench, title: 'Talleres agrícolas', detail: 'Reparación, mantenimiento y repuestos', town: 'Cerca de ti' },
  { icon: ShoppingBasket, title: 'Suministros', detail: 'Fitosanitarios, abonos y material de campo', town: 'Comarca' },
  { icon: Fuel, title: 'Combustible', detail: 'Puntos de suministro para maquinaria', town: 'Comarca' },
];

const towns = ['Bedmar', 'Huelma', 'Jimena', 'Cambil', 'Jódar', 'Bélmez de la Moraleda'];

const routes: DiscoverRoute[] = [
  {
    title: 'Mar de Olivos', meta: '7,8 km · Fácil', tag: 'Paisaje', className: 'discover-photo--olive',
    distance: '7,8 km', difficulty: 'Fácil', duration: '2 h 15 min', start: 'Entorno de Bedmar',
    description: 'Ruta de demostración centrada en el paisaje continuo de olivar, con lectura sencilla del territorio y paradas pensadas para disfrutar sin prisas.',
    highlights: ['Paisaje de olivar', 'Vistas de Sierra Mágina', 'Tramo apto para paseo tranquilo'],
  },
  {
    title: 'Miradores de Mágina', meta: '10,4 km · Media', tag: 'Sierra', className: 'discover-photo--mountain',
    distance: '10,4 km', difficulty: 'Media', duration: '3 h 10 min', start: 'Sierra Mágina',
    description: 'Recorrido visual de demostración para conectar miradores, sierra y grandes panorámicas del olivar de la comarca.',
    highlights: ['Miradores naturales', 'Contraste sierra-olivar', 'Desnivel moderado'],
  },
  {
    title: 'Caminos de Jimena', meta: '6,2 km · Fácil', tag: 'Pueblos', className: 'discover-photo--village',
    distance: '6,2 km', difficulty: 'Fácil', duration: '1 h 50 min', start: 'Jimena',
    description: 'Paseo de demostración entre caminos rurales y entorno de pueblo, pensado para combinar patrimonio local y paisaje agrícola.',
    highlights: ['Entorno rural', 'Acceso desde el pueblo', 'Paisaje agrícola cercano'],
  },
];

export function LocalDiscoverPanel({ mode }: LocalDiscoverPanelProps) {
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(null);
  const selectedRoute = selectedRouteIndex === null ? null : routes[selectedRouteIndex] ?? null;

  if (mode === 'local') {
    return (
      <section className="section-block hub-panel hub-panel--flush section-block--last local-v2">
        <div className="section-heading">
          <div><span className="eyebrow">Mágina Local</span><h2>Lo que necesitas cerca</h2></div>
          <button className="text-action" type="button"><MapPin size={15} /> Mapa</button>
        </div>

        <div className="local-utility-grid">
          {localServices.map(({ icon: Icon, title, detail, town }) => (
            <button className="local-service-card" type="button" key={title}>
              <div className="local-service-card__icon"><Icon size={21} /></div>
              <div className="local-service-card__copy"><strong>{title}</strong><span>{detail}</span><small>{town}</small></div>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>

        <article className="local-highlight-card">
          <div className="local-highlight-card__icon"><BriefcaseBusiness size={23} /></div>
          <div><span className="eyebrow">Empleo y campaña</span><strong>Oportunidades de la comarca</strong><p>Un espacio para campañas agrícolas, servicios temporales y necesidades locales del sector.</p></div>
          <ChevronRight size={19} />
        </article>

        <div className="section-heading local-section-heading">
          <div><span className="eyebrow">Municipios</span><h2>Sierra Mágina</h2></div>
        </div>
        <div className="town-chip-list">
          {towns.map((town) => <button key={town} className="town-chip" type="button"><MapPin size={13} />{town}</button>)}
        </div>

        <article className="local-notice-card">
          <Store size={21} />
          <div><strong>Tablón local</strong><span>Avisos, pequeños servicios y oportunidades útiles para quien vive y trabaja en la comarca.</span></div>
          <ChevronRight size={18} />
        </article>
      </section>
    );
  }

  if (selectedRoute) {
    return (
      <section className="section-block hub-panel hub-panel--flush section-block--last discover-v2 discover-route-detail">
        <div className="discover-route-detail__topbar">
          <button className="secondary-button" type="button" onClick={() => setSelectedRouteIndex(null)}><ArrowLeft size={17} /> Volver a rutas</button>
          <button className="icon-button" type="button" aria-label="Guardar ruta"><Bookmark size={18} /></button>
        </div>

        <div className={`discover-route-detail__hero discover-photo ${selectedRoute.className}`}>
          <div className="discover-route-detail__shade" />
          <div className="discover-route-detail__copy"><span>{selectedRoute.tag}</span><h2>{selectedRoute.title}</h2><p>{selectedRoute.start}</p></div>
        </div>

        <div className="discover-route-detail__metrics">
          <article><span>Distancia</span><strong>{selectedRoute.distance}</strong></article>
          <article><span>Dificultad</span><strong>{selectedRoute.difficulty}</strong></article>
          <article><span>Duración</span><strong>{selectedRoute.duration}</strong></article>
        </div>

        <article className="discover-route-detail__body">
          <span className="eyebrow">La ruta</span>
          <p>{selectedRoute.description}</p>
          <div className="discover-route-detail__highlights">
            {selectedRoute.highlights.map((highlight) => <span key={highlight}><Route size={14} />{highlight}</span>)}
          </div>
          <div className="market-note"><MapPin size={18} /><span>Recorrido y datos mostrados en esta fase son de demostración visual. La versión final usará trazado, fuente y recomendaciones oficiales.</span></div>
          <button className="primary-button primary-button--wide" type="button">Guardar en Mi Mágina</button>
        </article>
      </section>
    );
  }

  return (
    <section className="section-block hub-panel hub-panel--flush section-block--last discover-v2">
      <button className="discover-main-hero" type="button">
        <div className="discover-main-hero__photo discover-photo discover-photo--hero" />
        <div className="discover-main-hero__shade" />
        <div className="discover-main-hero__copy">
          <span>Descubre Sierra Mágina</span>
          <h2>La tierra que da origen a nuestro aceite</h2>
          <p>Olivares, sierra, pueblos y experiencias conectadas con el territorio.</p>
        </div>
      </button>

      <div className="discover-shortcuts">
        <button type="button"><Route size={19} /><span>Rutas</span></button>
        <button type="button"><Mountain size={19} /><span>Miradores</span></button>
        <button type="button"><Utensils size={19} /><span>Gastronomía</span></button>
        <button type="button"><Store size={19} /><span>Oleoturismo</span></button>
      </div>

      <div className="section-heading discover-section-heading">
        <div><span className="eyebrow">Para caminar</span><h2>Rutas destacadas</h2></div>
        <button type="button" className="text-action">Ver todas</button>
      </div>

      <div className="discover-route-list">
        {routes.map((route, index) => (
          <button className="discover-route-card" type="button" key={route.title} onClick={() => setSelectedRouteIndex(index)}>
            <div className={`discover-route-card__photo discover-photo ${route.className}`} />
            <div className="discover-route-card__copy"><span>{route.tag}</span><strong>{route.title}</strong><small>{route.meta}</small></div>
            <ChevronRight size={18} />
          </button>
        ))}
      </div>

      <div className="discover-duo-grid">
        <button className="discover-editorial-card" type="button">
          <div className="discover-photo discover-photo--food" />
          <div><span>Sabores de Mágina</span><strong>Gastronomía con AOVE como hilo conductor</strong></div>
        </button>
        <button className="discover-editorial-card" type="button">
          <div className="discover-photo discover-photo--mill" />
          <div><span>Oleoturismo</span><strong>Del olivo a la almazara</strong></div>
        </button>
      </div>

      <article className="discover-weekend-card">
        <Compass size={24} />
        <div><span className="eyebrow">Plan recomendado</span><strong>Un día entre olivares y pueblos</strong><p>Ruta suave, parada gastronómica y visita vinculada al aceite.</p></div>
        <ChevronRight size={19} />
      </article>
    </section>
  );
}
