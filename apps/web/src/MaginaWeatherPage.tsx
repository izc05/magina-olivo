import { useEffect, useMemo, useState } from 'react';

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
  source: {
    label: string;
    attribution: string;
    scopeNote: string;
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

  const selectedMunicipality = useMemo(
    () => municipalities.find((item) => item.slug === selectedSlug) ?? null,
    [municipalities, selectedSlug],
  );
  const freshness = weather ? freshnessCopy(weather.freshness) : null;

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
    </main>
  );
}
