import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { api, type Holding } from './api.ts';
import { Building2, ChevronRight, CloudRain, CloudSun, Landmark, MapPin, Newspaper, Sprout, Store, Sun, X } from 'lucide-react';
import { PhotoCredit, VisualHeader, quickIcons } from './VisualChrome';
import {
  DEFAULT_MUNICIPALITY_SLUG,
  DEFAULT_TERRITORY_HERO,
  MUNICIPALITY_VISUALS,
  municipalityHeroSources,
  municipalityVisual,
  readPreferredMunicipality,
  resolveMunicipalitySlug,
  writePreferredMunicipality,
} from './municipality-visuals';
import './municipality-hero.css';

type PublicSource = { key: string; provider: string; hasError: boolean };
type WeatherDay = { temperatureMinC: number | null; temperatureMaxC: number | null; precipitationProbabilityPercent: number | null };
type Weather = { municipality: { slug?: string; name: string }; forecast: { days: WeatherDay[] } };
type WeatherHour = { dateTime: string; precipitationProbabilityPercent: number | null; temperatureC: number | null };
type HourlyWeather = { forecast: { elaboratedAt: string | null; hours: WeatherHour[] } };

const WEATHER_REFRESH_MS = 10 * 60 * 1000;

function closestWeatherHour(hours: WeatherHour[]): WeatherHour | null {
  const now = Date.now();
  return hours.reduce<WeatherHour | null>((closest, hour) => {
    const time = new Date(hour.dateTime).getTime();
    if (!Number.isFinite(time)) return closest;
    if (!closest) return hour;
    return Math.abs(time - now) < Math.abs(new Date(closest.dateTime).getTime() - now) ? hour : closest;
  }, null);
}

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
  const [initialMunicipality] = useState(readPreferredMunicipality);
  const [selectedMunicipality, setSelectedMunicipality] = useState(initialMunicipality ?? DEFAULT_MUNICIPALITY_SLUG);
  const [municipalityDraft, setMunicipalityDraft] = useState(initialMunicipality ?? DEFAULT_MUNICIPALITY_SLUG);
  const [showMunicipalitySetup, setShowMunicipalitySetup] = useState(initialMunicipality === null);
  const [municipalitySetupRequired, setMunicipalitySetupRequired] = useState(initialMunicipality === null);
  const selectionIsExplicit = useRef(initialMunicipality !== null);
  const [sources, setSources] = useState<PublicSource[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [hourlyWeather, setHourlyWeather] = useState<HourlyWeather | null>(null);
  const [holding, setHolding] = useState<Holding | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/v1/public/sources', { headers: { accept: 'application/json' }, signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ items: PublicSource[] }> : Promise.reject(new Error('sources')))
      .then((result) => setSources(result.items)).catch(() => undefined);
    void api.me().then(() => api.holdings()).then((result) => {
      const nextHolding = result.items[0] ?? null;
      setHolding(nextHolding);
      if (!selectionIsExplicit.current) {
        const holdingMunicipality = resolveMunicipalitySlug(nextHolding?.municipality);
        if (holdingMunicipality) {
          setSelectedMunicipality(holdingMunicipality);
          setMunicipalityDraft(holdingMunicipality);
          writePreferredMunicipality(holdingMunicipality);
          setShowMunicipalitySetup(false);
          setMunicipalitySetupRequired(false);
        }
      }
    }).catch(() => setHolding(null));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let controller = new AbortController();
    setWeather(null);
    setHourlyWeather(null);
    const loadWeather = () => {
      controller.abort();
      controller = new AbortController();
      const options = { headers: { accept: 'application/json' }, signal: controller.signal, cache: 'no-store' as RequestCache };
      void Promise.allSettled([
        fetch(`/api/v1/public/weather?municipality=${encodeURIComponent(selectedMunicipality)}`, options).then((response) => response.ok ? response.json() as Promise<Weather> : Promise.reject()),
        fetch(`/api/v1/public/weather/hourly?municipality=${encodeURIComponent(selectedMunicipality)}`, options).then((response) => response.ok ? response.json() as Promise<HourlyWeather> : Promise.reject()),
      ]).then(([daily, hourly]) => {
        if (daily.status === 'fulfilled') setWeather(daily.value);
        if (hourly.status === 'fulfilled') setHourlyWeather(hourly.value);
      });
    };
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') loadWeather(); };
    loadWeather();
    const timer = window.setInterval(loadWeather, WEATHER_REFRESH_MS);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('online', loadWeather);
    return () => { controller.abort(); window.clearInterval(timer); document.removeEventListener('visibilitychange', refreshWhenVisible); window.removeEventListener('online', loadWeather); };
  }, [selectedMunicipality]);

  const selectedVisual = municipalityVisual(selectedMunicipality);
  const heroSources = municipalityHeroSources(selectedVisual);
  const heroStyle = {
    '--municipality-desktop-position': selectedVisual.objectPositionDesktop,
    '--municipality-mobile-position': selectedVisual.objectPositionMobile,
  } as CSSProperties;
  const today = weather?.forecast.days[0];
  const currentHour = closestWeatherHour(hourlyWeather?.forecast.hours ?? []);
  const weatherTitle = selectedVisual.name;
  const currentTemperature = currentHour?.temperatureC ?? null;
  const weatherTemperature = currentTemperature == null ? '—' : `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(currentTemperature)}°`;
  const weatherRange = today?.temperatureMinC == null || today.temperatureMaxC == null ? 'Predicción no disponible' : `Máx. ${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(today.temperatureMaxC)}° · Mín. ${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(today.temperatureMinC)}°`;
  const currentRain = currentHour?.precipitationProbabilityPercent ?? today?.precipitationProbabilityPercent ?? 0;
  const weatherMood = currentRain >= 55 ? 'rainy' : currentRain >= 25 ? 'partly' : 'sunny';
  const nearby = [
    { title: 'Ayuntamiento', copy: `Información y trámites de ${weatherTitle}`, href: '/descubre/servicios', icon: Landmark, tone: 'gold' },
    { title: 'Cooperativas', copy: `Almazaras cercanas a ${weatherTitle}`, href: '/magina/directorio', icon: Building2, tone: 'green' },
    { title: 'Servicios útiles', copy: 'Farmacias, talleres y suministros', href: '/descubre/servicios', icon: Store, tone: 'blue' },
    { title: 'Noticias locales', copy: 'Actualidad agraria verificada', href: '/magina/noticias', icon: Newspaper, tone: 'olive' },
  ] as const;

  const selectMunicipality = (slug: string) => {
    selectionIsExplicit.current = true;
    setSelectedMunicipality(slug);
    writePreferredMunicipality(slug);
    setShowMunicipalitySetup(false);
    setMunicipalitySetupRequired(false);
  };

  const WeatherIcon = weatherMood === 'rainy' ? CloudRain : weatherMood === 'partly' ? CloudSun : Sun;

  const useHeroFallback = (image: HTMLImageElement) => {
    if (image.src.endsWith(DEFAULT_TERRITORY_HERO)) return;
    image.parentElement?.querySelector('source')?.remove();
    image.src = DEFAULT_TERRITORY_HERO;
    image.alt = 'Olivares y montañas de Sierra Mágina';
  };

  return (
    <main className="public-home public-home-v2" id="main-content">
      <VisualHeader />
      <section className={`public-home-v2-hero ${weatherMood}`} aria-label={`Nuestra tierra: ${selectedVisual.name}`}>
        <picture className="public-home-v2-photo" style={heroStyle}>
          <source media="(max-width: 719px)" srcSet={heroSources.mobile} />
          <img key={selectedVisual.slug} src={heroSources.desktop} alt={heroSources.alt} onError={(event) => useHeroFallback(event.currentTarget)} />
        </picture>
        <button className="public-home-municipality-picker" type="button" onClick={() => { setMunicipalityDraft(selectedMunicipality); setShowMunicipalitySetup(true); }} aria-label={`Cambiar municipio. Actual: ${selectedVisual.name}`}>
          <MapPin size={16} aria-hidden="true" />
          <span>{selectedVisual.name}</span><small>Cambiar</small>
        </button>
        <a href="/magina/tiempo" className={`public-home-weather-card ${weatherMood}`} aria-live="polite"><WeatherIcon className="weather-hero-icon" aria-hidden="true" /><span>Ahora en {weatherTitle}</span><strong>{weatherTemperature}</strong><small>{weatherRange}</small>{hourlyWeather ? <small>Previsión horaria AEMET · automática <ChevronRight size={14} aria-hidden="true" /></small> : <small>Consultar previsión <ChevronRight size={14} aria-hidden="true" /></small>}</a>
        <div className="home-territory-caption"><p>Nuestra tierra,<br />tu mejor cosecha</p><small>{selectedVisual.name} · Sierra Mágina</small></div>
      </section>
      <section className="home-highlight-grid" aria-label={`Resumen de ${selectedVisual.name}`}>
        <a className="home-highlight weather" href="/magina/tiempo"><span>Ahora en {weatherTitle}</span><strong>{weatherTemperature}</strong><small>{currentHour?.precipitationProbabilityPercent == null ? 'Consulta la previsión' : `${currentHour.precipitationProbabilityPercent}% prob. lluvia ahora`}</small></a>
        <a className="home-highlight market" href="/magina/mercado"><span>AOVE y mercado</span><strong>Ver evolución</strong><i aria-hidden="true"><b /><b /><b /><b /><b /></i><small>Datos públicos con fecha</small></a>
        <a className="home-highlight territory" href="/descubre"><span>Descubre</span><strong>{selectedVisual.name}</strong><small>Sierra Mágina, rutas y aceite</small></a>
      </section>
      <section className="public-home-v2-section" aria-labelledby="public-home-title"><div className="section-heading"><div><p className="eyebrow">Hoy en tu campo</p><h1 id="public-home-title">Tu olivar, de un vistazo</h1></div><a className="text-button" href="/mi-campo">Ver todo</a></div><a className="public-home-field-card card" href="/mi-campo"><span className="public-home-field-icon" aria-hidden="true"><Sprout /></span><span><strong>{holding ? holding.name : 'Gestiona tu olivar'}</strong><small>{holding ? `${holding.municipality ?? 'Tu comarca'} · Datos privados` : 'El único espacio que requiere cuenta: tus fincas, tareas y campaña.'}</small></span><ChevronRight className="row-chevron" aria-hidden="true" /></a></section>
      <section className="public-home-v2-quick" aria-label="Accesos rápidos"><a href="/mi-campo"><QuickIcon kind="book" />Cuaderno</a><a href="/calendario"><QuickIcon kind="calendar" />Tareas</a><a href="/magina/campo"><QuickIcon kind="alert" />Alertas</a><a href="/magina/tiempo"><QuickIcon kind="weather" />Meteorología</a></section>
      <section className="public-home-nearby" aria-labelledby="nearby-title"><div className="section-heading"><div><p className="eyebrow">A tu alrededor</p><h2 id="nearby-title">Cerca de {weatherTitle}</h2></div><a className="text-button" href="/descubre/servicios">Ver mapa <MapPin size={15} aria-hidden="true" /></a></div><div className="public-home-nearby-grid">{nearby.map(({ title, copy, href, icon: Icon, tone }) => <a className={`public-home-nearby-card ${tone}`} href={href} key={title}><span className="nearby-icon"><Icon aria-hidden="true" /></span><span><strong>{title}</strong><small>{copy}</small></span><ChevronRight aria-hidden="true" /></a>)}</div></section>
      <section className="public-home-v2-section"><div className="section-heading"><div><p className="eyebrow">Aceite y mercado</p><h2>Referencia AOVE</h2></div><a className="text-button" href="/magina/mercado">Mercado</a></div><a className="public-home-market-card card" href="/magina/mercado"><strong>Información pública</strong><span>Consulta contexto de mercado con fecha y procedencia.</span><span className="public-home-open">Abrir</span></a></section>
      <section className="public-service-section" aria-labelledby="public-services-title"><div><p className="eyebrow">Información pública</p><h2 id="public-services-title">Hoy en Sierra Mágina</h2></div><div className="public-service-grid">{services.map(([title, copy, href, sourceKey]) => <a className="card public-service-card" href={href} key={title}><p className="eyebrow">{sourceStatus(sources.find((source) => source.key.includes(sourceKey)))}</p><h3>{title}</h3><p>{copy}</p><span>Ver información</span></a>)}</div></section>
      <PhotoCredit />
      {showMunicipalitySetup ? <div className="municipality-setup-backdrop" role="presentation"><section className="municipality-setup" role="dialog" aria-modal="true" aria-labelledby="municipality-setup-title">{!municipalitySetupRequired ? <button type="button" className="municipality-setup-close" aria-label="Cerrar selección de municipio" onClick={() => setShowMunicipalitySetup(false)}><X aria-hidden="true" /></button> : null}<p className="eyebrow">PERSONALIZA MÁGINA OLIVO</p><h2 id="municipality-setup-title">¿Cuál es tu municipio?</h2><p>Lo usaremos para mostrarte el tiempo, noticias, cooperativas y servicios cercanos. Podrás cambiarlo después.</p><label htmlFor="initial-municipality">Municipio de referencia</label><select id="initial-municipality" value={municipalityDraft} onChange={(event) => setMunicipalityDraft(event.currentTarget.value)}>{MUNICIPALITY_VISUALS.map((municipality) => <option value={municipality.slug} key={municipality.slug}>{municipality.name}</option>)}</select><button className="primary-button" type="button" onClick={() => selectMunicipality(municipalityDraft)}>Guardar y continuar</button><small>Esta elección se guarda en este dispositivo y, al crear tu explotación, queda vinculada a tu perfil agrícola.</small></section></div> : null}
    </main>
  );
}
