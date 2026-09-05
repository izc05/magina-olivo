import { useEffect, useState } from 'react';

type PublicSource = { key: string; provider: string; lastSuccessAt: string | null; lastCheckedAt: string | null; hasError: boolean };

const services = [
  ['Tiempo', 'Predicción AEMET por municipio, radar y ventana útil para planificar.', '/magina/tiempo', 'aemet'],
  ['Campo', 'Alertas generales RAIF y contexto fitosanitario con fuente visible.', '/magina/campo', 'raif'],
  ['Noticias', 'Actualidad verificada del olivar y Sierra Mágina.', '/magina/noticias', 'news'],
  ['Mercado', 'Contexto de aceite con fecha de comprobación, sin prometer liquidaciones.', '/magina/mercado', 'market'],
  ['Directorio', 'Cooperativas y almazaras de Sierra Mágina, con procedencia visible.', '/magina/directorio', 'directory'],
  ['Descubre', 'Pueblos, territorio y cultura del olivar desde una mirada local.', '/descubre', 'discover'],
] as const;

function sourceStatus(source: PublicSource | undefined): string {
  if (!source) return 'Información pública';
  if (source.hasError) return 'Fuente en revisión';
  return `Fuente: ${source.provider}`;
}

export function PublicHomePage() {
  const [sources, setSources] = useState<PublicSource[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/v1/public/sources', { headers: { accept: 'application/json' }, signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<{ items: PublicSource[] }>;
      })
      .then((result) => setSources(result.items))
      .catch(() => { /* The public routes remain useful offline or while sources refresh. */ });
    return () => controller.abort();
  }, []);

  return (
    <main className="public-home" id="main-content">
      <section className="public-home-hero" aria-labelledby="public-home-title">
        <img src="/brand/magina-olivo-mark.svg" alt="" />
        <p className="eyebrow">Sierra Mágina · Jaén</p>
        <h1 id="public-home-title">El olivar, más cerca de ti</h1>
        <p>Información útil para tu comarca y una forma clara de gestionar tus fincas cuando decidas crear tu cuenta.</p>
        <div className="public-home-actions"><a className="primary-button" href="/magina">Explorar Mágina</a><a className="secondary-button" href="/login?next=%2Fmi-campo">Gestionar mi olivar</a></div>
      </section>
      <section className="public-service-section" aria-labelledby="public-services-title">
        <div><p className="eyebrow">Información pública</p><h2 id="public-services-title">Hoy en Sierra Mágina</h2></div>
        <div className="public-service-grid">{services.map(([title, copy, href, sourceKey]) => <a className="card public-service-card" href={href} key={title}><p className="eyebrow">{sourceStatus(sources.find((source) => source.key.includes(sourceKey)))}</p><h3>{title}</h3><p>{copy}</p><span>Ver información</span></a>)}</div>
      </section>
      <section className="public-access-card card"><p className="eyebrow">Tu cuaderno de campo</p><h2>Cuando quieras, lleva tu olivar contigo.</h2><p>Fincas, parcelas, campañas, entregas y rendimientos permanecen siempre en tu área privada.</p><a className="text-button" href="/mi-campo">Gestionar mi olivar</a></section>
    </main>
  );
}
