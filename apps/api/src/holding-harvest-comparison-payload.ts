import {
  calculateHoldingHarvestComparison,
  type HoldingHarvestComparisonInput,
} from './holding-harvest-comparison-format.ts';

export function buildHoldingHarvestComparisonPayload(report: HoldingHarvestComparisonInput) {
  const comparison = calculateHoldingHarvestComparison(report);
  return {
    currentCampaign: {
      name: report.current.name,
      seasonStartYear: report.current.seasonStartYear,
      seasonEndYear: report.current.seasonEndYear,
    },
    previousCampaign: report.previous ? {
      name: report.previous.name,
      seasonStartYear: report.previous.seasonStartYear,
      seasonEndYear: report.previous.seasonEndYear,
    } : null,
    base: {
      activeAreaHa: comparison.activeAreaHa,
      activeOliveTreeCount: comparison.activeOliveTreeCount,
    },
    metrics: {
      totalKilograms: comparison.totalKilograms,
      kilogramsPerHectare: comparison.kilogramsPerHectare,
      kilogramsPerOliveTree: comparison.kilogramsPerOliveTree,
      weightedYieldPercent: comparison.weightedYieldPercent,
    },
    balance: {
      improvedPlots: comparison.improvedPlots.length,
      worsenedPlots: comparison.worsenedPlots.length,
      stablePlots: comparison.stablePlotCount,
    },
    improvedPlots: comparison.improvedPlots.slice(0, 5),
    worsenedPlots: comparison.worsenedPlots.slice(0, 5),
    plots: comparison.plots,
  };
}
