import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  buildHoldingHarvestComparisonPdf,
  calculateHoldingHarvestComparison,
  type HoldingHarvestComparisonInput,
} from './holding-harvest-comparison-format.ts';
import { comparisonPayload } from './holding-harvest-report-routes.ts';
import type { PlotHarvestDelivery } from './plot-harvest-report-format.ts';

function delivery(overrides: Partial<PlotHarvestDelivery> = {}): PlotHarvestDelivery {
  return {
    id: crypto.randomUUID(),
    deliveredAt: '2026-11-10T08:30:00.000Z',
    kilograms: '1000',
    destination: 'SCA Sierra Magina',
    ticketNumber: 'T-001',
    variety: 'Picual',
    yieldPercent: '20',
    verificationStatus: 'confirmed',
    notes: null,
    ...overrides,
  };
}

function fixture(): HoldingHarvestComparisonInput {
  return {
    generatedAt: '2026-12-01T12:00:00.000Z',
    holding: { name: 'Mi Olivar', municipality: 'Mancha Real', province: 'Jaen' },
    current: {
      name: 'Campana 2026/27',
      seasonStartYear: 2026,
      seasonEndYear: 2027,
      plots: [
        {
          id: 'plot-a',
          farmName: 'Las Lomas',
          name: 'Parcela Norte',
          areaHa: '2',
          oliveTreeCount: 100,
          deliveries: [
            delivery({ kilograms: '1000', yieldPercent: '20' }),
            delivery({ kilograms: '500', yieldPercent: '24' }),
          ],
        },
        {
          id: 'plot-b',
          farmName: 'Las Lomas',
          name: 'Parcela Sur',
          areaHa: '1',
          oliveTreeCount: 50,
          deliveries: [delivery({ kilograms: '500', yieldPercent: '18' })],
        },
        {
          id: 'plot-c',
          farmName: 'Los Llanos',
          name: 'Parcela Este',
          areaHa: '1.5',
          oliveTreeCount: 100,
          deliveries: [],
        },
      ],
    },
    previous: {
      name: 'Campana 2025/26',
      seasonStartYear: 2025,
      seasonEndYear: 2026,
      plots: [
        {
          id: 'plot-a',
          farmName: 'Las Lomas',
          name: 'Parcela Norte',
          areaHa: '2',
          oliveTreeCount: 100,
          deliveries: [delivery({ kilograms: '1000', yieldPercent: '20' })],
        },
        {
          id: 'plot-b',
          farmName: 'Las Lomas',
          name: 'Parcela Sur',
          areaHa: '1',
          oliveTreeCount: 50,
          deliveries: [delivery({ kilograms: '800', yieldPercent: '19' })],
        },
        {
          id: 'plot-c',
          farmName: 'Los Llanos',
          name: 'Parcela Este',
          areaHa: '1.5',
          oliveTreeCount: 100,
          deliveries: [delivery({ kilograms: '200', yieldPercent: '17' })],
        },
      ],
    },
  };
}

test('holding comparison uses one fixed active area and tree base for both campaigns', () => {
  const comparison = calculateHoldingHarvestComparison(fixture());

  assert.equal(comparison.activeAreaHa, 4.5);
  assert.equal(comparison.activeOliveTreeCount, 250);
  assert.equal(comparison.totalKilograms.current, 2000);
  assert.equal(comparison.totalKilograms.previous, 2000);
  assert.equal(comparison.totalKilograms.absoluteChange, 0);
  assert.ok(comparison.kilogramsPerHectare.current != null);
  assert.ok(comparison.kilogramsPerHectare.previous != null);
  assert.ok(Math.abs(comparison.kilogramsPerHectare.current - 444.4444444) < 0.0001);
  assert.ok(Math.abs(comparison.kilogramsPerHectare.previous - 444.4444444) < 0.0001);
  assert.equal(comparison.kilogramsPerOliveTree.current, 8);
  assert.equal(comparison.kilogramsPerOliveTree.previous, 8);
  assert.ok(comparison.weightedYieldPercent.absoluteChange != null);
  assert.ok(Math.abs(comparison.weightedYieldPercent.absoluteChange - 1.2) < 0.0001);
});

test('holding comparison ranks improvements and regressions by comparable kg per hectare', () => {
  const comparison = calculateHoldingHarvestComparison(fixture());

  assert.equal(comparison.improvedPlots[0]?.name, 'Parcela Norte');
  assert.ok(Math.abs((comparison.improvedPlots[0]?.kilogramsPerHectareChange ?? 0) - 250) < 0.0001);
  assert.equal(comparison.worsenedPlots[0]?.name, 'Parcela Sur');
  assert.ok(Math.abs((comparison.worsenedPlots[0]?.kilogramsPerHectareChange ?? 0) + 300) < 0.0001);
  assert.equal(comparison.worsenedPlots[1]?.name, 'Parcela Este');
  assert.equal(comparison.stablePlotCount, 0);
});

test('holding comparison JSON payload exposes the same campaign metrics used by the PDF', () => {
  const payload = comparisonPayload(fixture());

  assert.equal(payload.currentCampaign.name, 'Campana 2026/27');
  assert.equal(payload.currentCampaign.seasonStartYear, 2026);
  assert.equal(payload.previousCampaign?.name, 'Campana 2025/26');
  assert.equal(payload.previousCampaign?.seasonStartYear, 2025);
  assert.equal(payload.base.activeAreaHa, 4.5);
  assert.equal(payload.base.activeOliveTreeCount, 250);
  assert.equal(payload.metrics.totalKilograms.current, 2000);
  assert.equal(payload.metrics.totalKilograms.previous, 2000);
  assert.equal(payload.metrics.kilogramsPerOliveTree.current, 8);
  assert.equal(payload.metrics.kilogramsPerOliveTree.previous, 8);
  assert.equal(payload.balance.improvedPlots, 1);
  assert.equal(payload.balance.worsenedPlots, 2);
  assert.equal(payload.balance.stablePlots, 0);
  assert.equal(payload.improvedPlots[0]?.name, 'Parcela Norte');
  assert.equal(payload.worsenedPlots[0]?.name, 'Parcela Sur');
  assert.equal(payload.plots.length, 3);
});

test('holding comparison PDF contains current, previous and per-plot comparison sections', () => {
  const pdf = buildHoldingHarvestComparisonPdf(fixture());
  const body = pdf.toString('latin1');

  assert.ok(pdf.subarray(0, 8).toString('latin1').startsWith('%PDF-1.4'));
  assert.match(body, /Comparativa global de campanas/);
  assert.match(body, /Campana actual:/);
  assert.match(body, /Campana anterior:/);
  assert.match(body, /Resumen comparativo/);
  assert.match(body, /Parcelas que mas mejoran/);
  assert.match(body, /Parcelas que mas retroceden/);
  assert.match(body, /Detalle comparativo por parcela/);
  assert.match(body, /Parcela Norte/);
  assert.match(body, /Parcela Sur/);
  assert.match(body, /%%EOF/);
});

test('holding comparison PDF handles a missing previous campaign without inventing data', () => {
  const input = fixture();
  input.previous = null;
  const comparison = calculateHoldingHarvestComparison(input);
  const pdf = buildHoldingHarvestComparisonPdf(input);
  const body = pdf.toString('latin1');

  assert.equal(comparison.previousSummary, null);
  assert.equal(comparison.totalKilograms.previous, null);
  assert.equal(comparison.improvedPlots.length, 0);
  assert.match(body, /Sin comparativa disponible/);
  assert.match(body, /No hay una campana anterior comparable/);
});

test('holding comparison route remains authenticated and scoped to the same holding', async () => {
  const routes = await readFile(new URL('./holding-harvest-report-routes.ts', import.meta.url), 'utf8');

  assert.match(routes, /getAuthenticatedSession/);
  assert.match(routes, /getCampaignAccess\(userId, campaignId\)/);
  assert.match(routes, /const holdingId = access\.holdingId/);
  assert.match(routes, /season_start_year < \$2/);
  assert.match(routes, /holding_id = \$1/);
  assert.match(routes, /status <> 'archived'/);
  assert.match(routes, /d\.campaign_id = \$2/);
  assert.match(routes, /d\.verification_status <> 'archived'/);
  assert.match(routes, /\/api\/v1\/campaigns\/:campaignId\/harvest-comparison'/);
  assert.match(routes, /reply\.send\(comparisonPayload\(report\)\)/);
  assert.match(routes, /\/api\/v1\/campaigns\/:campaignId\/harvest-comparison\.pdf/);
  assert.match(routes, /private, no-store/);
});
