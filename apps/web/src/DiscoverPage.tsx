export function DiscoverPage() {
  return (
    <main className="discover-shell" id="main-content">
      <section className="discover-hero" aria-labelledby="discover-title">
        <img src="/brand/magina-olivo-mark.svg" alt="" />
        <p className="eyebrow">Sierra Mágina</p>
        <h1 id="discover-title">Descubre el territorio del olivar</h1>
        <p>Rutas, pueblos, naturaleza y cultura del aceite. Esta selección irá incorporando recursos territoriales con procedencia documentada.</p>
      </section>
      <section className="discover-grid" aria-label="Temas para descubrir"><article className="card"><h2>Rutas y pueblos</h2><p>Una guía territorial se publicará únicamente con recursos locales aprobados.</p></article><article className="card"><h2>Patrimonio del aceite</h2><p>Conoce la comarca sin convertir Mágina Olivo en una plataforma publicitaria.</p></article></section>
    </main>
  );
}
