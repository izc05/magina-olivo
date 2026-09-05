const DEMO_ENABLED = import.meta.env.VITE_DEMO_MODE === 'true';

type DemoPreferences = {
  preferredCooperativeId: string | null;
  notifyWeather: boolean;
  notifyTasks: boolean;
  notifyPendingYield: boolean;
  weatherRainProbabilityPercentThreshold: number;
  weatherFrostCThreshold: number;
  weatherWindKmhThreshold: number;
  updatedAt: string;
};

type DemoTask = {
  id: string;
  holdingId: string;
  campaignId: string | null;
  campaignName: string | null;
  farmId: string | null;
  farmName: string | null;
  plotId: string | null;
  plotName: string | null;
  title: string;
  notes: string | null;
  dueDate: string;
  priority: 'low' | 'normal' | 'high';
  reminderDaysBefore: number | null;
  status: 'pending' | 'completed' | 'cancelled';
  completedAt: string | null;
  version: number;
  overdue: boolean;
};

let preferences: DemoPreferences = {
  preferredCooperativeId: 'demo-destination-1',
  notifyWeather: true,
  notifyTasks: true,
  notifyPendingYield: true,
  weatherRainProbabilityPercentThreshold: 60,
  weatherFrostCThreshold: 0,
  weatherWindKmhThreshold: 50,
  updatedAt: '2026-09-04T05:00:00.000Z',
};

const tasks: DemoTask[] = [
  {
    id: 'demo-task-1',
    holdingId: 'demo-holding-1',
    campaignId: 'demo-campaign-1',
    campaignName: 'Campaña 2026/27',
    farmId: 'demo-farm-1',
    farmName: 'Las Viñas',
    plotId: 'demo-plot-1',
    plotName: 'Parcela Norte',
    title: 'Revisar riego de Parcela Norte',
    notes: 'Comprobar humedad y goteros antes del fin de semana.',
    dueDate: '2026-09-04',
    priority: 'high',
    reminderDaysBefore: 1,
    status: 'pending',
    completedAt: null,
    version: 1,
    overdue: false,
  },
  {
    id: 'demo-task-2',
    holdingId: 'demo-holding-1',
    campaignId: 'demo-campaign-1',
    campaignName: 'Campaña 2026/27',
    farmId: 'demo-farm-1',
    farmName: 'Las Viñas',
    plotId: 'demo-plot-2',
    plotName: 'Parcela Era',
    title: 'Preparar revisión de maquinaria',
    notes: null,
    dueDate: '2026-09-07',
    priority: 'normal',
    reminderDaysBefore: 2,
    status: 'pending',
    completedAt: null,
    version: 1,
    overdue: false,
  },
  {
    id: 'demo-task-3',
    holdingId: 'demo-holding-1',
    campaignId: null,
    campaignName: null,
    farmId: 'demo-farm-2',
    farmName: 'El Barranco',
    plotId: null,
    plotName: null,
    title: 'Revisar acceso a El Barranco',
    notes: 'Tarea demo completada.',
    dueDate: '2026-09-02',
    priority: 'low',
    reminderDaysBefore: null,
    status: 'completed',
    completedAt: '2026-09-02T10:00:00.000Z',
    version: 2,
    overdue: false,
  },
];

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-magina-demo-preview': '1' },
  });
}

function methodOf(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== 'undefined' && input instanceof Request) return input.method.toUpperCase();
  return 'GET';
}

function urlOf(input: RequestInfo | URL): URL {
  if (typeof input === 'string') return new URL(input, window.location.origin);
  if (input instanceof URL) return input;
  return new URL(input.url, window.location.origin);
}

async function bodyOf(input: RequestInfo | URL, init?: RequestInit): Promise<Record<string, unknown>> {
  if (typeof init?.body === 'string' && init.body) {
    try { return JSON.parse(init.body) as Record<string, unknown>; } catch { return {}; }
  }
  if (typeof Request !== 'undefined' && input instanceof Request) {
    try { return await input.clone().json() as Record<string, unknown>; } catch { return {}; }
  }
  return {};
}

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function routeId(match: RegExpMatchArray): string {
  const value = match[1];
  if (!value) throw new Error('Demo route matched without its required identifier');
  return value;
}

function exportPayload() {
  const requestedAt = new Date().toISOString();
  const data = encodeURIComponent(JSON.stringify({
    demo: true,
    schemaVersion: 1,
    exportedAt: requestedAt,
    note: 'Copia de demostración. El staging genera la exportación real server-side.',
  }, null, 2));

  return {
    id: 'demo-export-1',
    schemaVersion: 1,
    status: 'ready' as const,
    filename: 'magina-olivo-demo-export.json',
    sizeBytes: '186',
    sha256: null,
    error: null,
    requestedAt,
    startedAt: requestedAt,
    completedAt: requestedAt,
    expiresAt: '2026-09-11T23:59:59.000Z',
    downloadUrl: `data:application/json;charset=utf-8,${data}`,
  };
}

let exports = [exportPayload()];

async function handleExtra(input: RequestInfo | URL, init?: RequestInit): Promise<Response | null> {
  const url = urlOf(input);
  const path = url.pathname;
  const method = methodOf(input, init);

  if (path === '/api/v1/public/market/olive-oil' && method === 'GET') {
    return json({
      weeks: [
        { week: 32, label: 'Semana 32', startDate: '2026-08-03', endDate: '2026-08-09' },
        { week: 33, label: 'Semana 33', startDate: '2026-08-10', endDate: '2026-08-16' },
        { week: 34, label: 'Semana 34', startDate: '2026-08-17', endDate: '2026-08-23' },
        { week: 35, label: 'Semana 35', startDate: '2026-08-24', endDate: '2026-08-30' },
      ],
      series: [
        { key: 'extra', label: 'Virgen extra', values: [3.63, 3.42, 3.48, 3.61] },
        { key: 'virgin', label: 'Virgen', values: [3.15, 3.28, 3.25, 3.29] },
        { key: 'lampante', label: 'Lampante', values: [3.01, 3.04, 3.09, 3.14] },
      ],
      freshness: { status: 'fresh', ageDays: 5, latestDate: '2026-08-30' },
      availability: { mode: 'live' },
      cache: { hit: false, ttlSeconds: 1800 },
      source: {
        provider: 'Observatorio de Precios y Mercados · DEMO',
        sourceUrl: 'https://www.juntadeandalucia.es/agriculturaypesca/observatorio/servlet/FrontController?action=UltimosPrecios&posicion=2291332&producto=33000&subsector=33',
        checkedAt: '2026-09-04T10:00:00.000Z',
        position: 'Almazara o Bodega',
        scope: 'Andalucía · datos de demostración',
        unit: '€/kg',
        usageNote: 'Vista demo basada en la estructura oficial. El servidor real vuelve a consultar y validar la fuente antes de publicar.',
      },
    });
  }

  if (path === '/api/v1/account/preferences' && method === 'GET') return json(preferences);
  if (path === '/api/v1/account/preferences' && method === 'PUT') {
    const body = await bodyOf(input, init);
    preferences = {
      ...preferences,
      ...body,
      preferredCooperativeId: body.preferredCooperativeId == null ? null : String(body.preferredCooperativeId),
      notifyWeather: body.notifyWeather == null ? preferences.notifyWeather : Boolean(body.notifyWeather),
      notifyTasks: body.notifyTasks == null ? preferences.notifyTasks : Boolean(body.notifyTasks),
      notifyPendingYield: body.notifyPendingYield == null ? preferences.notifyPendingYield : Boolean(body.notifyPendingYield),
      weatherRainProbabilityPercentThreshold: Number(body.weatherRainProbabilityPercentThreshold ?? preferences.weatherRainProbabilityPercentThreshold),
      weatherFrostCThreshold: Number(body.weatherFrostCThreshold ?? preferences.weatherFrostCThreshold),
      weatherWindKmhThreshold: Number(body.weatherWindKmhThreshold ?? preferences.weatherWindKmhThreshold),
      updatedAt: new Date().toISOString(),
    } as DemoPreferences;
    return json(preferences);
  }

  if (path === '/api/v1/account/rain-alerts' && method === 'GET') {
    return json({
      enabled: preferences.notifyWeather,
      thresholdPercent: preferences.weatherRainProbabilityPercentThreshold,
      horizonDays: 2,
      source: { provider: 'AEMET OpenData · DEMO', scope: 'municipal-daily-forecast', automatic: true },
      items: preferences.notifyWeather ? [
        {
          id: 'demo-rain-1',
          holdingId: 'demo-holding-1',
          municipalitySlug: 'huelma',
          municipalityName: 'Huelma',
          forecastDate: '2026-09-06',
          precipitationProbabilityPercent: 70,
          thresholdPercent: preferences.weatherRainProbabilityPercentThreshold,
          provider: 'AEMET OpenData · DEMO',
          providerElaboratedAt: '2026-09-04T04:30:00.000Z',
          firstDetectedAt: '2026-09-04T05:00:00.000Z',
          lastDetectedAt: '2026-09-04T05:00:00.000Z',
        },
      ] : [],
    });
  }

  if (path === '/api/v1/account/exports' && method === 'GET') return json({ items: exports });
  if (path === '/api/v1/account/exports' && method === 'POST') {
    const current = exportPayload();
    exports = [current];
    return json({ export: current }, 201);
  }

  const taskCollection = path.match(/^\/api\/v1\/holdings\/([^/]+)\/tasks$/);
  if (taskCollection && method === 'GET') {
    const holdingId = routeId(taskCollection);
    const status = url.searchParams.get('status') ?? 'pending';
    const items = tasks.filter((task) => task.holdingId === holdingId && (status === 'all' || task.status === status));
    return json({ items });
  }
  if (taskCollection && method === 'POST') {
    const body = await bodyOf(input, init);
    const dueDate = String(body.dueDate || '2026-09-04');
    const created: DemoTask = {
      id: nextId('demo-task'),
      holdingId: routeId(taskCollection),
      campaignId: null,
      campaignName: null,
      farmId: null,
      farmName: null,
      plotId: null,
      plotName: null,
      title: String(body.title || 'Nueva tarea demo'),
      notes: body.notes ? String(body.notes) : null,
      dueDate,
      priority: String(body.priority || 'normal') as DemoTask['priority'],
      reminderDaysBefore: body.reminderDaysBefore == null ? null : Number(body.reminderDaysBefore),
      status: 'pending',
      completedAt: null,
      version: 1,
      overdue: dueDate < '2026-09-04',
    };
    tasks.push(created);
    return json(created, 201);
  }

  const completeTask = path.match(/^\/api\/v1\/tasks\/([^/]+)\/complete$/);
  if (completeTask && method === 'POST') {
    const taskId = routeId(completeTask);
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return json({ error: { message: 'Tarea demo no encontrada' } }, 404);
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    task.version += 1;
    task.overdue = false;
    return json(task);
  }

  return null;
}

/**
 * Extiende el backend simulado de GitHub Pages con flujos secundarios que la
 * revisión móvil debe poder recorrer sin contraseña. Nunca se instala en
 * staging/producción salvo que VITE_DEMO_MODE se active de forma explícita.
 */
export function installDemoPreviewExtras() {
  if (!DEMO_ENABLED || typeof window === 'undefined') return;
  const previousFetch = window.fetch.bind(window);

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const mocked = await handleExtra(input, init);
    if (mocked) return mocked;
    return previousFetch(input, init);
  }) as typeof window.fetch;
}
