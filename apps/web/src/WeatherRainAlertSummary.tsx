import { useEffect, useState } from 'react';
import './weather-rain-alerts.css';

type RainAlert = {
  id: string;
  municipalityName: string;
  forecastDate: string;
  precipitationProbabilityPercent: number;
  thresholdPercent: number;
  provider: string;
};

type RainAlertResponse = {
  enabled: boolean;
  thresholdPercent: number;
  horizonDays: number;
  source?: {
    provider: string;
    scope: string;
    automatic: boolean;
  };
  items: RainAlert[];
};

function dayLabel(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(parsed);
}

export function WeatherRainAlertSummary() {
  const [alerts, setAlerts] = useState<RainAlertResponse | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const session = await fetch('/api/v1/me', {
          headers: { accept: 'application/json' },
          credentials: 'include',
        });
        if (!session.ok) return;
        if (cancelled) return;
        setAuthenticated(true);

        const response = await fetch('/api/v1/account/rain-alerts', {
          headers: { accept: 'application/json' },
          credentials: 'include',
        });
        if (!response.ok) return;
        const result = await response.json() as RainAlertResponse;
        if (!cancelled) setAlerts(result);
      } catch {
        // This private summary must never block the public weather page.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !authenticated) return null;

  return (
    <section className="weather-rain-alerts" aria-labelledby="weather-rain-alerts-title" aria-live="polite">
      <div className="weather-results-heading">
        <div>
          <p className="eyebrow">Vigilancia automática</p>
          <h2 id="weather-rain-alerts-title">Alarmas de lluvia</h2>
          <p>Seguimiento server-side de la previsión municipal asociada a tu explotación.</p>
        </div>
        <span className="badge gold">AEMET</span>
      </div>

      {!alerts ? (
        <div className="card weather-rain-alerts-empty">
          No se ha podido consultar ahora el resumen privado de alarmas. La previsión y el radar públicos siguen disponibles.
        </div>
      ) : !alerts.enabled ? (
        <div className="card weather-rain-alerts-empty">
          <strong>Alarmas de lluvia desactivadas.</strong>
          <span>Puedes volver a activarlas desde <a href="/cuenta">Mi cuenta</a>.</span>
        </div>
      ) : alerts.items.length === 0 ? (
        <div className="card weather-rain-alerts-empty">
          <strong>Sin alarmas activas.</strong>
          <span>El servidor revisa los próximos {alerts.horizonDays} días y te avisará cuando la probabilidad alcance tu umbral del {alerts.thresholdPercent}%.</span>
        </div>
      ) : (
        <div className="weather-rain-alert-grid">
          {alerts.items.slice(0, 2).map((alert) => (
            <article className="card weather-rain-alert-card" key={alert.id}>
              <div className="weather-rain-alert-icon" aria-hidden="true">☔</div>
              <div>
                <h3>{dayLabel(alert.forecastDate)}</h3>
                <p><strong>{alert.precipitationProbabilityPercent}%</strong> de probabilidad en {alert.municipalityName}</p>
                <small>Umbral configurado: {alert.thresholdPercent}% · Fuente: {alert.provider}</small>
              </div>
            </article>
          ))}
        </div>
      )}

      {alerts?.enabled ? (
        <p className="weather-rain-alerts-note">
          El aviso se genera con la previsión diaria de AEMET y no sustituye avisos meteorológicos oficiales ni una recomendación agronómica.
        </p>
      ) : null}
    </section>
  );
}
