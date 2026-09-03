import type { AppDataRepositories } from '../contracts';
import {
  demoAlerts,
  demoCampaigns,
  demoCooperatives,
  demoDiscoverPlaces,
  demoFarms,
  demoJournalEntries,
  demoMarketQuotes,
  demoNews,
  demoParcels,
  demoProfile,
  demoWeather,
} from './catalog';

export const demoRepositories: AppDataRepositories = {
  profile: {
    async getCurrent() {
      return demoProfile;
    },
  },
  farms: {
    async listByOwner(ownerId) {
      return demoFarms.filter((farm) => farm.ownerId === ownerId);
    },
    async getById(id) {
      return demoFarms.find((farm) => farm.id === id) ?? null;
    },
    async listParcels(farmId) {
      return demoParcels.filter((parcel) => parcel.farmId === farmId);
    },
  },
  journal: {
    async listByFarm(farmId) {
      return demoJournalEntries.filter((entry) => entry.farmId === farmId);
    },
    async save(entry) {
      return entry;
    },
  },
  campaigns: {
    async listByFarm(farmId) {
      return demoCampaigns.filter((campaign) => campaign.farmId === farmId);
    },
    async listDeliveries() {
      return [];
    },
    async listExpenses() {
      return [];
    },
  },
  machinery: {
    async listByOwner() {
      return [];
    },
  },
  weather: {
    async getCurrent(locationLabel) {
      return locationLabel === demoWeather.locationLabel ? demoWeather : null;
    },
  },
  alerts: {
    async listRelevant(farmId) {
      return demoAlerts.filter((alert) => !farmId || !alert.farmId || alert.farmId === farmId);
    },
  },
  market: {
    async getLatest() {
      return demoMarketQuotes;
    },
  },
  cooperatives: {
    async list() {
      return demoCooperatives;
    },
    async getById(id) {
      return demoCooperatives.find((cooperative) => cooperative.id === id) ?? null;
    },
  },
  news: {
    async listLatest(limit = demoNews.length) {
      return demoNews.slice(0, limit);
    },
  },
  discover: {
    async listFeatured() {
      return demoDiscoverPlaces;
    },
  },
};
