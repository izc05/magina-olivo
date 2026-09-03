import type {
  AgronomicAlert,
  Campaign,
  Cooperative,
  DiscoverPlace,
  Farm,
  JournalEntry,
  MarketQuote,
  NewsArticle,
  Parcel,
  UserProfile,
  WeatherSnapshot,
} from '../../domain/models';

const demoSource = {
  origin: 'demo',
  authoritative: false,
  provider: 'Mágina Olivo demo',
} as const;

export const demoProfile: UserProfile = {
  id: 'demo-user-isi',
  displayName: 'Isi',
  municipality: 'Bedmar',
  province: 'Jaén',
  preferredCooperativeId: 'coop-san-isidro',
  source: demoSource,
};

export const demoFarms: Farm[] = [
  {
    id: 'farm-los-llanos',
    ownerId: demoProfile.id,
    name: 'Los Llanos',
    municipality: 'Bedmar',
    province: 'Jaén',
    regionLabel: 'Sierra Mágina',
    areaHa: 23.45,
    photoUrl: '/photos/field-olivares-magina.webp',
    source: demoSource,
  },
];

export const demoParcels: Parcel[] = [
  {
    id: 'parcel-1',
    farmId: 'farm-los-llanos',
    name: 'Parcela 1',
    areaHa: 5.2,
    crop: 'olive',
    oliveVariety: 'Picual',
    irrigation: 'rainfed',
    altitudeM: 650,
    plantingFrame: '7 × 7 m',
    slopePct: 12,
    healthStatus: 'good',
    agronomicNote: 'Desarrollo vegetativo correcto.',
    source: demoSource,
  },
  {
    id: 'parcel-2',
    farmId: 'farm-los-llanos',
    name: 'Parcela 2',
    areaHa: 4.4,
    crop: 'olive',
    oliveVariety: 'Picual',
    irrigation: 'rainfed',
    altitudeM: 625,
    plantingFrame: '7 × 7 m',
    slopePct: 8,
    healthStatus: 'good',
    agronomicNote: 'Sin incidencias relevantes.',
    source: demoSource,
  },
  {
    id: 'parcel-3',
    farmId: 'farm-los-llanos',
    name: 'Parcela 3',
    areaHa: 4.1,
    crop: 'olive',
    oliveVariety: 'Picual',
    irrigation: 'irrigated',
    altitudeM: 672,
    plantingFrame: '7 × 7 m',
    slopePct: 16,
    healthStatus: 'review',
    agronomicNote: 'Riesgo medio de repilo por humedad.',
    source: demoSource,
  },
  {
    id: 'parcel-4',
    farmId: 'farm-los-llanos',
    name: 'Parcela 4',
    areaHa: 5.9,
    crop: 'olive',
    oliveVariety: 'Picual',
    irrigation: 'mixed',
    altitudeM: 705,
    plantingFrame: '7 × 7 m',
    slopePct: 19,
    healthStatus: 'good',
    agronomicNote: 'Poda completada esta campaña.',
    source: demoSource,
  },
  {
    id: 'parcel-5',
    farmId: 'farm-los-llanos',
    name: 'Parcela 5',
    areaHa: 3.85,
    crop: 'olive',
    oliveVariety: 'Picual',
    irrigation: 'rainfed',
    altitudeM: 640,
    plantingFrame: '7 × 7 m',
    slopePct: 10,
    healthStatus: 'good',
    agronomicNote: 'Revisar humedad de suelo en 48 h.',
    source: demoSource,
  },
];

export const demoJournalEntries: JournalEntry[] = [
  {
    id: 'journal-planned-irrigation',
    farmId: 'farm-los-llanos',
    parcelId: 'parcel-3',
    occurredAt: '2026-09-04T08:00:00+02:00',
    kind: 'irrigation',
    title: 'Riego',
    detail: 'Revisión de riego en Parcela 3',
    status: 'planned',
    createdAt: '2026-09-02T20:00:00+02:00',
    source: demoSource,
  },
  {
    id: 'journal-treatment-2026-09-02',
    farmId: 'farm-los-llanos',
    parcelId: 'parcel-3',
    occurredAt: '2026-09-02T09:00:00+02:00',
    kind: 'treatment',
    title: 'Tratamiento',
    detail: 'Cobre + aceite · Parcela 3',
    status: 'done',
    product: 'Cobre + aceite',
    createdAt: '2026-09-02T09:00:00+02:00',
    source: demoSource,
  },
  {
    id: 'journal-irrigation-2026-08-31',
    farmId: 'farm-los-llanos',
    parcelId: 'parcel-2',
    occurredAt: '2026-08-31T08:30:00+02:00',
    kind: 'irrigation',
    title: 'Riego',
    detail: 'Parcela 2 · 30 mm',
    status: 'done',
    quantity: 30,
    unit: 'mm',
    createdAt: '2026-08-31T08:30:00+02:00',
    source: demoSource,
  },
  {
    id: 'journal-pruning-2026-08-29',
    farmId: 'farm-los-llanos',
    parcelId: 'parcel-1',
    occurredAt: '2026-08-29T10:15:00+02:00',
    kind: 'pruning',
    title: 'Poda en verde',
    detail: 'Parcela 1',
    status: 'done',
    createdAt: '2026-08-29T10:15:00+02:00',
    source: demoSource,
  },
  {
    id: 'journal-fertilization-2026-08-22',
    farmId: 'farm-los-llanos',
    parcelId: 'parcel-3',
    occurredAt: '2026-08-22T09:45:00+02:00',
    kind: 'fertilization',
    title: 'Abonado',
    detail: 'Parcela 3 · Los Llanos',
    status: 'done',
    createdAt: '2026-08-22T09:45:00+02:00',
    source: demoSource,
  },
];

export const demoCampaigns: Campaign[] = [
  {
    id: 'campaign-2025-26',
    farmId: 'farm-los-llanos',
    label: '2025/26',
    startsOn: '2025-10-01',
    endsOn: '2026-03-31',
    harvestedKg: 18420,
    averageYieldPct: 22.7,
    source: demoSource,
  },
];

export const demoWeather: WeatherSnapshot = {
  id: 'weather-bedmar-demo',
  locationLabel: 'Bedmar',
  observedAt: '2026-09-03T08:00:00+02:00',
  temperatureC: 22,
  maxTemperatureC: 26,
  minTemperatureC: 14,
  conditionLabel: 'Soleado',
  humidityPct: 58,
  windKmh: 9,
  rainProbabilityPct: 15,
  agronomicRecommendation: 'Condiciones demo favorables para labores ligeras durante la mañana.',
  source: demoSource,
};

export const demoAlerts: AgronomicAlert[] = [
  {
    id: 'alert-repilo-demo',
    farmId: 'farm-los-llanos',
    parcelId: 'parcel-3',
    title: 'Riesgo medio de repilo',
    detail: 'Revisa las parcelas con mayor humedad antes del próximo tratamiento.',
    severity: 'medium',
    validFrom: '2026-09-03T06:00:00+02:00',
    source: demoSource,
  },
];

export const demoMarketQuotes: MarketQuote[] = [
  {
    id: 'market-aove-demo',
    product: 'aove',
    label: 'AOVE',
    marketLabel: 'Jaén',
    priceEurKg: 5.35,
    observedAt: '2026-09-03T08:00:00+02:00',
    trend: 'up',
    weeklyChangePct: 3.4,
    source: demoSource,
  },
];

export const demoCooperatives: Cooperative[] = [
  {
    id: 'coop-san-isidro',
    name: 'S.C.A. San Isidro',
    municipality: 'Bedmar',
    province: 'Jaén',
    source: demoSource,
  },
];

export const demoNews: NewsArticle[] = [
  {
    id: 'news-1',
    title: 'Aceite de Mágina, entre los mejores del mundo',
    category: 'Sector',
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    sourceName: 'Mágina Olivo demo',
    summary: 'Contenido conceptual usado para validar la experiencia editorial.',
    imageUrl: '/photos/field-olivares-magina.webp',
    source: demoSource,
  },
];

export const demoDiscoverPlaces: DiscoverPlace[] = [
  {
    id: 'discover-mar-olivos',
    kind: 'route',
    title: 'Mar de Olivos',
    municipality: 'Bedmar',
    summary: 'Ruta demo de 7,8 km usada como referencia visual de Descubre.',
    imageUrl: '/photos/discover-sierra-magina.webp',
    distanceKm: 7.8,
    source: demoSource,
  },
];

export const demoCatalog = {
  profile: demoProfile,
  farms: demoFarms,
  parcels: demoParcels,
  journalEntries: demoJournalEntries,
  campaigns: demoCampaigns,
  weather: demoWeather,
  alerts: demoAlerts,
  marketQuotes: demoMarketQuotes,
  cooperatives: demoCooperatives,
  news: demoNews,
  discover: demoDiscoverPlaces,
} as const;
