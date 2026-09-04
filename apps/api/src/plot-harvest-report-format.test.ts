import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  buildPlotHarvestPdf,
  calculatePlotHarvestProductivity,
  summarizePlotHarvest,
  type PlotHarvestDelivery,
  type PlotHarvestReportInput,
} from './plot-harvest-report-format.ts';

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

test('plot harvest summary uses kilograms-weighted fat yield', () => {
  const deliveries = [
    delivery({ kilograms: '1000', yieldPercent: '20', destination: 'Cooperativa A' }),
    delivery({
      kilograms: '500',
      yieldPercent: '24',
      destination: 'Cooperativa B',
      deliveredAt: '2026-11-12T08:30:00.000Z',
    }),
    delivery({
      kilograms: '250',
      yieldPercent: null,
      destination: 'Cooperativa A',
      deliveredAt: '2026-11-14T08:30:00.000Z',
    }),
  ];

  const summary = summarizePlotHarvest(deliveries);
  assert.equal(summary.deliveryCount, 3);
  assert.equal(summary.totalKilograms, 1750);
  assert.equal(summary.yieldCoveredKilograms, 1500);
  assert.ok(summary.weightedYieldPercent != null);
  assert.ok(Math.abs(summary.weightedYieldPercent - 21.3333333333) < 0.0001);
  assert.equal(summary.firstDeliveryAt, '2026-11-10T08:30:00.000Z');
  assert.equal(summary.lastDeliveryAt, '2026-11-14T08:30:00.000Z');
  assert.deepEqual(summary.destinationTotals, [
    { destination: 'Cooperativa A', kilograms: 1250 },
    { destination: 'Cooperativa B', kilograms: 500 },
  ]);
});

test('plot productivity derives kg per hectare and kg per olive tree only from valid plot data', () => {
  const productivity = calculatePlotHarvestProductivity(1842, '2.4500', 320);
  assert.ok(productivity.kilogramsPerHectare != null);
  assert.ok(productivity.kilogramsPerOliveTree != null);
  assert.ok(Math.abs(productivity.kilogramsPerHectare - 751.83673469) < 0.0001);
  assert.ok(Math.abs(productivity.kilogramsPerOliveTree - 5.75625) < 0.0001);

  assert.deepEqual(calculatePlotHarvestProductivity(1842, null, null), {
    kilogramsPerHectare: null,
    kilogramsPerOliveTree: null,
  });
  assert.deepEqual(calculatePlotHarvestProductivity(1842, '0', 0), {
    kilogramsPerHectare: null,
    kilogramsPerOliveTree: null,
  });
});

test('plot harvest PDF is a private-report-ready A4 PDF payload', () => {
  const input: PlotHarvestReportInput = {
    generatedAt: '2026-12-01T12:00:00.000Z',
    holding: { name: 'Mi Olivar', municipality: 'Mancha Real', province: 'Jaen' },
    farm: { name: 'Las Lomas' },
    plot: {
      name: 'Parcela Norte',
      areaHa: '2.4500',
      sigpacReference: '23-58-0-0-12-34-1',
      irrigationType: 'dryland',
      oliveTreeCount: 320,
      notes: null,
    },
    campaign: {
      name: 'Campana 2026/27',
      seasonStartYear: 2026,
      seasonEndYear: 2027,
      startDate: '2026-10-01',
      endDate: null,
      status: 'active',
    },
    deliveries: [
      delivery({
        kilograms: '1842',
        yieldPercent: '21.4',
        notes: 'Aceituna recogida en dos jornadas.',
      }),
    ],
    documents: [
      { type: 'ticket', count: 1 },
      { type: 'yield_report', count: 1 },
    ],
  };

  const pdf = buildPlotHarvestPdf(input);
  const body = pdf.toString('latin1');
  assert.ok(pdf.subarray(0, 8).toString('latin1').startsWith('%PDF-1.4'));
  assert.match(body, /Informe de cosecha por parcela/);
  assert.match(body, /Parcela Norte/);
  assert.match(body, /Total entregado:/);
  assert.match(body, /Productividad:/);
  assert.match(body, /kg\/ha/);
  assert.match(body, /Media por olivo:/);
  assert.match(body, /kg\/olivo/);
  assert.match(body, /Documentos vinculados: 2/);
  assert.match(body, /xref/);
  assert.match(body, /%%EOF/);
});

test('plot harvest report route is authenticated, holding-isolated and registered', async () => {
  const routes = await readFile(new URL('./plot-harvest-report-routes.ts', import.meta.url), 'utf8');
  const app = await readFile(new URL('./app.ts', import.meta.url), 'utf8');

  assert.match(routes, /getAuthenticatedSession/);
  assert.match(routes, /getCampaignAccess\(userId, campaignId\)/);
  assert.match(routes, /getPlotAccess\(userId, plotId\)/);
  assert.match(routes, /campaignAccess\.holdingId !== plotAccess\.holdingId/);
  assert.match(routes, /d\.campaign_id = \$2/);
  assert.match(routes, /d\.plot_id = \$3/);
  assert.match(routes, /d\.verification_status <> 'archived'/);
  assert.match(routes, /private, no-store/);
  assert.match(routes, /application\/pdf/);
  assert.match(routes, /\/api\/v1\/campaigns\/:campaignId\/plots\/:plotId\/harvest-report\.pdf/);
  assert.match(app, /registerPlotHarvestReportRoutes\(app\)/);
});
