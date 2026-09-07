import { useEffect, useState } from 'react';
import { api, type Holding } from './api.ts';
import { ChevronRight, Sprout } from 'lucide-react';
import { PhotoCredit, VisualHeader, quickIcons } from './VisualChrome';

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
  const Icon = quickIcons[kind];
  return <Icon aria-hidden="true" strokeWidth={1.7} />;
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
      <VisualHeader />
      <section className="public-home-v2-hero" aria-label="Nuestra tierra"><div className="public-home-v2-photo" role="img" aria-label="Olivar de Sierra Mágina" /><a href="/magina/tiempo" className="public-home-weather-card" aria-live="polite"><span>{weatherTitle}</span><strong>{weatherTemperature}</strong><small>{weatherRange}</small>{weather ? <small>Máxima prevista · Fuente: AEMET</small> : <small>Consultar previsión <ChevronRight size={14} aria-hidden="true" /></small>}</a><div className="home-territory-caption"><p>Nuestra tierra,<br />tu mejor cosecha</p><small>Sierra Mágina</small></div></section>
      <section className="public-home-v2-section" aria-labelledby="public-home-title"><div className="section-heading"><div><p className="eyebrow">Hoy en tu campo</p><h1 id="public-home-title">Tu olivar, de un vistazo</h1></div><a className="text-button" href="/mi-campo">Ver todo</a></div><a className="public-home-field-card card" href="/mi-campo"><span className="public-home-field-icon" aria-hidden="true"><Sprout /></span><span><strong>{holding ? holding.name : 'Gestiona tu olivar'}</strong><small>{holding ? `${holding.municipality ?? 'Tu comarca'} · Datos privados` : 'El único espacio que requiere cuenta: tus fincas, tareas y campaña.'}</small></span><ChevronRight className="row-chevron" aria-hidden="true" /></a></section>
      <section className="public-home-v2-quick" aria-label="Accesos rápidos"><a href="/mi-campo"><QuickIcon kind="book" />Cuaderno</a><a href="/mi-campo"><QuickIcon kind="calendar" />Tareas</a><a href="/magina/campo"><QuickIcon kind="alert" />Alertas</a><a href="/magina/tiempo"><QuickIcon kind="weather" />Meteorología</a></section>
      <section className="public-home-v2-section"><div className="section-heading"><div><p className="eyebrow">Aceite y mercado</p><h2>Referencia AOVE</h2></div><a className="text-button" href="/magina/mercado">Mercado</a></div><a className="public-home-market-card card" href="/magina/mercado"><strong>Información pública</strong><span>Consulta contexto de mercado con fecha y procedencia.</span><span className="public-home-open">Abrir</span></a></section>
      <section className="public-service-section" aria-labelledby="public-services-title"><div><p className="eyebrow">Información pública</p><h2 id="public-services-title">Hoy en Sierra Mágina</h2></div><div className="public-service-grid">{services.map(([title, copy, href, sourceKey]) => <a className="card public-service-card" href={href} key={title}><p className="eyebrow">{sourceStatus(sources.find((source) => source.key.includes(sourceKey)))}</p><h3>{title}</h3><p>{copy}</p><span>Ver información</span></a>)}</div></section>
      <PhotoCredit />
    </main>
  );
}
