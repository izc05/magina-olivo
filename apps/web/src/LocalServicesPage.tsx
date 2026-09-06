import { ArrowRight, Leaf, MapPin, Search, ShoppingCart, Stethoscope, Truck, UsersRound, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { VisualHeader } from './VisualChrome';

type Category = 'Todos' | 'Suministros' | 'Talleres' | 'Farmacias' | 'Transporte' | 'Profesionales';

type LocalService = {
  slug: string;
  name: string;
  category: Exclude<Category, 'Todos'>;
  summary: string;
  location: string;
  distance: string;
  imagePosition: 'left' | 'center' | 'right';
  featured?: boolean;
};

const services: LocalService[] = [
  { slug: 'agrobedmar', name: 'AgroBedmar', category: 'Suministros', summary: 'Suministros agrícolas y riego', location: 'Bedmar', distance: '1,2 km', imagePosition: 'left', featured: true },
  { slug: 'talleres-sierra-magina', name: 'Talleres Sierra Mágina', category: 'Talleres', summary: 'Maquinaria y reparación agrícola', location: 'Sierra Mágina', distance: '2,4 km', imagePosition: 'center', featured: true },
  { slug: 'farmacia-bedmar', name: 'Farmacia local', category: 'Farmacias', summary: 'Salud y bienestar cercano', location: 'Bedmar', distance: '1,1 km', imagePosition: 'right' },
  { slug: 'transportes-magina', name: 'Transportes Mágina', category: 'Transporte', summary: 'Transporte y logística rural', location: 'Sierra Mágina', distance: '3,6 km', imagePosition: 'center' },
  { slug: 'asesoria-rural', name: 'Asesoría rural', category: 'Profesionales', summary: 'Asesoramiento técnico y ayudas', location: 'Bedmar', distance: '800 m', imagePosition: 'left' },
];

const categoryIcons = { Suministros: Leaf, Talleres: Wrench, Farmacias: Stethoscope, Transporte: Truck, Profesionales: UsersRound } as const;
const categories: Category[] = ['Todos', 'Suministros', 'Talleres', 'Farmacias', 'Transporte', 'Profesionales'];

function ServiceImage({ service }: { service: LocalService }) {
  return <img className={`local-service-image ${service.imagePosition}`} src="/photos/local-services-triptych.png" alt="" />;
}

function ServiceRow({ service }: { service: LocalService }) {
  const Icon = categoryIcons[service.category];
  return <a className="local-service-row card" href={`/descubre/servicios/${service.slug}`}>
    <ServiceImage service={service} />
    <span className="local-service-copy"><strong>{service.name}</strong><span className="local-service-chip"><Icon aria-hidden="true" />{service.category}</span><small>{service.summary}</small><small><MapPin aria-hidden="true" />{service.distance} · {service.location}</small></span>
    <ArrowRight aria-hidden="true" />
  </a>;
}

export function LocalServicesPage({ directory = false }: { directory?: boolean }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('Todos');
  const visible = useMemo(() => services.filter((item) => {
    const text = query.trim().toLocaleLowerCase('es');
    return (category === 'Todos' || item.category === category) && (!text || `${item.name} ${item.category} ${item.location}`.toLocaleLowerCase('es').includes(text));
  }), [category, query]);
  const featured = services.filter((item) => item.featured);

  return <main className="local-services-shell" id="main-content">
    <VisualHeader />
    <section className="local-services-intro">
      <p className="eyebrow">SERVICIOS LOCALES</p>
      <h1>{directory ? 'Directorio local' : 'Todo lo que tienes cerca'}</h1>
      <p>{directory ? 'Comercios, suministros y ayuda útil cerca de tu olivar en Bedmar y Sierra Mágina.' : 'Comercios, servicios y profesionales en Bedmar y Sierra Mágina.'}</p>
    </section>
    <label className="local-services-search"><Search aria-hidden="true" /><span className="sr-only">Buscar servicios</span><input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Buscar servicios, negocios o categorías…" /></label>
    <nav className={`local-services-categories ${directory ? 'directory' : 'landing'}`} aria-label="Categorías de servicios">
      {(directory ? categories : categories.filter((item) => item !== 'Todos')).map((item) => { const Icon = item === 'Todos' ? ShoppingCart : categoryIcons[item]; return <button className={category === item ? 'active' : ''} type="button" onClick={() => setCategory(item)} key={item}><Icon aria-hidden="true" />{item}</button>; })}
    </nav>
    {!directory ? <>
      <div className="local-services-section-heading"><h2>Destacados</h2><a href="/descubre/servicios">Ver todos <ArrowRight aria-hidden="true" /></a></div>
      <section className="local-services-featured" aria-label="Servicios locales destacados">{featured.map((service) => <ServiceRow key={service.slug} service={service} />)}</section>
      <div className="local-services-section-heading nearby"><h2>Cerca de ti</h2></div>
    </> : null}
    <section className={directory ? 'local-services-list directory' : 'local-services-list'} aria-label={directory ? 'Resultados del directorio' : 'Servicios cercanos'}>{visible.map((service) => <ServiceRow key={service.slug} service={service} />)}</section>
    {!directory ? <a className="local-services-cta primary-button" href="/descubre/servicios">Ver todos los servicios <ArrowRight aria-hidden="true" /></a> : null}
    <p className="local-services-note">Vista de diseño con negocios de ejemplo. Antes de publicar contactos, horarios o rutas se cargarán desde fichas verificadas por cada negocio.</p>
  </main>;
}

export function LocalServiceDetailPage({ slug }: { slug: string }) {
  const service = services.find((item) => item.slug === slug) ?? services[0];
  const Icon = categoryIcons[service.category];
  return <main className="local-services-shell local-service-detail" id="main-content">
    <VisualHeader />
    <a className="local-service-back" href="/descubre/servicios">← Servicios locales</a>
    <article className="local-service-detail-hero card">
      <ServiceImage service={service} />
      <div><span className="local-service-chip"><Icon aria-hidden="true" />{service.category}</span><h1>{service.name}</h1><p>{service.summary} para el olivar en Bedmar y Sierra Mágina.</p><small><MapPin aria-hidden="true" />{service.location}</small></div>
      <div className="local-service-actions"><button type="button" disabled>Contacto pendiente</button><a href={`/descubre/servicios?destino=${service.slug}`}>Ver en el directorio</a><button type="button">Guardar</button></div>
    </article>
    <section className="local-service-info card"><Icon aria-hidden="true" /><div><p className="eyebrow">SERVICIOS</p><h2>Información de la ficha</h2><p>Los servicios, horario, teléfono y ruta aparecerán cuando este negocio confirme su ficha pública.</p></div></section>
    <section className="local-service-info card"><MapPin aria-hidden="true" /><div><p className="eyebrow">UBICACIÓN</p><h2>{service.location}</h2><p>La distancia mostrada es de demostración y se calculará con ubicación autorizada o una dirección de salida elegida por la persona usuaria.</p></div></section>
  </main>;
}
