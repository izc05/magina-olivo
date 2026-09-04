import { useEffect, useMemo, useState } from 'react';
import type { Campaign, CampaignSummary, Holding } from './api';

type AppTab = 'home' | 'field' | 'campaign' | 'magina' | 'more';

type Municipality = {
  slug: string;
  name: string;
  aliases: string[];
};

type WeatherDay = {
  date: string;
  precipitationProbabilityPercent: number | null;
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
  windMaxKmh: number | null;
};

type WeatherResponse = {
  municipality: { slug: string; name: string; province: string };
  forecast: { elaboratedAt: string | null; days: WeatherDay[] };
  freshness: { status: 'fresh' | 'aging' | 'stale' | 'unknown'; ageHours: number | null };
  source: { attribution: string };
};

type NewsResponse = {
  source: { provider: string };
  items: Array<{
    id: string;
    title: string;
    publishedAt: string;
    topic: string | null;
    sourceUrl: string;
  }>;
};

type FieldAlertResponse = {
  source: {
    provider: string;
    sourceUpdatedAt: string | null;
  };
  freshness: { status: string; ageDays: number | null };
  scope: { crop: string; provinceFocus: string };
};

type RainAlertResponse = {
  enabled: boolean;
  thresholdPercent: number;
  items: Array<{
    id: string;
    municipalityName: string;
    forecastDate: string;
    precipitationProbabilityPercent: number;
  }>;
};

type PublicSourcesResponse = {
  items: Array<{
    key: string;
    provider: string;
    label: string;
    sourceUpdatedAt?: string | null;
    lastSuccessAt?: string | null;
    hasError: boolean;
    metadata?: Record<string, unknown>;
  }>;
};

type HomeData = {
  weather: WeatherResponse | null;
  news: NewsResponse | null;
  fieldAlerts: FieldAlertResponse | null;
  rainAlerts: RainAlertResponse | null;
  marketSource: PublicSourcesResponse['items'][number] | null;
};

function numberLabel(value: string | number | null | undefined, maximumFractionDigits = 1): string {
  const number = Number(value ?? 0);
  return Number.isFinite(number)
    ? new Intl.NumberFormat('es-ES', { maximumFractionDigits }).format(number)
    : '0';
}

function percentLabel(value: string | number | null | undefined): string {
  if (value == null) return '—';
  const number = Number(value);
  return Number.isFinite(number)
    ? `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(number)} %`
    : '—';
}

function normalizedPlace(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('es-ES');
}

function findMunicipalitySlug(items: Municipality[], requested: string | null | undefined): string | null {
  if (!items.length) return null;
  if (!requested) return items[0].slug;
  const normalizedRequested = normalizedPlace(requested);
  const match = items.find((item) => {
    const candidates = [item.name, ...item.aliases].map(normalizedPlace);
    return candidates.includes(normalizedRequested) || candidates.some((candidate) => normalizedRequested.includes(candidate) || candidate.includes(normalizedRequested));
  });
  return match?.slug ?? items[0].slug;
}

async function getJson<T>(url: string, signal: AbortSignal): Promise<T | null> {
  try {
    const response = await fetch(url, { headers: { accept: 'application/json' }, signal, credentials: 'include' });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch (reason) {
    if (reason instanceof DOMException && reason.name === 'AbortError') return null;
    return null;
  }
}

function dateShort(value: string | null | undefined): string {
  if (!value) return 'Fecha pendiente';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha pendiente';
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function weatherStatus(day: WeatherDay | undefined): string {
  if (!day) return 'Predicción no disponible';
  const rain = day.precipitationProbabilityPercent;
  if (rain != null && rain >= 60) return `Lluvia probable · ${rain}%`;
  if (rain != null && rain >= 30) return `Intervalos · lluvia ${rain}%`;
  return rain == null ? 'Predicción oficial' : `Baja probabilidad de lluvia · ${rain}%`;
}

function topicLabel(topic: string | null): string {
  if (topic === 'mercado-aceite') return 'Aceite y mercado';
  if (topic === 'pac-olivar') return 'PAC y olivar';
  if (topic === 'exportaciones-aove') return 'AOVE';
  if (topic === 'estrategia-olivar') return 'Sector del olivar';
  return 'Actualidad';
}

export function HomeDashboardV2({
  holding,
  campaign,
  summary,
  coverage,
  onNavigate,
}: {
  holding: Holding | null;
  campaign: Campaign | null;
  summary: CampaignSummary | null;
  coverage: number;
  onNavigate: (tab: AppTab) => void;
}) {
  const [data, setData] = useState<HomeData>({ weather: null, news: null, fieldAlerts: null, rainAlerts: null, marketSource: null });
  const [loadingPublic, setLoadingPublic] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingPublic(true);

    void (async () => {
      const [municipalityData, news, fieldAlerts, rainAlerts, publicSources] = await Promise.all([
        getJson<{ items: Municipality[] }>('/api/v1/public/municipalities', controller.signal),
        getJson<NewsResponse>('/api/v1/public/news', controller.signal),
        getJson<FieldAlertResponse>('/api/v1/public/field-alerts', controller.signal),
        getJson<RainAlertResponse>('/api/v1/account/rain-alerts', controller.signal),
        getJson<PublicSourcesResponse>('/api/v1/public/sources', controller.signal),
      ]);

      const slug = findMunicipalitySlug(municipalityData?.items ?? [], holding?.municipality);
      const weather = slug
        ? await getJson<WeatherResponse>(`/api/v1/public/weather?municipality=${encodeURIComponent(slug)}`, controller.signal)
        : null;
      const marketSource = publicSources?.items.find((item) => item.key.includes('market') || item.key.includes('price') || item.label.toLocaleLowerCase('es-ES').includes('aceite')) ?? publicSources?.items[0] ?? null;

      if (!controller.signal.aborted) {
        setData({ weather, news, fieldAlerts, rainAlerts, marketSource });
        setLoadingPublic(false);
      }
    })();

    return () => controller.abort();
  }, [holding?.municipality]);

  const today = data.weather?.forecast.days[0];
  const firstNews = data.news?.items[0];
  const firstRainAlert = data.rainAlerts?.items[0];
  const campaignLabel = campaign
    ? `${campaign.seasonStartYear}/${String(campaign.seasonEndYear).slice(-2)}`
    : 'actual';
  const pendingResults = summary?.pendingResultCount ?? 0;
  const fieldCopy = pendingResults > 0
    ? `${pendingResults} rendimiento${pendingResults === 1 ? '' : 's'} pendiente${pendingResults === 1 ? '' : 's'}`
    : 'Campaña al día';
  const weatherDetail = useMemo(() => {
    if (!today) return 'Consulta la previsión detallada';
    return `${weatherStatus(today)} · Máx. ${today.temperatureMaxC ?? '—'}° · Mín. ${today.temperatureMinC ?? '—'}°`;
  }, [today]);

  return (
    <div className="home-v2">
      <a className="home-v2-weather" href="/magina/tiempo" aria-label="Abrir meteorología detallada">
        <div className="home-v2-weather__landscape" aria-hidden="true">
          <span className="home-v2-weather__sun" />
          <span className="home-v2-weather__mountain home-v2-weather__mountain--back" />
          <span className="home-v2-weather__mountain home-v2-weather__mountain--front" />
          <span className="home-v2-weather__olive home-v2-weather__olive--one" />
          <span className="home-v2-weather__olive home-v2-weather__olive--two" />
          <span className="home-v2-weather__olive home-v2-weather__olive--three" />
        </div>
        <div className="home-v2-weather__card">
          <span>{data.weather?.municipality.name ?? holding?.municipality ?? 'Sierra Mágina'}</span>
          <strong>{today?.temperatureMaxC == null ? '—' : `${today.temperatureMaxC}°`}</strong>
          <small>{loadingPublic ? 'Actualizando previsión…' : weatherDetail}</small>
          <em>{data.weather?.source.attribution ?? 'AEMET'}</em>
        </div>
      </a>

      <section className="home-v2-section">
        <div className="home-v2-heading">
          <div><span>HOY EN TU CAMPO</span><h1>Tu olivar, de un vistazo</h1></div>
          <button type="button" onClick={() => onNavigate('field')}>Ver todo</button>
        </div>
        <button type="button" className="home-v2-field-card" onClick={() => onNavigate('field')}>
          <div className="home-v2-field-card__icon" aria-hidden="true">♧</div>
          <div><strong>{holding?.name ?? 'Tu explotación'}</strong><span>Campaña {campaignLabel} · {fieldCopy}</span></div>
          <span className={pendingResults > 0 ? 'home-v2-status home-v2-status--warning' : 'home-v2-status'}>{pendingResults > 0 ? '!' : '✓'}</span>
        </button>
      </section>

      <section className="home-v2-quick" aria-label="Accesos rápidos">
        <button type="button" onClick={() => onNavigate('field')}><span aria-hidden="true">▤</span><strong>Cuaderno</strong></button>
        <a href="/calendario"><span aria-hidden="true">□</span><strong>Tareas</strong></a>
        <button type="button" onClick={() => onNavigate('magina')}><span aria-hidden="true">♢</span><strong>Alertas</strong></button>
        <a href="/magina/tiempo"><span aria-hidden="true">☼</span><strong>Meteorología</strong></a>
      </section>

      <section className="home-v2-section">
        <div className="home-v2-heading">
          <div><span>ACEITE Y MERCADO</span><h2>Referencia del mercado</h2></div>
          <a href="/magina/mercado">Mercado</a>
        </div>
        <a className="home-v2-market-card" href="/magina/mercado">
          <div>
            <span>{data.marketSource?.provider ?? 'Observatorio de Precios y Mercados'}</span>
            <strong>{data.marketSource?.hasError ? 'Fuente en revisión' : 'Contexto actualizado'}</strong>
            <small>{data.marketSource ? `Última comprobación · ${dateShort(data.marketSource.lastSuccessAt ?? data.marketSource.sourceUpdatedAt)}` : 'Sin publicar un precio no verificado'}</small>
          </div>
          <svg viewBox="0 0 180 70" role="img" aria-label="Acceso a evolución del mercado">
            <path d="M6 56L34 47L59 50L88 34L114 39L141 22L174 15" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 56L34 47L59 50L88 34L114 39L141 22L174 15L174 65L6 65Z" fill="currentColor" opacity=".08" />
          </svg>
        </a>
      </section>

      <section className="home-v2-section">
        <div className="home-v2-heading">
          <div><span>ALERTAS</span><h2>Lo importante ahora</h2></div>
          <button type="button" onClick={() => onNavigate('magina')}>Ver todas</button>
        </div>
        <button type="button" className="home-v2-alert-card" onClick={() => onNavigate('magina')}>
          <span className="home-v2-alert-card__icon" aria-hidden="true">!</span>
          <div>
            <strong>{firstRainAlert ? `Lluvia prevista en ${firstRainAlert.municipalityName}` : `${data.fieldAlerts?.scope.crop ?? 'Olivar'} · ${data.fieldAlerts?.source.provider ?? 'alertas de campo'}`}</strong>
            <span>{firstRainAlert
              ? `${firstRainAlert.precipitationProbabilityPercent}% para ${dateShort(firstRainAlert.forecastDate)} · umbral personal ${data.rainAlerts?.thresholdPercent ?? '—'}%`
              : data.fieldAlerts
                ? `Fuente revisada ${dateShort(data.fieldAlerts.source.sourceUpdatedAt)} · ${data.fieldAlerts.scope.provinceFocus}`
                : 'Consulta avisos meteorológicos y fitosanitarios verificados.'}</span>
          </div>
        </button>
      </section>

      <section className="home-v2-section home-v2-section--last">
        <div className="home-v2-heading">
          <div><span>NOTICIAS DESTACADAS</span><h2>Mágina al día</h2></div>
          <a href="/magina/noticias">Más noticias</a>
        </div>
        <a className="home-v2-news-card" href={firstNews?.sourceUrl ?? '/magina/noticias'} target={firstNews ? '_blank' : undefined} rel={firstNews ? 'noreferrer' : undefined}>
          <div className="home-v2-news-card__visual" aria-hidden="true">M</div>
          <div>
            <span>{firstNews ? topicLabel(firstNews.topic) : 'Actualidad'}</span>
            <strong>{firstNews?.title ?? 'Consulta la actualidad verificada de Sierra Mágina y el olivar'}</strong>
            <small>{firstNews ? `${data.news?.source.provider ?? 'Fuente oficial'} · ${dateShort(firstNews.publishedAt)}` : 'Fuente y fecha visibles en cada noticia'}</small>
          </div>
        </a>
      </section>

      <section className="home-v2-campaign-strip" aria-label="Resumen de campaña">
        <div><span>Entregados</span><strong>{numberLabel(summary?.totalKilograms)} kg</strong></div>
        <div><span>Rendimiento</span><strong>{percentLabel(summary?.weightedYieldPercent)}</strong></div>
        <div><span>Cobertura</span><strong>{Math.round(coverage)}%</strong></div>
        <button type="button" onClick={() => onNavigate('campaign')}>Ver campaña →</button>
      </section>
    </div>
  );
}
