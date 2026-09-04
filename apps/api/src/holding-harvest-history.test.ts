import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildHoldingHarvestHistory,
  type HoldingHarvestHistoryCampaignInput,
} from './holding-harvest-history.ts';
import type { HoldingHarvestPlot } from './holding-harvest-report-format.ts';
import type { PlotHarvestDelivery } from './plot-harvest-report-format.ts';

function delivery(kilograms: string, yieldPercent: string | null): PlotHarvestDelivery {
  return {
    id: crypto.randomUUID(),
    deliveredAt: '2026-11-10T08:30:00.000Z',
    kilograms,
    destination: 'SCA Sierra Magina',
    ticketNumber: null,
    variety: 'Picual',
    yieldPercent,
    verificationStatus: 'confirmed',
    notes: null,
  };
}

function plots(a: PlotHarvestDelivery[], b: PlotHarvestDelivery[]): HoldingHarvestPlot[] {
  return [
    {
      id: 'plot-a',
      farmName: 'Las Lomas',
      name: 'Parcela Norte',
      areaHa: '2',
      oliveTreeCount: 100,
      deliveries: a,
    },
    {
      id: 'plot-b',
      farmName: 'Las Lomas',
      name: 'Parcela Sur',
      areaHa: '1',
      oliveTreeCount: 50,
      deliveries: b,
    },
  ];
}

function campaigns(): HoldingHarvestHistoryCampaignInput[] {
  return [
    {
      id: 'campaign-2026',
      name: 'Campana 2026/27',
      seasonStartYear: 2026,
      seasonEndYear: 2027,
      status: 'active',
      plots: plots([delivery('1200', '22')], [delivery('600', '18')]),
    },
    {
      id: 'campaign-2024',
      name: 'Campana 2024/25',
      seasonStartYear: 2024,
      seasonEndYear: 2025,
      status: 'closed',
      plots: plots([delivery('900', '19')], [delivery('300', null)]),
    },
    {
      id: 'campaign-2025',
      name: 'Campana 2025/26',
      seasonStartYear: 2025,
      seasonEndYear: 2026,
      status: 'closed',
      plots: plots([delivery('1000', '20')], [delivery('500', '20')]),
    },
  ];
}

test('holding harvest history keeps one fixed active base and sorts campaigns chronologically', () => {
  const history = buildHoldingHarvestHistory(campaigns());

  assert.equal(history.activeAreaHa, 3);
  assert.equal(history.activeOliveTreeCount, 150);
  assert.deepEqual(history.items.map((item) => item.campaignId), [
    'campaign-2024',
    'campaign-2025',
    'campaign-2026',
  ]);
  assert.equal(history.items[0]?.totalKilograms, 1200);
  assert.equal(history.items[0]?.kilogramsPerHectare, 400);
  assert.equal(history.items[0]?.kilogramsPerOliveTree, 8);
  assert.equal(history.items[1]?.totalKilograms, 1500);
  assert.equal(history.items[1]?.kilogramsPerHectare, 500);
  assert.equal(history.items[1]?.kilogramsPerOliveTree, 10);
  assert.equal(history.items[2]?.totalKilograms, 1800);
  assert.equal(history.items[2]?.kilogramsPerHectare, 600);
  assert.equal(history.items[2]?.kilogramsPerOliveTree, 12);
});

test('holding harvest history preserves weighted yield and missing data semantics', () => {
  const history = buildHoldingHarvestHistory(campaigns());
  const oldest = history.items[0];
  const middle = history.items[1];
  const latest = history.items[2];

  assert.ok(oldest?.weightedYieldPercent != null);
  assert.ok(Math.abs((oldest?.weightedYieldPercent ?? 0) - 19) < 0.0001);
  assert.equal(middle?.weightedYieldPercent, 20);
  assert.ok(latest?.weightedYieldPercent != null);
  assert.ok(Math.abs((latest?.weightedYieldPercent ?? 0) - (37200 / 1800)) < 0.0001);
});

test('holding harvest history returns an empty neutral history when no campaigns exist', () => {
  const history = buildHoldingHarvestHistory([]);
  assert.equal(history.activeAreaHa, 0);
  assert.equal(history.activeOliveTreeCount, 0);
  assert.deepEqual(history.items, []);
});
