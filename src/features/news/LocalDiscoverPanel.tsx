import {
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

type LocalDiscoverPanelProps = {
  mode: 'local' | 'discover';
};

const localServices = [
  { icon: Tractor, title: 'Maquinaria y labores', detail: 'Servicios agrícolas y apoyo en campaña', town: 'Sierra Mágina' },
  { icon: Wrench, title: 'Talleres agrícolas', detail: 'Reparación, mantenimiento y repuestos', town: 'Cerca de ti' },
  { icon: ShoppingBasket, title: 'Suministros', detail: 'Fitosanitarios, abonos y material de campo', town: 'Comarca' },
  { icon: Fuel, title: 'Combustible', detail: 'Puntos de suministro para maquinaria', town: 'Comarca' },
];

const towns = ['Bedmar', 'Huelma', 'Jimena', 'Cambil', 'Jódar', 'Bélmez de la Moraleda'];

const routes = [
  { title: 'Mar de Olivos', meta: '7,8 km · Fácil', tag: 'Paisaje', className: 'discover-photo--olive' },
  { title: 'Miradores de Mágina', meta: '10,4 km · Media', tag: 'Sierra', className: 'discover-photo--mountain' },
  { title: 'Caminos de Jimena', meta: '6,2 km · Fácil', tag: 'Pueblos', className: 'discover-photo--village' },
];

export function LocalDiscoverPanel({ mode }: LocalDiscoverPanelProps) {
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
        {routes.map((route) => (
          <button className="discover-route-card" type="button" key={route.title}>
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
