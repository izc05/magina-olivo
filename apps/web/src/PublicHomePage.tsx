import { useEffect, useState } from 'react';
import { api, type Holding } from './api.ts';

type PublicSource = { key: string; provider: string; hasError: boolean };
type WeatherDay = { temperatureMinC: number | null; temperatureMaxC: number | null };
type Weather = { municipality: { name: string }; forecast: { days: WeatherDay[] } };

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

function QuickIcon({ kind }: { kind: 'book' | 'calendar' | 'alert' | 'weather' }) {
  const content = kind === 'book' ? <><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M8 20V7a3 3 0 0 1 3-3"/></> : kind === 'calendar' ? <><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></> : kind === 'alert' ? <><path d="m12 4 9 16H3z"/><path d="M12 9v5M12 17h.01"/></> : <><path d="M7 18h10a4 4 0 0 0 .5-8A5.5 5.5 0 0 0 7 9a4.5 4.5 0 0 0 0 9Z"/><path d="M12 3v3M5 6l2 2M19 6l-2 2"/></>;
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{content}</svg>;
}

export function PublicHomePage() {
  const [sources, setSources] = useState<PublicSource[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [holding, setHolding] = useState<Holding | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/v1/public/sources', { headers: { accept: 'application/json' }, signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ items: PublicSource[] }> : Promise.reject(new Error('sources')))
      .then((result) => setSources(result.items)).catch(() => undefined);
    void fetch('/api/v1/public/weather?municipality=huelma', { headers: { accept: 'application/json' }, signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<Weather> : Promise.reject(new Error('weather')))
      .then(setWeather).catch(() => undefined);
    void api.me().then(() => api.holdings()).then((result) => setHolding(result.items[0] ?? null)).catch(() => setHolding(null));
    return () => controller.abort();
  }, []);

  const today = weather?.forecast.days[0];
  const weatherTitle = weather?.municipality.name ?? 'Meteorología';
  const weatherTemperature = today?.temperatureMaxC == null ? '—' : `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(today.temperatureMaxC)}°`;
  const weatherRange = today?.temperatureMinC == null ? 'Predicción no disponible' : `Máx. ${weatherTemperature} · Mín. ${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(today.temperatureMinC)}°`;

  return (
    <main className="public-home public-home-v2" id="main-content">
      <header className="public-home-topbar"><a className="public-home-brand" href="/" aria-label="Mágina Olivo, Inicio"><img src="/brand/magina-olivo-mark.svg" alt="" /><span><strong>Mágina Olivo</strong><small>La herramienta digital del olivar</small></span></a><a className="public-home-profile" href={holding ? '/mi-magina' : '/login'} aria-label={holding ? 'Abrir Mi Mágina' : 'Iniciar sesión'}>{holding ? (holding.name[0] ?? 'M') : 'M'}</a></header>
      <section className="public-home-v2-hero" aria-labelledby="public-home-title"><div className="public-home-v2-photo" role="img" aria-label="Olivar de Sierra Mágina" /><div className="public-home-weather-card" aria-live="polite"><span>{weatherTitle}</span><strong>{weatherTemperature}</strong><small>{weatherRange}</small>{weather ? <small>Fuente: AEMET</small> : null}</div></section>
      <section className="public-home-v2-section" aria-labelledby="public-home-title"><div className="section-heading"><div><p className="eyebrow">Hoy en tu campo</p><h1 id="public-home-title">Tu olivar, de un vistazo</h1></div><a className="text-button" href={holding ? '/mi-campo' : '/login?next=%2Fmi-campo'}>Ver todo</a></div><a className="public-home-field-card card" href={holding ? '/mi-campo' : '/login?next=%2Fmi-campo'}><span className="public-home-field-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 20c7 0 13-4 16-14-8 1-14 6-16 14Z"/><path d="M4 20c3-5 7-8 12-11"/></svg></span><span><strong>{holding ? holding.name : 'Gestiona tu olivar'}</strong><small>{holding ? `${holding.municipality ?? 'Tu comarca'} · Datos privados` : 'Inicia sesión o crea una cuenta para gestionar tu olivar.'}</small></span><span className="public-home-open">Abrir</span></a></section>
      <section className="public-home-v2-quick" aria-label="Accesos rápidos"><a href={holding ? '/mi-campo' : '/login?next=%2Fmi-campo'}><QuickIcon kind="book" />Cuaderno</a><a href={holding ? '/calendario' : '/login?next=%2Fcalendario'}><QuickIcon kind="calendar" />Tareas</a><a href="/magina/campo"><QuickIcon kind="alert" />Alertas</a><a href="/magina/tiempo"><QuickIcon kind="weather" />Meteorología</a></section>
      <section className="public-home-v2-section"><div className="section-heading"><div><p className="eyebrow">Aceite y mercado</p><h2>Referencia AOVE</h2></div><a className="text-button" href="/magina/mercado">Mercado</a></div><a className="public-home-market-card card" href="/magina/mercado"><strong>Información pública</strong><span>Consulta contexto de mercado con fecha y procedencia.</span><span className="public-home-open">Abrir</span></a></section>
      <section className="public-service-section" aria-labelledby="public-services-title"><div><p className="eyebrow">Información pública</p><h2 id="public-services-title">Hoy en Sierra Mágina</h2></div><div className="public-service-grid">{services.map(([title, copy, href, sourceKey]) => <a className="card public-service-card" href={href} key={title}><p className="eyebrow">{sourceStatus(sources.find((source) => source.key.includes(sourceKey)))}</p><h3>{title}</h3><p>{copy}</p><span>Ver información</span></a>)}</div></section>
    </main>
  );
}
