import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  buildHoldingHarvestPdf,
  summarizeHoldingHarvest,
  type HoldingHarvestReportInput,
} from './holding-harvest-report-format.ts';
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

function fixture(): HoldingHarvestReportInput {
  return {
    generatedAt: '2026-12-01T12:00:00.000Z',
    holding: { name: 'Mi Olivar', municipality: 'Mancha Real', province: 'Jaen' },
    campaign: { name: 'Campana 2026/27', seasonStartYear: 2026, seasonEndYear: 2027 },
    plots: [
      {
        id: 'plot-a',
        farmName: 'Las Lomas',
        name: 'Parcela Norte',
        areaHa: '2',
        oliveTreeCount: 100,
        deliveries: [
          delivery({ kilograms: '1000', yieldPercent: '20', destination: 'Cooperativa A' }),
          delivery({ kilograms: '500', yieldPercent: '24', destination: 'Cooperativa B' }),
        ],
      },
      {
        id: 'plot-b',
        farmName: 'Las Lomas',
        name: 'Parcela Sur',
        areaHa: '1',
        oliveTreeCount: 50,
        deliveries: [
          delivery({ kilograms: '500', yieldPercent: '18', destination: 'Cooperativa A' }),
        ],
      },
      {
        id: 'plot-c',
        farmName: 'Los Llanos',
        name: 'Parcela Sin Cosecha',
        areaHa: '1.5',
        oliveTreeCount: 100,
        deliveries: [],
      },
    ],
  };
}

test('holding harvest summary consolidates only harvested area and trees for global productivity', () => {
  const summary = summarizeHoldingHarvest(fixture().plots);

  assert.equal(summary.plotCount, 3);
  assert.equal(summary.harvestedPlotCount, 2);
  assert.equal(summary.deliveryCount, 3);
  assert.equal(summary.totalKilograms, 2000);
  assert.equal(summary.representedAreaHa, 3);
  assert.equal(summary.representedOliveTreeCount, 150);
  assert.ok(summary.kilogramsPerHectare != null);
  assert.ok(Math.abs(summary.kilogramsPerHectare - 666.6666667) < 0.0001);
  assert.ok(summary.kilogramsPerOliveTree != null);
  assert.ok(Math.abs(summary.kilogramsPerOliveTree - 13.3333333) < 0.0001);
  assert.ok(summary.weightedYieldPercent != null);
  assert.ok(Math.abs(summary.weightedYieldPercent - 20.5) < 0.0001);
  assert.equal(summary.topByKilograms?.name, 'Parcela Norte');
  assert.equal(summary.topByHectare?.name, 'Parcela Norte');
  assert.deepEqual(summary.destinationTotals, [
    { destination: 'Cooperativa A', kilograms: 1500 },
    { destination: 'Cooperativa B', kilograms: 500 },
  ]);
});

test('holding harvest PDF contains global and per-plot summaries', () => {
  const pdf = buildHoldingHarvestPdf(fixture());
  const body = pdf.toString('latin1');

  assert.ok(pdf.subarray(0, 8).toString('latin1').startsWith('%PDF-1.4'));
  assert.match(body, /Informe global de cosecha/);
  assert.match(body, /Resumen de explotacion/);
  assert.match(body, /Detalle por parcela/);
  assert.match(body, /Parcela Norte/);
  assert.match(body, /Parcela Sur/);
  assert.match(body, /Parcela Sin Cosecha/);
  assert.match(body, /Mayor cosecha:/);
  assert.match(body, /Mayor kg\/ha:/);
  assert.match(body, /Totales por destino/);
  assert.match(body, /%%EOF/);
});

test('holding harvest route is authenticated and derives holding scope from campaign access', async () => {
  const routes = await readFile(new URL('./holding-harvest-report-routes.ts', import.meta.url), 'utf8');
  const app = await readFile(new URL('./app.ts', import.meta.url), 'utf8');

  assert.match(routes, /getAuthenticatedSession/);
  assert.match(routes, /getCampaignAccess\(userId, campaignId\)/);
  assert.match(routes, /const holdingId = access\.holdingId/);
  assert.match(routes, /c\.holding_id = \$2/);
  assert.match(routes, /p\.holding_id = \$1/);
  assert.match(routes, /d\.holding_id = \$1/);
  assert.match(routes, /d\.campaign_id = \$2/);
  assert.match(routes, /d\.verification_status <> 'archived'/);
  assert.match(routes, /private, no-store/);
  assert.match(routes, /application\/pdf/);
  assert.match(routes, /\/api\/v1\/campaigns\/:campaignId\/harvest-report\.pdf/);
  assert.match(app, /registerHoldingHarvestReportRoutes\(app\)/);
});
