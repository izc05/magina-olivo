import { ArrowLeft, ArrowRight, Clock3, MapPin, Mountain, Route, Trees } from 'lucide-react';
import { useMemo, useState } from 'react';
import { VisualHeader } from './VisualChrome';

type Difficulty = 'Todas' | 'Fácil' | 'Media';
const routes = [
  { id: 'mar-olivos', title: 'Ruta Mar de Olivos', difficulty: 'Fácil' as const, distance: '7,8 km', duration: '2–3 h', elevation: '310 m', image: '/photos/home-sierra-magina.webp', imageClass: 'center' },
  { id: 'miradores-magina', title: 'Miradores de Mágina', difficulty: 'Media' as const, distance: '10,4 km', duration: '4–5 h', elevation: '760 m', image: '/photos/field-olivares-magina.webp', imageClass: 'center' },
  { id: 'caminos-jimena', title: 'Caminos de Jimena', difficulty: 'Fácil' as const, distance: '6,2 km', duration: '2 h', elevation: '120 m', image: '/photos/discover-experiences-triptych.png', imageClass: 'right' },
] as const;

export function DiscoverRoutesPage() {
  const [filter, setFilter] = useState<Difficulty>('Todas');
  const visible = useMemo(() => routes.filter((item) => filter === 'Todas' || item.difficulty === filter), [filter]);
  return <main className="discover-routes-shell" id="main-content">
    <VisualHeader />
    <a className="discover-routes-back" href="/descubre"><ArrowLeft aria-hidden="true" />Descubre Sierra Mágina</a>
    <section className="discover-routes-intro"><p className="eyebrow">RUTAS Y NATURALEZA</p><h1>Rutas por Sierra Mágina</h1><p>Senderos, naturaleza y paisajes únicos para conocer el olivar desde dentro.</p></section>
    <nav className="discover-routes-filters" aria-label="Filtrar rutas">{(['Todas', 'Fácil', 'Media'] as Difficulty[]).map((item) => <button type="button" className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} key={item}>{item}</button>)}</nav>
    <section className="discover-routes-list" aria-label="Rutas disponibles">{visible.map((item) => <a href={`/descubre/rutas/${item.id}`} className="discover-route-row card" key={item.id}><img className={item.imageClass} src={item.image} alt="" /><span><strong>{item.title}</strong><em className={item.difficulty.toLowerCase()}>{item.difficulty}</em><small><MapPin aria-hidden="true" />{item.distance}<Clock3 aria-hidden="true" />{item.duration}</small><small><Mountain aria-hidden="true" />{item.elevation} de desnivel</small></span><ArrowRight aria-hidden="true" /></a>)}</section>
    <section className="discover-routes-info card"><Trees aria-hidden="true" /><div><p className="eyebrow">CAMINA CON RESPETO</p><h2>Prepara tu ruta</h2><p>Las fichas completas, tracks y avisos de seguridad se activarán cuando la fuente territorial se encuentre verificada.</p></div><Route aria-hidden="true" /></section>
  </main>;
}

export function DiscoverRouteDetailPage({ routeId }: { routeId: string }) {
  const route = routes.find((item) => item.id === routeId) ?? routes[0];
  const [started, setStarted] = useState(false);
  return <main className="discover-routes-shell discover-route-detail" id="main-content">
    <VisualHeader />
    <a className="discover-routes-back" href="/descubre/rutas"><ArrowLeft aria-hidden="true" />Rutas por Sierra Mágina</a>
    <article className="discover-route-detail-card card">
      <img className={route.imageClass} src={route.image} alt="Paisaje de Sierra Mágina" />
      <div><span>{route.difficulty}</span><h1>{route.title}</h1><p>Una propuesta para descubrir paisajes de olivar y la sierra con calma.</p><dl><div><MapPin aria-hidden="true" /><dt>Distancia</dt><dd>{route.distance}</dd></div><div><Clock3 aria-hidden="true" /><dt>Duración</dt><dd>{route.duration}</dd></div><div><Mountain aria-hidden="true" /><dt>Desnivel</dt><dd>{route.elevation}</dd></div></dl><button type="button" className={started ? 'started' : ''} onClick={() => setStarted((value) => !value)}>{started ? 'Ruta iniciada · detener' : 'Iniciar ruta'}</button></div>
    </article>
    <section className="discover-route-detail-copy card"><p className="eyebrow">DESCRIPCIÓN</p><h2>Una ruta para mirar el territorio</h2><p>El detalle de puntos, navegación y track se publicará cuando su fuente territorial esté verificada. Por ahora esta vista permite valorar la propuesta sin atribuirle datos GPS inexistentes.</p></section>
  </main>;
}
