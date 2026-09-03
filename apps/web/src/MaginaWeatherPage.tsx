import { useEffect, useMemo, useState } from 'react';
import './weather-radar.css';

type Municipality = {
  slug: string;
  name: string;
  province: string;
  aliases: string[];
  checkedAt: string;
};

type WeatherDay = {
  date: string;
  precipitationProbabilityPercent: number | null;
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
  windMaxKmh: number | null;
};

type WeatherFreshness = {
  status: 'fresh' | 'aging' | 'stale' | 'unknown';
  ageHours: number | null;
};

type WeatherResponse = {
  municipality: { slug: string; name: string; province: string };
  forecast: {
    provider: string;
    elaboratedAt: string | null;
    days: WeatherDay[];
  };
  freshness: WeatherFreshness;
  availability: {
    mode: 'live' | 'cache' | 'degraded-cache';
  };
  source: {
    label: string;
    attribution: string;
    scopeNote: string;
  };
};

type RadarFrame = {
  id: string;
  capturedAt: string;
  imageUrl: string;
};

type RadarResponse = {
  items: RadarFrame[];
  playback: {
    automatic: boolean;
    frameCount: number;
    scope: string;
  };
  source: {
    provider: string;
    product: string;
    attribution: string;
    note: string;
  };
};

function valueOrDash(value: number | null, suffix: string): string {
  return value == null ? '—' : `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(value)}${suffix}`;
}

function dayLabel(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(parsed);
}

function radarTimeLabel(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? 'Hora no disponible'
    : new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
}

function freshnessCopy(freshness: WeatherFreshness): { label: string; detail: string } {
  const age = freshness.ageHours == null
    ? null
    : new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(freshness.ageHours);

  switch (freshness.status) {
    case 'fresh':
      return {
        label: 'Actualizada',
        detail: age == null ? 'Predicción reciente de AEMET.' : `Predicción elaborada hace aproximadamente ${age} h.`,
      };
    case 'aging':
      return {
        label: 'Revisar fecha',
        detail: age == null ? 'Comprueba la hora de elaboración antes de planificar.' : `La predicción tiene aproximadamente ${age} h. Comprueba la hora de elaboración.`,
      };
    case 'stale':
      return {
        label: 'Predicción desactualizada',
        detail: age == null ? 'No la uses como referencia actual sin contrastarla.' : `La predicción tiene aproximadamente ${age} h. Contrástala antes de organizar labores.`,
      };
    default:
      return {
        label: 'Fecha no disponible',
        detail: 'AEMET no ha proporcionado una hora de elaboración utilizable; no asumimos que el dato sea reciente.',
      };
  }
}

export function MaginaWeatherPage() {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [selectedSlug, setSelectedSlug] = useState('huelma');
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [radar, setRadar] = useState<RadarResponse | null>(null);
  const [radarIndex, setRadarIndex] = useState(0);
  const [radarPlaying, setRadarPlaying] = useState(false);
  const [radarLoading, setRadarLoading] = useState(true);
  const [radarError, setRadarError] = useState<string | null>(null);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(true);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingMunicipalities(true);

    void fetch('/api/v1/public/municipalities', {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<{ items: Municipality[] }>;
    }).then((result) => {
      setMunicipalities(result.items);
      if (!result.items.some((item) => item.slug === selectedSlug) && result.items[0]) {
        setSelectedSlug(result.items[0].slug);
      }
    }).catch((reason) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError('No se ha podido cargar la lista de municipios.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingMunicipalities(false);
    });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedSlug || loadingMunicipalities) return;
    const controller = new AbortController();
    setLoadingWeather(true);
    setError(null);

    void fetch(`/api/v1/public/weather?municipality=${encodeURIComponent(selectedSlug)}`, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    }).then(async (response) => {
      if (response.ok) return response.json() as Promise<WeatherResponse>;

      let code = '';
      try {
        const body = await response.json() as { error?: { code?: string } };
        code = body.error?.code ?? '';
      } catch {
        // Keep generic fallback.
      }
      if (code === 'WEATHER_PROVIDER_NOT_CONFIGURED') {
        throw new Error('AEMET_NOT_CONFIGURED');
      }
      throw new Error(`HTTP ${response.status}`);
    }).then((result) => {
      setWeather(result);
    }).catch((reason) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setWeather(null);
      setError(reason instanceof Error && reason.message === 'AEMET_NOT_CONFIGURED'
        ? 'La conexión con AEMET está preparada, pero la clave server-side todavía no está configurada en este entorno.'
        : 'La predicción de AEMET no está disponible temporalmente.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingWeather(false);
    });

    return () => controller.abort();
  }, [selectedSlug, loadingMunicipalities]);

  useEffect(() => {
    let active = true;

    const loadRadar = async () => {
      try {
        const response = await fetch('/api/v1/public/weather/radar/frames', {
          headers: { accept: 'application/json' },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json() as RadarResponse;
        if (!active) return;
        setRadar(result);
        setRadarIndex(result.items.length > 0 ? result.items.length - 1 : 0);
        setRadarError(null);
      } catch {
        if (!active) return;
        setRadarError('El radar de lluvia no está disponible temporalmente.');
      } finally {
        if (active) setRadarLoading(false);
      }
    };

    void loadRadar();
    const refreshTimer = window.setInterval(() => void loadRadar(), 5 * 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    if (!radarPlaying || !radar || radar.items.length < 2) return;

    const playbackTimer = window.setInterval(() => {
      setRadarIndex((current) => (current + 1) % radar.items.length);
    }, 900);

    return () => window.clearInterval(playbackTimer);
  }, [radarPlaying, radar]);

  const selectedMunicipality = useMemo(
    () => municipalities.find((item) => item.slug === selectedSlug) ?? null,
    [municipalities, selectedSlug],
  );
  const freshness = weather ? freshnessCopy(weather.freshness) : null;
  const degraded = weather?.availability.mode === 'degraded-cache';
  const radarFrame = radar?.items[radarIndex] ?? null;
  const radarFrameCount = radar?.items.length ?? 0;

  return (
    <main className="weather-shell" id="main-content">
      <header className="directory-header">
        <a className="directory-brand" href="/" aria-label="Volver a Mágina Olivo">
          <img src="/brand/magina-olivo-mark.svg" alt="" />
          <span><strong>Mágina Olivo</strong><small>Sierra Mágina · Jaén</small></span>
        </a>
        <a className="directory-back" href="/">Volver a la aplicación</a>
      </header>

      <section className="weather-hero" aria-labelledby="weather-title">
        <p className="eyebrow">Mágina · Tiempo</p>
        <h1 id="weather-title">El tiempo en tu zona</h1>
        <p>Predicción municipal oficial para organizar el día de campo con contexto, sin convertir el tiempo en una recomendación agronómica automática.</p>
      </section>

      <section className="weather-selector card" aria-label="Seleccionar municipio">
        <div className="field">
          <label htmlFor="weather-municipality">Municipio</label>
          <select
            id="weather-municipality"
            value={selectedSlug}
            disabled={loadingMunicipalities || municipalities.length === 0}
            onChange={(event) => setSelectedSlug(event.target.value)}
          >
            {municipalities.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}{item.aliases.length ? ` · incluye ${item.aliases.join(', ')}` : ''}
              </option>
            ))}
          </select>
        </div>
        {selectedMunicipality ? (
          <p className="weather-selector-note">{selectedMunicipality.name} · {selectedMunicipality.province}</p>
        ) : null}
      </section>

      <section className="weather-results" aria-live="polite" aria-busy={loadingWeather}>
        <div className="weather-results-heading">
          <div>
            <h2>{weather?.municipality.name ?? selectedMunicipality?.name ?? 'Predicción'}</h2>
            <p>{loadingWeather ? 'Consultando AEMET…' : 'Previsión de hasta 7 días'}</p>
          </div>
          <span className="badge gold">AEMET</span>
        </div>

        {error ? <div className="alert" role="status">{error}</div> : null}
        {degraded ? (
          <div className="alert" role="status">
            <strong>AEMET no responde ahora.</strong> Mostramos temporalmente la última predicción disponible porque todavía está dentro del límite de frescura permitido. Revisa su fecha antes de organizar labores sensibles al tiempo.
          </div>
        ) : null}

        {weather ? (
          <>
            <div className="weather-grid">
              {weather.forecast.days.map((day) => (
                <article className="card weather-day" key={day.date}>
                  <h3>{dayLabel(day.date)}</h3>
                  <div className="weather-temperature">
                    <strong>{valueOrDash(day.temperatureMaxC, '°')}</strong>
                    <span>{valueOrDash(day.temperatureMinC, '°')}</span>
                  </div>
                  <dl>
                    <div><dt>Lluvia</dt><dd>{valueOrDash(day.precipitationProbabilityPercent, '%')}</dd></div>
                    <div><dt>Viento máx.</dt><dd>{valueOrDash(day.windMaxKmh, ' km/h')}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
            <div className="weather-source card">
              <p><strong>Estado:</strong> {freshness?.label ?? 'Fecha no disponible'}</p>
              {freshness ? <p>{freshness.detail}</p> : null}
              <p><strong>Fuente:</strong> {weather.source.attribution} · {weather.source.label}</p>
              <p>{weather.source.scopeNote}</p>
              {weather.forecast.elaboratedAt ? <p>Predicción elaborada: {new Date(weather.forecast.elaboratedAt).toLocaleString('es-ES')}</p> : null}
            </div>
          </>
        ) : null}
      </section>

      <section className="weather-radar-section" aria-labelledby="weather-radar-title">
        <div className="weather-results-heading">
          <div>
            <p className="eyebrow">Movimiento reciente</p>
            <h2 id="weather-radar-title">Radar de lluvia</h2>
            <p>Observa cómo se desplazan las zonas de precipitación en los últimos fotogramas disponibles.</p>
          </div>
          <span className="badge gold">AEMET</span>
        </div>

        {radarError ? <div className="alert" role="status">{radarError}</div> : null}

        <div className="card weather-radar-card" aria-busy={radarLoading}>
          {radarLoading ? (
            <div className="weather-radar-empty">Cargando radar de lluvia…</div>
          ) : radarFrame ? (
            <>
              <div className="weather-radar-viewport">
                <img
                  key={radarFrame.id}
                  className="weather-radar-image"
                  src={radarFrame.imageUrl}
                  alt="Composición nacional del radar de precipitación de AEMET"
                />
                <span className="weather-radar-time">{radarTimeLabel(radarFrame.capturedAt)}</span>
              </div>

              <div className="weather-radar-controls">
                <button
                  type="button"
                  className="secondary-button weather-radar-play"
                  disabled={radarFrameCount < 2}
                  aria-pressed={radarPlaying}
                  onClick={() => setRadarPlaying((playing) => !playing)}
                >
                  {radarPlaying ? '⏸ Pausar' : '▶ Reproducir'}
                </button>
                <div className="weather-radar-timeline">
                  <label htmlFor="weather-radar-frame">
                    Fotograma {radarIndex + 1} de {radarFrameCount}
                  </label>
                  <input
                    id="weather-radar-frame"
                    type="range"
                    min="0"
                    max={Math.max(0, radarFrameCount - 1)}
                    step="1"
                    value={radarIndex}
                    onChange={(event) => {
                      setRadarPlaying(false);
                      setRadarIndex(Number(event.target.value));
                    }}
                  />
                </div>
              </div>

              <div className="weather-radar-source">
                <p><strong>Fuente:</strong> {radar?.source.attribution ?? 'AEMET'} · {radar?.source.provider ?? 'AEMET OpenData'}</p>
                <p>{radar?.source.note ?? 'Radar de precipitación. No representa una capa de nubosidad por satélite.'}</p>
              </div>
            </>
          ) : (
            <div className="weather-radar-empty">
              <strong>Historial de radar en formación.</strong>
              <span>El servidor irá incorporando automáticamente nuevos fotogramas. Con dos o más imágenes se activará la reproducción.</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
