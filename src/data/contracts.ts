import type {
  AgronomicAlert,
  Campaign,
  Cooperative,
  Delivery,
  DiscoverPlace,
  EntityId,
  Expense,
  Farm,
  JournalEntry,
  Machinery,
  MarketQuote,
  NewsArticle,
  Parcel,
  UserProfile,
  WeatherSnapshot,
} from '../domain/models';

export interface ProfileRepository {
  getCurrent(): Promise<UserProfile | null>;
}

export interface FarmRepository {
  listByOwner(ownerId: EntityId): Promise<Farm[]>;
  getById(id: EntityId): Promise<Farm | null>;
  listParcels(farmId: EntityId): Promise<Parcel[]>;
}

export interface JournalRepository {
  listByFarm(farmId: EntityId): Promise<JournalEntry[]>;
  save(entry: JournalEntry): Promise<JournalEntry>;
}

export interface CampaignRepository {
  listByFarm(farmId: EntityId): Promise<Campaign[]>;
  listDeliveries(campaignId: EntityId): Promise<Delivery[]>;
  listExpenses(farmId: EntityId, campaignId?: EntityId): Promise<Expense[]>;
}

export interface MachineryRepository {
  listByOwner(ownerId: EntityId): Promise<Machinery[]>;
}

export interface WeatherRepository {
  getCurrent(locationLabel: string): Promise<WeatherSnapshot | null>;
}

export interface AlertRepository {
  listRelevant(farmId?: EntityId): Promise<AgronomicAlert[]>;
}

export interface MarketRepository {
  getLatest(): Promise<MarketQuote[]>;
}

export interface CooperativeRepository {
  list(): Promise<Cooperative[]>;
  getById(id: EntityId): Promise<Cooperative | null>;
}

export interface NewsRepository {
  listLatest(limit?: number): Promise<NewsArticle[]>;
}

export interface DiscoverRepository {
  listFeatured(): Promise<DiscoverPlace[]>;
}

export type AppDataRepositories = {
  profile: ProfileRepository;
  farms: FarmRepository;
  journal: JournalRepository;
  campaigns: CampaignRepository;
  machinery: MachineryRepository;
  weather: WeatherRepository;
  alerts: AlertRepository;
  market: MarketRepository;
  cooperatives: CooperativeRepository;
  news: NewsRepository;
  discover: DiscoverRepository;
};
