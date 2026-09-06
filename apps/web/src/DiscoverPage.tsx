import { ArrowRight, Compass, Mountain, Store, Utensils, Waypoints } from 'lucide-react';
import { VisualHeader } from './VisualChrome';

const highlights = [
  { title: 'Mar de Olivos', eyebrow: 'PAISAJE', meta: '7,8 km · Fácil', image: '/photos/home-sierra-magina.webp', position: 'center' },
  { title: 'Miradores de Mágina', eyebrow: 'SIERRA', meta: '10,4 km · Media', image: '/photos/field-olivares-magina.webp', position: 'center' },
  { title: 'Caminos de Jimena', eyebrow: 'PUEBLOS', meta: '6,2 km · Fácil', image: '/photos/discover-experiences-triptych.png', position: 'right' },
] as const;

export function DiscoverPage() {
  return (
    <main className="discover-territory-shell" id="main-content">
      <VisualHeader />
      <section className="discover-territory-intro" aria-labelledby="discover-title">
        <p className="eyebrow">DESCUBRE SIERRA MÁGINA</p>
        <h1 id="discover-title">La tierra que da origen a nuestro aceite</h1>
        <p>Olivares, sierra, pueblos y experiencias conectadas con el territorio.</p>
      </section>
      <section className="discover-territory-hero" aria-label="Sierra Mágina">
        <img src="/photos/home-sierra-magina.webp" alt="Olivares y montañas de Sierra Mágina" />
        <div><span>DESCUBRE SIERRA MÁGINA</span><h2>Naturaleza, tradición<br />y futuro en un mismo territorio.</h2></div>
      </section>
      <nav className="discover-territory-categories" aria-label="Explorar el territorio">
        <a href="/descubre/rutas"><Waypoints aria-hidden="true" />Rutas</a><a href="/descubre/miradores"><Mountain aria-hidden="true" />Miradores</a><a href="/descubre/gastronomia"><Utensils aria-hidden="true" />Gastronomía</a><a href="/descubre/oleoturismo"><Store aria-hidden="true" />Oleoturismo</a>
      </nav>
      <section className="discover-territory-section" aria-labelledby="routes-title"><div><p className="eyebrow">PARA CAMINAR</p><h2 id="routes-title">Rutas destacadas</h2></div><a href="/descubre/rutas">Ver todas</a></section>
      <section className="discover-territory-highlights" aria-label="Rutas destacadas">{highlights.map((item) => <a href="/descubre/rutas" className="discover-territory-row card" key={item.title}><img className={item.position} src={item.image} alt="" /><span><small>{item.eyebrow}</small><strong>{item.title}</strong><em>{item.meta}</em></span><ArrowRight aria-hidden="true" /></a>)}</section>
      <section className="discover-territory-section culture" aria-labelledby="culture-title"><div><p className="eyebrow">CULTURA Y TERRITORIO</p><h2 id="culture-title">Pueblos y experiencias</h2></div><a href="/descubre/servicios">Ver todas</a></section>
      <section className="discover-territory-experiences"><a className="card" href="/descubre/pueblos"><img className="right" src="/photos/discover-experiences-triptych.png" alt="" /><span><strong>Bedmar y Garcíez</strong><small>Historia, patrimonio y vida rural.</small></span><ArrowRight aria-hidden="true" /></a><a className="card" href="/descubre/oleoturismo"><img className="left" src="/photos/field-olivares-magina.webp" alt="" /><span><strong>Oleoturismo local</strong><small>Vive el origen del aceite de Mágina.</small></span><ArrowRight aria-hidden="true" /></a></section>
      <p className="discover-territory-note"><Compass aria-hidden="true" />Contenido de experiencia en preparación. Las rutas, horarios y reservas se publicarán con procedencia y fecha de revisión.</p>
    </main>
  );
}
