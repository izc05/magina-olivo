type DemoUser = { id: string; name: string; email: string };
type DemoHolding = { id: string; name: string; municipality: string; province: string; role: 'owner' };
type DemoFarm = { id: string; name: string; description: string | null; areaHa: string };
type DemoPlot = {
  id: string;
  farmId: string;
  name: string;
  areaHa: string;
  sigpacReference: string | null;
  irrigationType: 'dryland' | 'irrigated' | 'mixed' | 'unknown';
  oliveTreeCount: number;
  notes: string | null;
};
type DemoCampaign = {
  id: string;
  name: string;
  seasonStartYear: number;
  seasonEndYear: number;
  startDate: string;
  status: string;
  notes: string | null;
};
type DemoDelivery = {
  id: string;
  deliveredAt: string;
  kilograms: string;
  cooperativeId: string | null;
  customDestination: string | null;
  farmId: string | null;
  plotId: string | null;
  ticketNumber: string | null;
  variety: string | null;
  verificationStatus: string;
  version: number;
};
type DemoYield = {
  id: string;
  deliveryId: string;
  resultType: 'fat_yield';
  value: string;
  unit: string;
  measuredAt: string;
  sourceKind: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
type DemoActivity = {
  id: string;
  holdingId: string;
  campaignId: string | null;
  farmId: string | null;
  plotId: string | null;
  activityType: string;
  occurredAt: string;
  affectedAreaHa: string | null;
  productName: string | null;
  productRegistrationNumber: string | null;
  quantity: string | null;
  quantityUnit: string | null;
  costEur: string | null;
  notes: string | null;
  verificationStatus: string;
  version: number;
  createdAt: string;
};

const DEMO_ENABLED = import.meta.env.VITE_DEMO_MODE === 'true';
const DEMO_HEADER = 'x-magina-demo-preview';

const user: DemoUser = {
  id: 'demo-user-isi',
  name: 'Isi · Modo demo',
  email: 'demo@maginaolivo.local',
};

const holdings: DemoHolding[] = [
  {
    id: 'demo-holding-1',
    name: 'Olivar Sierra Mágina',
    municipality: 'Huelma',
    province: 'Jaén',
    role: 'owner',
  },
];

const farms: DemoFarm[] = [
  { id: 'demo-farm-1', name: 'Las Viñas', description: 'Finca principal de demostración', areaHa: '5.250' },
  { id: 'demo-farm-2', name: 'El Barranco', description: 'Secano tradicional', areaHa: '3.180' },
];

const plots: DemoPlot[] = [
  {
    id: 'demo-plot-1',
    farmId: 'demo-farm-1',
    name: 'Parcela Norte',
    areaHa: '2.740',
    sigpacReference: '23-044-0-0-12-34-1',
    irrigationType: 'irrigated',
    oliveTreeCount: 386,
    notes: 'Pendiente suave y acceso por camino norte.',
  },
  {
    id: 'demo-plot-2',
    farmId: 'demo-farm-1',
    name: 'Parcela Era',
    areaHa: '2.510',
    sigpacReference: '23-044-0-0-12-35-1',
    irrigationType: 'mixed',
    oliveTreeCount: 348,
    notes: 'Zona central junto a la era.',
  },
  {
    id: 'demo-plot-3',
    farmId: 'demo-farm-2',
    name: 'Ladera Sur',
    areaHa: '3.180',
    sigpacReference: null,
    irrigationType: 'dryland',
    oliveTreeCount: 416,
    notes: 'Parcela de secano para la vista demo.',
  },
];

const campaigns: DemoCampaign[] = [
  {
    id: 'demo-campaign-1',
    name: 'Campaña 2026/27',
    seasonStartYear: 2026,
    seasonEndYear: 2027,
    startDate: '2026-10-15T00:00:00.000Z',
    status: 'active',
    notes: 'Campaña de demostración de Mágina Olivo.',
  },
  {
    id: 'demo-campaign-0',
    name: 'Campaña 2025/26',
    seasonStartYear: 2025,
    seasonEndYear: 2026,
    startDate: '2025-10-20T00:00:00.000Z',
    status: 'closed',
    notes: 'Histórico de ejemplo.',
  },
];

const deliveries: DemoDelivery[] = [
  {
    id: 'demo-delivery-1',
    deliveredAt: '2026-11-24T09:20:00.000Z',
    kilograms: '3280',
    cooperativeId: null,
    customDestination: 'Cooperativa de Huelma',
    farmId: 'demo-farm-1',
    plotId: 'demo-plot-1',
    ticketNumber: 'D-2026-0184',
    variety: 'Picual',
    verificationStatus: 'verified',
    version: 1,
  },
  {
    id: 'demo-delivery-2',
    deliveredAt: '2026-12-02T16:10:00.000Z',
    kilograms: '4120',
    cooperativeId: null,
    customDestination: 'Cooperativa de Huelma',
    farmId: 'demo-farm-1',
    plotId: 'demo-plot-2',
    ticketNumber: 'D-2026-0241',
    variety: 'Picual',
    verificationStatus: 'verified',
    version: 1,
  },
  {
    id: 'demo-delivery-3',
    deliveredAt: '2026-12-11T08:45:00.000Z',
    kilograms: '2675',
    cooperativeId: null,
    customDestination: 'Almazara de prueba',
    farmId: 'demo-farm-2',
    plotId: 'demo-plot-3',
    ticketNumber: 'D-2026-0307',
    variety: 'Picual',
    verificationStatus: 'verified',
    version: 1,
  },
];

const yields: DemoYield[] = [
  {
    id: 'demo-yield-1',
    deliveryId: 'demo-delivery-1',
    resultType: 'fat_yield',
    value: '21.80',
    unit: '%',
    measuredAt: '2026-11-25T10:00:00.000Z',
    sourceKind: 'manual',
    status: 'verified',
    notes: null,
    createdAt: '2026-11-25T10:00:00.000Z',
    updatedAt: '2026-11-25T10:00:00.000Z',
  },
  {
    id: 'demo-yield-2',
    deliveryId: 'demo-delivery-2',
    resultType: 'fat_yield',
    value: '22.35',
    unit: '%',
    measuredAt: '2026-12-03T10:00:00.000Z',
    sourceKind: 'manual',
    status: 'verified',
    notes: null,
    createdAt: '2026-12-03T10:00:00.000Z',
    updatedAt: '2026-12-03T10:00:00.000Z',
  },
];

const activities: DemoActivity[] = [
  {
    id: 'demo-activity-1',
    holdingId: 'demo-holding-1',
    campaignId: 'demo-campaign-1',
    farmId: 'demo-farm-1',
    plotId: 'demo-plot-1',
    activityType: 'pruning',
    occurredAt: '2026-02-18T08:00:00.000Z',
    affectedAreaHa: '2.740',
    productName: null,
    productRegistrationNumber: null,
    quantity: null,
    quantityUnit: null,
    costEur: '185.00',
    notes: 'Poda de mantenimiento y retirada de ramas secas.',
    verificationStatus: 'manual',
    version: 1,
    createdAt: '2026-02-18T08:00:00.000Z',
  },
  {
    id: 'demo-activity-2',
    holdingId: 'demo-holding-1',
    campaignId: 'demo-campaign-1',
    farmId: 'demo-farm-1',
    plotId: 'demo-plot-1',
    activityType: 'irrigation',
    occurredAt: '2026-07-14T05:30:00.000Z',
    affectedAreaHa: '2.740',
    productName: 'Riego sector norte',
    productRegistrationNumber: null,
    quantity: '42',
    quantityUnit: 'm³',
    costEur: '18.40',
    notes: 'Riego de madrugada para reducir evaporación.',
    verificationStatus: 'manual',
    version: 1,
    createdAt: '2026-07-14T05:30:00.000Z',
  },
  {
    id: 'demo-activity-3',
    holdingId: 'demo-holding-1',
    campaignId: 'demo-campaign-1',
    farmId: 'demo-farm-1',
    plotId: 'demo-plot-2',
    activityType: 'observation',
    occurredAt: '2026-08-28T17:15:00.000Z',
    affectedAreaHa: null,
    productName: null,
    productRegistrationNumber: null,
    quantity: null,
    quantityUnit: null,
    costEur: null,
    notes: 'Buen estado general del fruto. Registro de demostración.',
    verificationStatus: 'manual',
    version: 1,
    createdAt: '2026-08-28T17:15:00.000Z',
  },
];

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      [DEMO_HEADER]: '1',
    },
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
  const directBody = init?.body;
  if (typeof directBody === 'string' && directBody) {
    try { return JSON.parse(directBody) as Record<string, unknown>; } catch { return {}; }
  }
  if (typeof Request !== 'undefined' && input instanceof Request) {
    try { return await input.clone().json() as Record<string, unknown>; } catch { return {}; }
  }
  return {};
}

function nextId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function routeId(match: RegExpMatchArray): string {
  const value = match[1];
  if (!value) throw new Error('Demo route matched without its required identifier');
  return value;
}

function campaignSummary(campaignId: string) {
  const campaignDeliveries = campaignId === 'demo-campaign-1' ? deliveries : [];
  const withYield = campaignDeliveries.filter((delivery) => yields.some((item) => item.deliveryId === delivery.id));
  const totalKg = campaignDeliveries.reduce((sum, delivery) => sum + Number(delivery.kilograms || 0), 0);
  const coveredKg = withYield.reduce((sum, delivery) => sum + Number(delivery.kilograms || 0), 0);
  const weightedNumerator = withYield.reduce((sum, delivery) => {
    const result = yields.find((item) => item.deliveryId === delivery.id);
    return sum + Number(delivery.kilograms || 0) * Number(result?.value || 0);
  }, 0);

  return {
    campaignId,
    deliveriesCount: campaignDeliveries.length,
    totalKilograms: totalKg.toFixed(2),
    deliveriesWithResult: withYield.length,
    pendingResultCount: campaignDeliveries.length - withYield.length,
    resultCoveredKilograms: coveredKg.toFixed(2),
    coveragePercent: totalKg ? ((coveredKg / totalKg) * 100).toFixed(2) : null,
    weightedYieldPercent: coveredKg ? (weightedNumerator / coveredKg).toFixed(2) : null,
  };
}

function timelineForPlot(plotId: string) {
  const activityItems = activities
    .filter((item) => item.plotId === plotId)
    .map((item) => ({
      type: 'activity',
      id: item.id,
      occurredAt: item.occurredAt,
      activityType: item.activityType,
      notes: item.notes ?? undefined,
      costEur: item.costEur ?? undefined,
    }));

  const deliveryItems = deliveries
    .filter((item) => item.plotId === plotId)
    .flatMap((delivery) => {
      const result = yields.find((item) => item.deliveryId === delivery.id);
      const rows: Array<Record<string, unknown>> = [{
        type: 'delivery',
        id: delivery.id,
        occurredAt: delivery.deliveredAt,
        deliveryId: delivery.id,
        kilograms: delivery.kilograms,
        destination: delivery.customDestination ?? 'Cooperativa',
        ticketNumber: delivery.ticketNumber ?? undefined,
      }];
      if (result) {
        rows.push({
          type: 'yield_result',
          id: result.id,
          occurredAt: result.measuredAt,
          deliveryId: delivery.id,
          yieldPercent: result.value,
        });
      }
      return rows;
    });

  return [...activityItems, ...deliveryItems].sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)));
}

function publicMunicipalities() {
  return {
    items: [
      { slug: 'huelma', name: 'Huelma', province: 'Jaén', aliases: [], checkedAt: '2026-09-04T05:00:00.000Z' },
      { slug: 'bedmar-y-garciez', name: 'Bedmar y Garcíez', province: 'Jaén', aliases: ['Bedmar'], checkedAt: '2026-09-04T05:00:00.000Z' },
      { slug: 'cambil', name: 'Cambil', province: 'Jaén', aliases: [], checkedAt: '2026-09-04T05:00:00.000Z' },
      { slug: 'jimena', name: 'Jimena', province: 'Jaén', aliases: [], checkedAt: '2026-09-04T05:00:00.000Z' },
    ],
  };
}

function demoWeather(slug: string) {
  const names: Record<string, string> = {
    huelma: 'Huelma',
    'bedmar-y-garciez': 'Bedmar y Garcíez',
    cambil: 'Cambil',
    jimena: 'Jimena',
  };
  return {
    municipality: { slug, name: names[slug] ?? 'Huelma', province: 'Jaén' },
    forecast: {
      provider: 'AEMET · DEMO',
      elaboratedAt: '2026-09-04T04:30:00.000Z',
      days: [
        { date: '2026-09-04', precipitationProbabilityPercent: 10, temperatureMinC: 16, temperatureMaxC: 30, windMaxKmh: 18 },
        { date: '2026-09-05', precipitationProbabilityPercent: 20, temperatureMinC: 15, temperatureMaxC: 29, windMaxKmh: 22 },
        { date: '2026-09-06', precipitationProbabilityPercent: 55, temperatureMinC: 14, temperatureMaxC: 26, windMaxKmh: 28 },
        { date: '2026-09-07', precipitationProbabilityPercent: 70, temperatureMinC: 13, temperatureMaxC: 24, windMaxKmh: 24 },
        { date: '2026-09-08', precipitationProbabilityPercent: 25, temperatureMinC: 14, temperatureMaxC: 27, windMaxKmh: 17 },
      ],
    },
    freshness: { status: 'fresh', ageHours: 1.5 },
    availability: { mode: 'live' },
    source: {
      label: 'Vista de demostración',
      attribution: 'AEMET (datos simulados solo para la preview)',
      scopeNote: 'Los valores de esta pantalla son ficticios y sirven únicamente para revisar el diseño antes de conectar staging.',
    },
  };
}

function publicNews() {
  return {
    source: {
      label: 'Actualidad agraria · DEMO',
      provider: 'Junta de Andalucía · DEMO',
      sourceUrl: 'https://www.juntadeandalucia.es/',
      sourceUpdatedAt: '2026-09-04T05:00:00.000Z',
      lastCheckedAt: '2026-09-04T05:00:00.000Z',
      lastSuccessAt: '2026-09-04T05:00:00.000Z',
      hasError: false,
    },
    items: [
      {
        id: 'demo-news-1',
        externalId: 'demo-1',
        title: 'Vista demo · Seguimiento de la próxima campaña del olivar',
        publishedAt: '2026-09-03T10:00:00.000Z',
        topic: 'estrategia-olivar',
        sourceUrl: 'https://www.juntadeandalucia.es/',
        freshness: { status: 'fresh', ageDays: 1 },
      },
      {
        id: 'demo-news-2',
        externalId: 'demo-2',
        title: 'Vista demo · Información de mercado y calidad del aceite',
        publishedAt: '2026-09-02T10:00:00.000Z',
        topic: 'mercado-aceite',
        sourceUrl: 'https://www.juntadeandalucia.es/',
        freshness: { status: 'fresh', ageDays: 2 },
      },
      {
        id: 'demo-news-3',
        externalId: 'demo-3',
        title: 'Vista demo · Ayudas y trámites vinculados al olivar',
        publishedAt: '2026-08-31T10:00:00.000Z',
        topic: 'pac-olivar',
        sourceUrl: 'https://www.juntadeandalucia.es/',
        freshness: { status: 'fresh', ageDays: 4 },
      },
    ],
    policy: 'Datos simulados en GitHub Pages. La instalación real mostrará únicamente fuentes verificadas.',
  };
}

function publicSources() {
  return {
    items: [
      {
        key: 'observatorio-agricultural-prices',
        provider: 'Observatorio de Precios y Mercados · DEMO',
        label: 'Aceite de oliva · vista demo',
        sourceUrl: 'https://www.juntadeandalucia.es/agriculturaypesca/observatorio/',
        licenseLabel: 'Datos simulados',
        updateFrequency: 'Semanal',
        lastCheckedAt: '2026-09-04T05:00:00.000Z',
        lastSuccessAt: '2026-09-04T05:00:00.000Z',
        hasError: false,
        metadata: {
          currentness: 'verified-current-content',
          latestEditorialOilPublication: 'Informe semanal de aceite · DEMO',
          latestEditorialOilPublicationDate: '2026-09-02',
          catalogLastUpdatedAt: '2026-09-03',
          catalogDeclaredFrequency: 'Diaria',
          usage: 'Vista de demostración; no representa precios reales.',
        },
      },
    ],
  };
}

function publicDestinations() {
  return {
    items: [
      {
        id: 'demo-destination-1',
        officialName: 'Cooperativa de Huelma · DEMO',
        brandName: 'Ejemplo 1',
        entityType: 'cooperative',
        municipality: 'Huelma',
        province: 'Jaén',
        websiteUrl: null,
        sourceUrl: 'https://www.juntadeandalucia.es/',
        sourceCheckedAt: '2026-09-04T05:00:00.000Z',
        verificationStatus: 'verified',
      },
      {
        id: 'demo-destination-2',
        officialName: 'S.A.T. Sierra Mágina · DEMO',
        brandName: 'Ejemplo 2',
        entityType: 'sat',
        municipality: 'Bedmar y Garcíez',
        province: 'Jaén',
        websiteUrl: null,
        sourceUrl: 'https://www.juntadeandalucia.es/',
        sourceCheckedAt: '2026-09-04T05:00:00.000Z',
        verificationStatus: 'verified',
      },
      {
        id: 'demo-destination-3',
        officialName: 'Almazara de Cambil · DEMO',
        brandName: 'Ejemplo 3',
        entityType: 'company',
        municipality: 'Cambil',
        province: 'Jaén',
        websiteUrl: null,
        sourceUrl: 'https://www.juntadeandalucia.es/',
        sourceCheckedAt: '2026-09-04T05:00:00.000Z',
        verificationStatus: 'verified',
      },
    ],
    municipalities: ['Bedmar y Garcíez', 'Cambil', 'Huelma'],
    source: {
      label: 'Directorio Mágina · DEMO',
      provider: 'Vista de demostración',
      sourceUrl: 'https://www.juntadeandalucia.es/',
      checkedAt: '2026-09-04T05:00:00.000Z',
    },
  };
}

function publicFieldAlerts() {
  return {
    source: {
      provider: 'RAIF · DEMO',
      label: 'Red de Alerta e Información Fitosanitaria · vista demo',
      licenseLabel: 'Datos simulados',
      updateFrequency: 'Semanal',
      sourceUpdatedAt: '2026-09-02T08:00:00.000Z',
      lastCheckedAt: '2026-09-04T05:00:00.000Z',
      lastSuccessAt: '2026-09-04T05:00:00.000Z',
      hasError: false,
    },
    freshness: { status: 'current', ageDays: 2 },
    scope: { crop: 'Olivar', coverage: 'Andalucía', provinceFocus: 'Jaén' },
    latestDemonstrationObservation: '2026-09-02',
    resources: [
      { key: 'raif-home', label: 'RAIF · portal oficial', url: 'https://www.juntadeandalucia.es/agriculturaypesca/raif/' },
      { key: 'raif-olivar', label: 'RAIF · olivar', url: 'https://www.juntadeandalucia.es/agriculturaypesca/raif/' },
    ],
  };
}

async function handleDemoApi(input: RequestInfo | URL, init?: RequestInit): Promise<Response | null> {
  const url = urlOf(input);
  const path = url.pathname;
  const method = methodOf(input, init);

  if (!path.startsWith('/api/')) return null;

  if (path === '/api/v1/me' && method === 'GET') return json({ user });
  if (path === '/api/auth/sign-in/email' && method === 'POST') return json({ ok: true });
  if (path === '/api/auth/sign-out' && method === 'POST') return json({ ok: true });
  if (path === '/api/auth/request-password-reset' && method === 'POST') return json({ ok: true });

  if (path === '/api/v1/holdings' && method === 'GET') return json({ items: holdings });
  if (path === '/api/v1/holdings' && method === 'POST') {
    const body = await bodyOf(input, init);
    const created: DemoHolding = {
      id: nextId('demo-holding'),
      name: String(body.name || 'Nueva explotación demo'),
      municipality: String(body.municipality || 'Sierra Mágina'),
      province: String(body.province || 'Jaén'),
      role: 'owner',
    };
    holdings.push(created);
    return json(created, 201);
  }

  const holdingFarms = path.match(/^\/api\/v1\/holdings\/([^/]+)\/farms$/);
  if (holdingFarms && method === 'GET') return json({ items: routeId(holdingFarms) === 'demo-holding-1' ? farms : [] });
  if (holdingFarms && method === 'POST') {
    const body = await bodyOf(input, init);
    const created: DemoFarm = {
      id: nextId('demo-farm'),
      name: String(body.name || 'Nueva finca demo'),
      description: body.description ? String(body.description) : null,
      areaHa: String(body.areaHa || '0'),
    };
    farms.push(created);
    return json(created, 201);
  }

  const farmPlots = path.match(/^\/api\/v1\/farms\/([^/]+)\/plots$/);
  if (farmPlots && method === 'GET') return json({ items: plots.filter((item) => item.farmId === routeId(farmPlots)).map(({ farmId: _farmId, ...item }) => item) });
  if (farmPlots && method === 'POST') {
    const body = await bodyOf(input, init);
    const created: DemoPlot = {
      id: nextId('demo-plot'),
      farmId: routeId(farmPlots),
      name: String(body.name || 'Nueva parcela demo'),
      areaHa: String(body.areaHa || '0'),
      sigpacReference: body.sigpacReference ? String(body.sigpacReference) : null,
      irrigationType: String(body.irrigationType || 'unknown') as DemoPlot['irrigationType'],
      oliveTreeCount: Number(body.oliveTreeCount || 0),
      notes: body.notes ? String(body.notes) : null,
    };
    plots.push(created);
    const { farmId: _farmId, ...payload } = created;
    return json(payload, 201);
  }

  const holdingCampaigns = path.match(/^\/api\/v1\/holdings\/([^/]+)\/campaigns$/);
  if (holdingCampaigns && method === 'GET') return json({ items: routeId(holdingCampaigns) === 'demo-holding-1' ? campaigns : [] });
  if (holdingCampaigns && method === 'POST') {
    const body = await bodyOf(input, init);
    const start = Number(body.seasonStartYear || 2026);
    const created: DemoCampaign = {
      id: nextId('demo-campaign'),
      name: String(body.name || `Campaña ${start}/${String(start + 1).slice(-2)}`),
      seasonStartYear: start,
      seasonEndYear: start + 1,
      startDate: body.startDate ? String(body.startDate) : new Date().toISOString(),
      status: 'active',
      notes: body.notes ? String(body.notes) : null,
    };
    campaigns.unshift(created);
    return json(created, 201);
  }

  const campaignDeliveries = path.match(/^\/api\/v1\/campaigns\/([^/]+)\/deliveries$/);
  if (campaignDeliveries && method === 'GET') return json({ items: routeId(campaignDeliveries) === 'demo-campaign-1' ? deliveries : [] });
  if (campaignDeliveries && method === 'POST') {
    const body = await bodyOf(input, init);
    const created: DemoDelivery = {
      id: nextId('demo-delivery'),
      deliveredAt: String(body.deliveredAt || new Date().toISOString()),
      kilograms: String(body.kilograms || '0'),
      cooperativeId: body.cooperativeId ? String(body.cooperativeId) : null,
      customDestination: body.customDestination ? String(body.customDestination) : 'Destino demo',
      farmId: body.farmId ? String(body.farmId) : null,
      plotId: body.plotId ? String(body.plotId) : null,
      ticketNumber: body.ticketNumber ? String(body.ticketNumber) : null,
      variety: body.variety ? String(body.variety) : 'Picual',
      verificationStatus: 'manual',
      version: 1,
    };
    deliveries.unshift(created);
    return json(created, 201);
  }

  const campaignSummaryPath = path.match(/^\/api\/v1\/campaigns\/([^/]+)\/summary$/);
  if (campaignSummaryPath && method === 'GET') return json(campaignSummary(routeId(campaignSummaryPath)));

  const deliveryResults = path.match(/^\/api\/v1\/deliveries\/([^/]+)\/results$/);
  if (deliveryResults && method === 'GET') return json({ items: yields.filter((item) => item.deliveryId === routeId(deliveryResults)).map(({ deliveryId: _deliveryId, ...item }) => item) });
  if (deliveryResults && method === 'POST') {
    const body = await bodyOf(input, init);
    const now = new Date().toISOString();
    const deliveryId = routeId(deliveryResults);
    const created: DemoYield = {
      id: nextId('demo-yield'),
      deliveryId,
      resultType: 'fat_yield',
      value: String(body.value || '0'),
      unit: '%',
      measuredAt: body.measuredAt ? String(body.measuredAt) : now,
      sourceKind: 'manual',
      status: 'verified',
      notes: null,
      createdAt: now,
      updatedAt: now,
    };
    const existing = yields.findIndex((item) => item.deliveryId === deliveryId);
    if (existing >= 0) yields.splice(existing, 1, created); else yields.push(created);
    const { deliveryId: _deliveryId, ...payload } = created;
    return json(payload, 201);
  }

  const holdingActivities = path.match(/^\/api\/v1\/holdings\/([^/]+)\/activities$/);
  if (holdingActivities && method === 'GET') {
    const holdingId = routeId(holdingActivities);
    const plotId = url.searchParams.get('plotId');
    const campaignId = url.searchParams.get('campaignId');
    const activityType = url.searchParams.get('activityType');
    const limit = Number(url.searchParams.get('limit') || 0);
    let items = activities.filter((item) => item.holdingId === holdingId);
    if (plotId) items = items.filter((item) => item.plotId === plotId);
    if (campaignId) items = items.filter((item) => item.campaignId === campaignId);
    if (activityType) items = items.filter((item) => item.activityType === activityType);
    if (limit > 0) items = items.slice(0, limit);
    return json({ items });
  }
  if (holdingActivities && method === 'POST') {
    const body = await bodyOf(input, init);
    const occurredAt = String(body.occurredAt || new Date().toISOString());
    const created: DemoActivity = {
      id: nextId('demo-activity'),
      holdingId: routeId(holdingActivities),
      campaignId: body.campaignId ? String(body.campaignId) : null,
      farmId: body.farmId ? String(body.farmId) : null,
      plotId: body.plotId ? String(body.plotId) : null,
      activityType: String(body.activityType || 'observation'),
      occurredAt,
      affectedAreaHa: body.affectedAreaHa == null ? null : String(body.affectedAreaHa),
      productName: body.productName ? String(body.productName) : null,
      productRegistrationNumber: body.productRegistrationNumber ? String(body.productRegistrationNumber) : null,
      quantity: body.quantity == null ? null : String(body.quantity),
      quantityUnit: body.quantityUnit ? String(body.quantityUnit) : null,
      costEur: body.costEur == null ? null : String(body.costEur),
      notes: body.notes ? String(body.notes) : null,
      verificationStatus: 'manual',
      version: 1,
      createdAt: occurredAt,
    };
    activities.unshift(created);
    return json(created, 201);
  }

  const plotTimeline = path.match(/^\/api\/v1\/plots\/([^/]+)\/timeline$/);
  if (plotTimeline && method === 'GET') return json({ items: timelineForPlot(routeId(plotTimeline)) });

  if (path === '/api/v1/public/municipalities' && method === 'GET') return json(publicMunicipalities());
  if (path === '/api/v1/public/weather' && method === 'GET') return json(demoWeather(url.searchParams.get('municipality') || 'huelma'));
  if (path === '/api/v1/public/news' && method === 'GET') return json(publicNews());
  if (path === '/api/v1/public/sources' && method === 'GET') return json(publicSources());
  if (path === '/api/v1/public/destinations' && method === 'GET') return json(publicDestinations());
  if (path === '/api/v1/public/field-alerts' && method === 'GET') return json(publicFieldAlerts());

  return null;
}

/**
 * GitHub Pages preview has no private API behind it. In that environment we
 * intercept only Mágina Olivo API calls and serve an in-memory, clearly fake
 * dataset so the full UI can be reviewed from a phone before staging exists.
 * Production/staging builds never install this interceptor unless the explicit
 * VITE_DEMO_MODE build flag is set.
 */
export function installDemoPreview(): void {
  if (!DEMO_ENABLED || typeof window === 'undefined') return;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const mocked = await handleDemoApi(input, init);
    if (mocked) return mocked;
    return nativeFetch(input, init);
  }) as typeof window.fetch;

  document.documentElement.dataset.maginaDemo = 'true';
  console.info('Mágina Olivo: GitHub Pages demo data enabled.');
}
