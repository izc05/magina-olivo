export type EconomicForecastResult = {
  totalOliveKg: number;
  weightedFatYieldPercent: number | null;
  estimatedOilKg: number;
  verifiedPriceEurPerKg: number | null;
  priceSource: string | null;
  estimatedRevenueEur: number | null;
};

export function calculateEconomicForecast(
  totalOliveKg: number,
  weightedFatYieldPercent: number | null,
  verifiedPriceEurPerKg: number | null = null,
  priceSource: string | null = null,
): EconomicForecastResult {
  const safeKg = Number.isFinite(totalOliveKg) && totalOliveKg > 0 ? totalOliveKg : 0;
  const safeYield = weightedFatYieldPercent != null && Number.isFinite(weightedFatYieldPercent) && weightedFatYieldPercent > 0 ? weightedFatYieldPercent : 0;

  const estimatedOilKg = Math.round(safeKg * (safeYield / 100));

  let estimatedRevenueEur: number | null = null;
  if (verifiedPriceEurPerKg != null && Number.isFinite(verifiedPriceEurPerKg) && verifiedPriceEurPerKg > 0 && estimatedOilKg > 0) {
    estimatedRevenueEur = Math.round(estimatedOilKg * verifiedPriceEurPerKg * 100) / 100;
  }

  const res: EconomicForecastResult = {
    totalOliveKg: safeKg,
    weightedFatYieldPercent: safeYield > 0 ? safeYield : null,
    estimatedOilKg,
    verifiedPriceEurPerKg: verifiedPriceEurPerKg ?? null,
    priceSource: priceSource ?? null,
    estimatedRevenueEur,
  };

  return res;
}
