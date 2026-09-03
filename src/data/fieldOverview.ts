import type { Farm, Parcel, UserProfile } from '../domain/models';
import type { AppDataRepositories } from './contracts';

export type FieldOverviewData = {
  profile: UserProfile | null;
  farm: Farm | null;
  parcels: Parcel[];
  primaryVariety?: string;
};

function getPrimaryVariety(parcels: Parcel[]) {
  const counts = new Map<string, number>();

  for (const parcel of parcels) {
    if (!parcel.oliveVariety) continue;
    counts.set(parcel.oliveVariety, (counts.get(parcel.oliveVariety) ?? 0) + 1);
  }

  let selected: string | undefined;
  let selectedCount = 0;

  for (const [variety, count] of counts) {
    if (count > selectedCount) {
      selected = variety;
      selectedCount = count;
    }
  }

  return selected;
}

export async function loadFieldOverview(repositories: AppDataRepositories): Promise<FieldOverviewData> {
  const profile = await repositories.profile.getCurrent();

  if (!profile) {
    return { profile: null, farm: null, parcels: [] };
  }

  const farms = await repositories.farms.listByOwner(profile.id);
  const farm = farms[0] ?? null;

  if (!farm) {
    return { profile, farm: null, parcels: [] };
  }

  const parcels = await repositories.farms.listParcels(farm.id);

  return {
    profile,
    farm,
    parcels,
    primaryVariety: getPrimaryVariety(parcels),
  };
}
