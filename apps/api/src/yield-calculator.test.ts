import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateEconomicForecast } from './yield-calculator.ts';

test('calculateEconomicForecast calculates exact oil kg and revenue', () => {
  const result = calculateEconomicForecast(10000, 20.5, 4.85, 'Observatorio Junta de Andalucía');

  assert.equal(result.totalOliveKg, 10000);
  assert.equal(result.weightedFatYieldPercent, 20.5);
  assert.equal(result.estimatedOilKg, 2050);
  assert.equal(result.verifiedPriceEurPerKg, 4.85);
  assert.equal(result.estimatedRevenueEur, 9942.5);
  assert.equal(result.priceSource, 'Observatorio Junta de Andalucía');
});

test('calculateEconomicForecast handles missing price gracefully', () => {
  const result = calculateEconomicForecast(5000, 22.0);

  assert.equal(result.totalOliveKg, 5000);
  assert.equal(result.estimatedOilKg, 1100);
  assert.equal(result.estimatedRevenueEur, null);
});
