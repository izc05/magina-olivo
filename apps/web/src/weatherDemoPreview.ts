const DEMO_ENABLED = import.meta.env.VITE_DEMO_MODE === 'true';
const DEMO_HEADER = 'x-magina-demo-preview';

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      [DEMO_HEADER]: '1',
    },
  });
}

function urlOf(input: RequestInfo | URL): URL {
  if (typeof input === 'string') return new URL(input, window.location.origin);
  if (input instanceof URL) return input;
  return new URL(input.url, window.location.origin);
}

function methodOf(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== 'undefined' && input instanceof Request) return input.method.toUpperCase();
  return 'GET';
}

function isoDateOffset(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function radarSvg(frame: number): string {
  const shifts = [0, 28, 55, 82];
  const shift = shifts[frame] ?? 0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 520">
    <rect width="900" height="520" fill="#ece7dc"/>
    <path d="M60 380C150 310 180 250 270 245c92-5 142 58 225 32 86-27 115-103 208-97 63 4 105 41 140 79v201H60Z" fill="#d8d0c0"/>
    <path d="M120 285c105-96 174-123 282-93 72 20 126 11 197-36 59-39 124-47 191-22" fill="none" stroke="#b9aa8b" stroke-width="8" stroke-linecap="round" opacity=".7"/>
    <g opacity=".78" transform="translate(${shift} 0)">
      <ellipse cx="235" cy="190" rx="92" ry="58" fill="#2b78b8"/>
      <ellipse cx="320" cy="235" rx="70" ry="44" fill="#45a0cc"/>
      <ellipse cx="405" cy="172" rx="58" ry="35" fill="#77b9d7"/>
    </g>
    <g opacity=".7" transform="translate(${-shift / 2} 0)">
      <ellipse cx="690" cy="330" rx="68" ry="42" fill="#4d92bf"/>
      <ellipse cx="755" cy="295" rx="43" ry="30" fill="#79b6d2"/>
    </g>
    <text x="28" y="42" font-family="system-ui,sans-serif" font-size="22" fill="#3d4b3f">Preview visual · radar de precipitación</text>
    <text x="28" y="492" font-family="system-ui,sans-serif" font-size="17" fill="#59655b">Datos ilustrativos solo para GitHub Pages</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function demoRadar() {
  return {
    items: [
      { id: 'demo-radar-1', capturedAt: isoMinutesAgo(30), imageUrl: radarSvg(0) },
      { id: 'demo-radar-2', capturedAt: isoMinutesAgo(20), imageUrl: radarSvg(1) },
      { id: 'demo-radar-3', capturedAt: isoMinutesAgo(10), imageUrl: radarSvg(2) },
      { id: 'demo-radar-4', capturedAt: isoMinutesAgo(0), imageUrl: radarSvg(3) },
    ],
    playback: {
      automatic: false,
      frameCount: 4,
      scope: 'national-radar-composite-demo',
    },
    source: {
      provider: 'AEMET OpenData · preview visual',
      product: 'national-radar-composite-demo',
      attribution: 'AEMET · datos ilustrativos en modo demo',
      note: 'Radar de precipitación. En esta vista de GitHub Pages los fotogramas son ilustrativos; no representan nubosidad por satélite ni observaciones meteorológicas reales.',
    },
  };
}

function demoRainAlerts() {
  return {
    enabled: true,
    thresholdPercent: 60,
    horizonDays: 2,
    source: {
      provider: 'AEMET OpenData · preview visual',
      scope: 'municipal-daily-forecast-demo',
      automatic: true,
    },
    items: [
      {
        id: 'demo-rain-alert-1',
        holdingId: 'demo-holding-1',
        municipalitySlug: 'huelma',
        municipalityName: 'Huelma',
        forecastDate: isoDateOffset(1),
        precipitationProbabilityPercent: 75,
        thresholdPercent: 60,
        provider: 'AEMET OpenData · preview visual',
        providerElaboratedAt: new Date().toISOString(),
        firstDetectedAt: new Date().toISOString(),
        lastDetectedAt: new Date().toISOString(),
      },
    ],
  };
}

export function installWeatherDemoPreview(): void {
  if (!DEMO_ENABLED) return;

  const previousFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = urlOf(input);
    const method = methodOf(input, init);

    if (method === 'GET' && url.pathname === '/api/v1/public/weather/radar/frames') {
      return json(demoRadar());
    }
    if (method === 'GET' && url.pathname === '/api/v1/account/rain-alerts') {
      return json(demoRainAlerts());
    }

    return previousFetch(input, init);
  };
}
