import { useEffect, useMemo, useState } from 'react';

type Holding = {
  id: string;
  municipality: string | null;
};

type Campaign = {
  id: string;
  status: string;
};

type CampaignSummary = {
  pendingResultCount: number;
};

type Preferences = {
  notifyWeather: boolean;
  notifyPendingYield: boolean;
  weatherFrostCThreshold: number;
  weatherWindKmhThreshold: number;
};

type Municipality = {
  slug: string;
  name: string;
  aliases: string[];
};

type WeatherDay = {
  date: string;
  temperatureMinC: number | null;
  windMaxKmh: number | null;
};

type WeatherResponse = {
  municipality: { name: string };
  forecast: { days: WeatherDay[] };
  freshness: { status: 'fresh' | 'aging' | 'stale' | 'unknown' };
  source: { attribution: string; scopeNote: string };
};

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
  items: RainAlert[];
};

type AlertItem = {
  id: string;
  title: string;
  detail: string;
  source?: string;
};

function normalizePlace(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-ES')
    .replace(/\s+/g, ' ')
    .trim();
}

async function json<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

function dayLabel(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(parsed);
}

export function PilotAlerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const session = await fetch('/api/v1/me', {
          headers: { accept: 'application/json' },
          credentials: 'include',
        });
        if (!session.ok) return;

        const [preferenceResult, holdingResult, rainAlertResult] = await Promise.all([
          json<Preferences>('/api/v1/account/preferences'),
          json<{ items: Holding[] }>('/api/v1/holdings'),
          json<RainAlertResponse>('/api/v1/account/rain-alerts').catch(() => null),
        ]);
        if (cancelled) return;

        const next: AlertItem[] = [];
        const holding = holdingResult.items[0] ?? null;

        if (rainAlertResult?.enabled) {
          for (const rain of rainAlertResult.items.slice(0, 2)) {
            next.push({
              id: `rain-${rain.id}`,
              title: `Alarma de lluvia · ${dayLabel(rain.forecastDate)}`,
              detail: `${rain.municipalityName}: probabilidad ${rain.precipitationProbabilityPercent}% (umbral ${rain.thresholdPercent}%). Seguimiento automático en servidor.`,
              source: rain.provider,
            });
          }
        }

        if (holding) {
          const campaigns = await json<{ items: Campaign[] }>(`/api/v1/holdings/${holding.id}/campaigns`);
          if (cancelled) return;
          const campaign = campaigns.items.find((item) => item.status === 'active') ?? campaigns.items[0] ?? null;

          if (campaign && preferenceResult.notifyPendingYield) {
            const summary = await json<CampaignSummary>(`/api/v1/campaigns/${campaign.id}/summary`);
            if (summary.pendingResultCount > 0) {
              next.push({
                id: 'pending-yield',
                title: `${summary.pendingResultCount} entrega${summary.pendingResultCount === 1 ? '' : 's'} pendiente${summary.pendingResultCount === 1 ? '' : 's'} de rendimiento`,
                detail: 'Añade el resultado cuando te lo facilite la almazara para mantener completa la campaña.',
              });
            }
          }

          if (preferenceResult.notifyWeather && holding.municipality) {
            try {
              const municipalities = await json<{ items: Municipality[] }>('/api/v1/public/municipalities');
              const target = normalizePlace(holding.municipality);
              const municipality = municipalities.items.find((item) => {
                if (normalizePlace(item.name) === target) return true;
                return item.aliases.some((alias) => normalizePlace(alias) === target);
              }) ?? null;

              if (municipality) {
                const weather = await json<WeatherResponse>(`/api/v1/public/weather?municipality=${encodeURIComponent(municipality.slug)}`);
                const trustworthy = weather.freshness.status === 'fresh' || weather.freshness.status === 'aging';
                if (trustworthy) {
                  const horizon = weather.forecast.days.slice(0, 2);
                  for (const day of horizon) {
                    const triggers: string[] = [];
                    if (day.temperatureMinC != null && day.temperatureMinC <= preferenceResult.weatherFrostCThreshold) {
                      triggers.push(`mínima ${day.temperatureMinC} °C`);
                    }
                    if (day.windMaxKmh != null && day.windMaxKmh >= preferenceResult.weatherWindKmhThreshold) {
                      triggers.push(`viento ${day.windMaxKmh} km/h`);
                    }

                    if (triggers.length) {
                      next.push({
                        id: `weather-${day.date}`,
                        title: `Aviso de tiempo · ${dayLabel(day.date)}`,
                        detail: `${weather.municipality.name}: ${triggers.join(' · ')}. ${weather.source.scopeNote}`,
                        source: weather.source.attribution,
                      });
                      break;
                    }
                  }
                }
              }
            } catch {
              // Frost and wind are contextual and must never block private agricultural data.
            }
          }
        }

        if (!cancelled) setAlerts(next);
      } catch {
        if (!cancelled) setAlerts([]);
      }
    }

    void load();
    const refresh = () => void load();
    window.addEventListener('magina:yield-saved', refresh);
    window.addEventListener('magina:sync-complete', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('magina:yield-saved', refresh);
      window.removeEventListener('magina:sync-complete', refresh);
    };
  }, []);

  const visible = useMemo(() => alerts.slice(0, 2), [alerts]);
  if (!visible.length) return null;

  return (
    <aside className="pilot-alerts" aria-label="Avisos útiles" aria-live="polite">
      {visible.map((alert) => (
        <article className="pilot-alert-card" key={alert.id}>
          <strong>{alert.title}</strong>
          <span>{alert.detail}</span>
          {alert.source ? <small>Fuente: {alert.source}</small> : null}
        </article>
      ))}
      <a className="pilot-alerts-more" href="/notificaciones">Ver todos los avisos →</a>
    </aside>
  );
}
