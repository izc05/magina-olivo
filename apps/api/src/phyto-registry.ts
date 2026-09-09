export type PhytoProduct = {
  registrationNumber: string;
  name: string;
  activeSubstance: string;
  maxDosisPerHa: string;
  safetyPeriodDays: number;
  authorizedForOlive: boolean;
};

export const OFFICIAL_OLIVE_PHYTO_REGISTRY: PhytoProduct[] = [
  {
    registrationNumber: 'ES-00124',
    name: 'Cobre Hidróxido 50% WG',
    activeSubstance: 'Hidróxido cúprico',
    maxDosisPerHa: '2.5 kg/ha',
    safetyPeriodDays: 14,
    authorizedForOlive: true,
  },
  {
    registrationNumber: 'ES-00389',
    name: 'Oxi-Cobre 50% WP',
    activeSubstance: 'Oxicloruro de cobre',
    maxDosisPerHa: '3.0 kg/ha',
    safetyPeriodDays: 15,
    authorizedForOlive: true,
  },
  {
    registrationNumber: 'ES-01052',
    name: 'Deltametrín 2.5% EC',
    activeSubstance: 'Deltametrina',
    maxDosisPerHa: '0.5 L/ha',
    safetyPeriodDays: 7,
    authorizedForOlive: true,
  },
  {
    registrationNumber: 'ES-01488',
    name: 'Piretrina Natural 4% EC',
    activeSubstance: 'Piretrinas',
    maxDosisPerHa: '0.6 L/ha',
    safetyPeriodDays: 1,
    authorizedForOlive: true,
  },
];

export function searchPhytoProducts(query: string): PhytoProduct[] {
  const norm = query.toLowerCase().trim();
  if (!norm) return [];

  return OFFICIAL_OLIVE_PHYTO_REGISTRY.filter(
    (item) =>
      item.name.toLowerCase().includes(norm) ||
      item.activeSubstance.toLowerCase().includes(norm) ||
      item.registrationNumber.toLowerCase().includes(norm),
  );
}
