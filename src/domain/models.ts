export type EntityId = string;
export type ISODate = string;
export type ISODateTime = string;

export type DataOrigin = 'demo' | 'user' | 'external';

export type DataSource = {
  origin: DataOrigin;
  authoritative: boolean;
  provider?: string;
  sourceUrl?: string;
  retrievedAt?: ISODateTime;
};

export type GeoPoint = {
  lat: number;
  lng: number;
};

export type UserProfile = {
  id: EntityId;
  displayName: string;
  municipality: string;
  province: string;
  preferredCooperativeId?: EntityId;
  source: DataSource;
};

export type Farm = {
  id: EntityId;
  ownerId: EntityId;
  name: string;
  municipality: string;
  province: string;
  areaHa: number;
  photoUrl?: string;
  centroid?: GeoPoint;
  source: DataSource;
};

export type IrrigationMode = 'rainfed' | 'irrigated' | 'mixed' | 'unknown';

export type Parcel = {
  id: EntityId;
  farmId: EntityId;
  name: string;
  areaHa: number;
  crop: 'olive';
  oliveVariety?: string;
  irrigation: IrrigationMode;
  boundary?: GeoPoint[];
  source: DataSource;
};

export type JournalEntryKind =
  | 'irrigation'
  | 'treatment'
  | 'fertilization'
  | 'pruning'
  | 'harvest'
  | 'inspection'
  | 'incident'
  | 'note';

export type JournalEntryStatus = 'planned' | 'done' | 'cancelled';

export type JournalEntry = {
  id: EntityId;
  farmId: EntityId;
  parcelId?: EntityId;
  occurredAt: ISODateTime;
  kind: JournalEntryKind;
  title: string;
  detail?: string;
  status: JournalEntryStatus;
  quantity?: number;
  unit?: string;
  product?: string;
  photoUrls?: string[];
  createdAt: ISODateTime;
  source: DataSource;
};

export type Campaign = {
  id: EntityId;
  farmId: EntityId;
  label: string;
  startsOn: ISODate;
  endsOn?: ISODate;
  harvestedKg: number;
  averageYieldPct?: number;
  source: DataSource;
};

export type Delivery = {
  id: EntityId;
  campaignId: EntityId;
  cooperativeId?: EntityId;
  deliveredAt: ISODateTime;
  kilograms: number;
  yieldPct?: number;
  ticketReference?: string;
  source: DataSource;
};

export type ExpenseCategory =
  | 'treatment'
  | 'fertilizer'
  | 'irrigation'
  | 'machinery'
  | 'fuel'
  | 'labor'
  | 'other';

export type Expense = {
  id: EntityId;
  farmId: EntityId;
  campaignId?: EntityId;
  parcelId?: EntityId;
  occurredOn: ISODate;
  category: ExpenseCategory;
  concept: string;
  amountEur: number;
  source: DataSource;
};

export type Machinery = {
  id: EntityId;
  ownerId: EntityId;
  name: string;
  category: string;
  notes?: string;
  nextServiceOn?: ISODate;
  source: DataSource;
};

export type AlertSeverity = 'info' | 'low' | 'medium' | 'high';

export type AgronomicAlert = {
  id: EntityId;
  farmId?: EntityId;
  parcelId?: EntityId;
  title: string;
  detail: string;
  severity: AlertSeverity;
  validFrom: ISODateTime;
  validUntil?: ISODateTime;
  source: DataSource;
};

export type WeatherSnapshot = {
  id: EntityId;
  locationLabel: string;
  observedAt: ISODateTime;
  temperatureC: number;
  humidityPct?: number;
  windKmh?: number;
  rainProbabilityPct?: number;
  agronomicRecommendation?: string;
  source: DataSource;
};

export type MarketQuote = {
  id: EntityId;
  product: 'aove' | 'virgin' | 'lampante';
  label: string;
  priceEurKg: number;
  observedAt: ISODateTime;
  trend?: 'up' | 'flat' | 'down';
  source: DataSource;
};

export type Cooperative = {
  id: EntityId;
  name: string;
  municipality: string;
  province: string;
  websiteUrl?: string;
  phone?: string;
  address?: string;
  source: DataSource;
};

export type NewsArticle = {
  id: EntityId;
  title: string;
  category: string;
  publishedAt: ISODateTime;
  sourceName: string;
  summary?: string;
  imageUrl?: string;
  externalUrl?: string;
  source: DataSource;
};

export type DiscoverPlace = {
  id: EntityId;
  kind: 'route' | 'place' | 'oleotourism' | 'event';
  title: string;
  municipality: string;
  summary: string;
  imageUrl?: string;
  distanceKm?: number;
  coordinates?: GeoPoint;
  source: DataSource;
};
