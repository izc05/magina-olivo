import { PhotoCredit, VisualHeader } from './VisualChrome';
import { CloudSun, Compass, Factory, Newspaper } from 'lucide-react';

export function DiscoverPage() {
  return (
    <main className="discover-shell" id="main-content">
      <VisualHeader />
      <section className="discover-hero" aria-labelledby="discover-title">
        <p className="eyebrow">Descubre Sierra Mágina</p>
        <h1 id="discover-title">La tierra que da origen a nuestro aceite</h1>
        <p>Olivares, sierra, pueblos y cultura del aceite conectados con el territorio.</p>
      </section>
      <nav className="public-home-v2-quick" aria-label="Descubrir la comarca"><a href="/magina"><Compass aria-hidden="true" />Territorio</a><a href="/magina/directorio"><Factory aria-hidden="true" />Almazaras</a><a href="/magina/noticias"><Newspaper aria-hidden="true" />Noticias</a><a href="/magina/tiempo"><CloudSun aria-hidden="true" />El tiempo</a></nav>
      <section className="discover-grid" aria-label="Temas para descubrir"><article className="card"><p className="eyebrow">Para caminar</p><h2>Rutas y pueblos</h2><p>Estamos preparando una selección de rutas con recursos locales documentados. Todavía no hay itinerarios publicados.</p></article><a className="card" href="/magina/directorio"><p className="eyebrow">Cultura del olivar</p><h2>Patrimonio del aceite</h2><p>Conoce las cooperativas y almazaras de la comarca.</p><strong>Explorar el directorio</strong></a></section>
      <PhotoCredit />
    </main>
  );
}
