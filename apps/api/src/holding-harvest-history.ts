import {
  summarizeHoldingHarvest,
  type HoldingHarvestPlot,
} from './holding-harvest-report-format.ts';

export type HoldingHarvestHistoryCampaignInput = {
  id: string;
  name: string;
  seasonStartYear: number;
  seasonEndYear: number;
  status: string;
  plots: HoldingHarvestPlot[];
};

export type HoldingHarvestHistoryPoint = {
  campaignId: string;
  name: string;
  seasonStartYear: number;
  seasonEndYear: number;
  status: string;
  deliveriesCount: number;
  totalKilograms: number;
  kilogramsPerHectare: number | null;
  kilogramsPerOliveTree: number | null;
  weightedYieldPercent: number | null;
};

export type HoldingHarvestHistory = {
  activeAreaHa: number;
  activeOliveTreeCount: number;
  items: HoldingHarvestHistoryPoint[];
};

function numeric(value: string | null): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function fixedBase(plots: HoldingHarvestPlot[]): { activeAreaHa: number; activeOliveTreeCount: number } {
  return plots.reduce(
    (base, plot) => ({
      activeAreaHa: base.activeAreaHa + numeric(plot.areaHa),
      activeOliveTreeCount: base.activeOliveTreeCount + Math.max(0, plot.oliveTreeCount ?? 0),
    }),
    { activeAreaHa: 0, activeOliveTreeCount: 0 },
  );
}

export function buildHoldingHarvestHistory(
  campaigns: HoldingHarvestHistoryCampaignInput[],
): HoldingHarvestHistory {
  const basePlots = campaigns[0]?.plots ?? [];
  const base = fixedBase(basePlots);

  const items = campaigns
    .map<HoldingHarvestHistoryPoint>((campaign) => {
      const summary = summarizeHoldingHarvest(campaign.plots);
      return {
        campaignId: campaign.id,
        name: campaign.name,
        seasonStartYear: campaign.seasonStartYear,
        seasonEndYear: campaign.seasonEndYear,
        status: campaign.status,
        deliveriesCount: summary.deliveriesCount,
        totalKilograms: summary.totalKilograms,
        kilogramsPerHectare: base.activeAreaHa > 0 ? summary.totalKilograms / base.activeAreaHa : null,
        kilogramsPerOliveTree: base.activeOliveTreeCount > 0 ? summary.totalKilograms / base.activeOliveTreeCount : null,
        weightedYieldPercent: summary.weightedYieldPercent,
      };
    })
    .sort((a, b) => (
      a.seasonStartYear - b.seasonStartYear
      || a.seasonEndYear - b.seasonEndYear
      || a.name.localeCompare(b.name)
    ));

  return {
    activeAreaHa: base.activeAreaHa,
    activeOliveTreeCount: base.activeOliveTreeCount,
    items,
  };
}
