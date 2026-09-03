import type {
  AgronomicAlert,
  Farm,
  JournalEntry,
  MarketQuote,
  NewsArticle,
  Parcel,
  UserProfile,
  WeatherSnapshot,
} from '../domain/models';
import type { AppDataRepositories } from './contracts';

export type HomeFieldStatus = {
  farm: Farm;
  parcel: Parcel | null;
  entry: JournalEntry | null;
};

export type HomeDashboardData = {
  profile: UserProfile | null;
  weather: WeatherSnapshot | null;
  fieldStatus: HomeFieldStatus | null;
  market: MarketQuote | null;
  alert: AgronomicAlert | null;
  news: NewsArticle | null;
};

export async function loadHomeDashboard(repositories: AppDataRepositories): Promise<HomeDashboardData> {
  const profile = await repositories.profile.getCurrent();

  const [weather, marketQuotes, alerts, news] = await Promise.all([
    profile ? repositories.weather.getCurrent(profile.municipality) : Promise.resolve(null),
    repositories.market.getLatest(),
    repositories.alerts.listRelevant(),
    repositories.news.listLatest(1),
  ]);

  let fieldStatus: HomeFieldStatus | null = null;

  if (profile) {
    const farms = await repositories.farms.listByOwner(profile.id);
    const farm = farms[0] ?? null;

    if (farm) {
      const [parcels, entries] = await Promise.all([
        repositories.farms.listParcels(farm.id),
        repositories.journal.listByFarm(farm.id),
      ]);

      const plannedEntries = entries
        .filter((entry) => entry.status === 'planned')
        .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
      const entry = plannedEntries[0] ?? entries[0] ?? null;
      const parcel = entry?.parcelId
        ? parcels.find((candidate) => candidate.id === entry.parcelId) ?? null
        : parcels[0] ?? null;

      fieldStatus = { farm, parcel, entry };
    }
  }

  return {
    profile,
    weather,
    fieldStatus,
    market: marketQuotes[0] ?? null,
    alert: alerts[0] ?? null,
    news: news[0] ?? null,
  };
}
