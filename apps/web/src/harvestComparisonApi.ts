import { ApiError } from './api.ts';

export type HarvestMetricComparison = {
  current: number | null;
  previous: number | null;
  absoluteChange: number | null;
  percentChange: number | null;
};

export type HarvestPlotComparison = {
  id: string;
  farmName: string;
  name: string;
  currentKilograms: number;
  previousKilograms: number;
  kilogramsChange: number;
  currentKilogramsPerHectare: number | null;
  previousKilogramsPerHectare: number | null;
  kilogramsPerHectareChange: number | null;
  currentYieldPercent: number | null;
  previousYieldPercent: number | null;
  yieldPercentagePointChange: number | null;
};

export type HarvestCampaignComparison = {
  currentCampaign: {
    name: string;
    seasonStartYear: number;
    seasonEndYear: number;
  };
  previousCampaign: {
    name: string;
    seasonStartYear: number;
    seasonEndYear: number;
  } | null;
  base: {
    activeAreaHa: number;
    activeOliveTreeCount: number;
  };
  metrics: {
    totalKilograms: HarvestMetricComparison;
    kilogramsPerHectare: HarvestMetricComparison;
    kilogramsPerOliveTree: HarvestMetricComparison;
    weightedYieldPercent: HarvestMetricComparison;
  };
  balance: {
    improvedPlots: number;
    worsenedPlots: number;
    stablePlots: number;
  };
  improvedPlots: HarvestPlotComparison[];
  worsenedPlots: HarvestPlotComparison[];
  plots: HarvestPlotComparison[];
};

export async function getHarvestCampaignComparison(campaignId: string): Promise<HarvestCampaignComparison> {
  const response = await fetch(`/api/v1/campaigns/${campaignId}/harvest-comparison`, {
    credentials: 'include',
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    let code: string | undefined;
    try {
      const body = (await response.json()) as { error?: { message?: string; code?: string } };
      message = body.error?.message ?? message;
      code = body.error?.code;
    } catch {
      // Keep the generic HTTP message when the API did not return JSON.
    }
    throw new ApiError(message, response.status, code);
  }

  return (await response.json()) as HarvestCampaignComparison;
}
