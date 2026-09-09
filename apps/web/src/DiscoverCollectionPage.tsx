import { ArrowLeft, ArrowRight, BookOpenCheck, Compass, MapPin, Mountain, Store, Trees, Utensils } from 'lucide-react';
import { VisualHeader } from './VisualChrome';

type CollectionSlug = 'miradores' | 'gastronomia' | 'oleoturismo' | 'pueblos';

const collections: Record<CollectionSlug, {
  eyebrow: string;
  title: string;
  intro: string;
  image: string;
  imageAlt: string;
  icon: typeof Mountain;
  topics: readonly { title: string; copy: string; image: string }[];
}> = {
  miradores: {
    eyebrow: 'PAISAJE Y SIERRA', title: 'Miradores de Sierra Mágina', intro: 'Puntos para contemplar la sierra, los olivares y los pueblos del territorio.', image: '/photos/field-olivares-magina.webp', imageAlt: 'Olivar y montañas de Sierra Mágina', icon: Mountain,
    topics: [
      { title: 'Vistas de la sierra', copy: 'Una selección editorial pendiente de contrastar con el territorio.', image: '/photos/home-sierra-magina.webp' },
      { title: 'El paisaje del olivar', copy: 'Claves para mirar el mosaico agrícola con respeto.', image: '/photos/field-olivares-magina.webp' },
      { title: 'Paradas con sentido', copy: 'Las ubicaciones, accesibilidad y servicios se publicarán con fuente y fecha de revisión.', image: '/photos/discover-experiences-triptych.png' },
    ],
  },
  gastronomia: {
    eyebrow: 'SABORES DEL TERRITORIO', title: 'Gastronomía de Sierra Mágina', intro: 'Cocina local, aceite de oliva virgen extra y recetas vinculadas al territorio.', image: '/photos/discover-experiences-triptych.png', imageAlt: 'Experiencias del territorio de Sierra Mágina', icon: Utensils,
    topics: [
      { title: 'Aceite y cocina', copy: 'Contenido editorial sobre el AOVE y su vínculo con la cocina local.', image: '/photos/field-olivares-magina.webp' },
      { title: 'Sabores de temporada', copy: 'Propuestas de lectura; restaurantes, horarios y reservas requieren fuente verificada.', image: '/photos/discover-experiences-triptych.png' },
      { title: 'Recetas con origen', copy: 'Una colección que se ampliará con autoría y procedencia claras.', image: '/photos/home-sierra-magina.webp' },
    ],
  },
  oleoturismo: {
    eyebrow: 'DEL OLIVAR AL ACEITE', title: 'Oleoturismo', intro: 'Conoce el proceso, la cultura del olivo y las experiencias que nacen alrededor del aceite.', image: '/photos/field-olivares-magina.webp', imageAlt: 'Olivar de Sierra Mágina', icon: Store,
    topics: [
      { title: 'El origen del aceite', copy: 'Una introducción al ciclo del olivar sin atribuir visitas o actividades no confirmadas.', image: '/photos/field-olivares-magina.webp' },
      { title: 'Almazaras y cultura', copy: 'Las experiencias disponibles se mostrarán solo cuando cada entidad las confirme.', image: '/photos/discover-experiences-triptych.png' },
      { title: 'Compra con criterio', copy: 'Consulta el directorio público para localizar entidades con información contrastada.', image: '/photos/home-sierra-magina.webp' },
    ],
  },
  pueblos: {
    eyebrow: 'CULTURA Y TERRITORIO', title: 'Pueblos de Sierra Mágina', intro: 'Historia, patrimonio, vida rural y los paisajes que unen a los pueblos de la comarca.', image: '/photos/home-sierra-magina.webp', imageAlt: 'Paisaje de Sierra Mágina', icon: MapPin,
    topics: [
      { title: 'Patrimonio y memoria', copy: 'Historias locales que se incorporarán con fuentes municipales y culturales.', image: '/photos/discover-experiences-triptych.png' },
      { title: 'Vida entre olivares', copy: 'Un espacio para entender la relación entre pueblo, sierra y campo.', image: '/photos/field-olivares-magina.webp' },
      { title: 'Agenda local', copy: 'Eventos y horarios aparecerán cuando haya una procedencia, fecha y revisión visibles.', image: '/photos/home-sierra-magina.webp' },
    ],
  },
};

export function DiscoverCollectionPage({ slug }: { slug: string }) {
  const collection = collections[slug as CollectionSlug] ?? collections.pueblos;
  const Icon = collection.icon;
  return <main className="discover-routes-shell discover-collection-shell" id="main-content">
    <VisualHeader />
    <a className="discover-routes-back" href="/descubre"><ArrowLeft aria-hidden="true" />Descubre Sierra Mágina</a>
    <section className="discover-collection-hero"><img src={collection.image} alt={collection.imageAlt} /><div><p className="eyebrow">{collection.eyebrow}</p><h1>{collection.title}</h1><p>{collection.intro}</p></div></section>
    <section className="discover-collection-intro card"><span><Icon aria-hidden="true" /></span><div><p className="eyebrow">GUÍA EN CONSTRUCCIÓN</p><h2>Descubre con información clara</h2><p>Estamos preparando las fichas con procedencia, fecha de revisión y datos útiles antes de publicar ubicaciones, horarios o reservas.</p></div></section>
    <section className="discover-routes-list discover-collection-list" aria-label={`Contenido de ${collection.title}`}>{collection.topics.map((topic) => <article className="discover-route-row card" key={topic.title}><img src={topic.image} alt="" /><span><strong>{topic.title}</strong><small>{topic.copy}</small></span><ArrowRight aria-hidden="true" /></article>)}</section>
    <section className="discover-routes-info card"><Trees aria-hidden="true" /><div><p className="eyebrow">INFORMACIÓN PÚBLICA</p><h2>Consulta entidades verificadas</h2><p>El directorio permite explorar comercios y servicios públicos; no implica integración ni disponibilidad de experiencias.</p></div><a href="/descubre/servicios" aria-label="Abrir directorio de servicios"><Compass aria-hidden="true" /></a></section>
  </main>;
}
