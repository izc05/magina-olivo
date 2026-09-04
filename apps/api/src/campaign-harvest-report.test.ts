import assert from 'node:assert/strict';
import test from 'node:test';
import type { CampaignExportDelivery } from './campaign-export-format.ts';
import { buildCampaignHarvestReportPdf, summarizeHarvestByParcel } from './campaign-harvest-report.ts';

function delivery(overrides: Partial<CampaignExportDelivery> = {}): CampaignExportDelivery {
  return {
    id: 'delivery-1',
    deliveredAt: '2026-11-18T18:42:00.000Z',
    kilograms: '1000',
    cooperativeId: null,
    cooperativeName: null,
    customDestination: null,
    destination: 'S.C.A. Sierra Mágina',
    farmId: 'farm-1',
    farmName: 'Las Viñas',
    plotId: 'plot-1',
    plotName: 'Parcela Norte',
    ticketNumber: '004281',
    variety: 'Picual',
    yieldPercent: '20',
    verificationStatus: 'confirmed',
    notes: null,
    ...overrides,
  };
}

test('harvest summary groups deliveries by real parcel and weights yield by kilograms', () => {
  const summaries = summarizeHarvestByParcel([
    delivery(),
    delivery({ id: 'delivery-2', kilograms: '3000', yieldPercent: '24' }),
    delivery({ id: 'delivery-3', plotId: 'plot-2', plotName: 'Parcela Sur', kilograms: '500', yieldPercent: null }),
  ]);

  assert.equal(summaries.length, 2);
  const north = summaries.find((item) => item.plotName === 'Parcela Norte');
  assert.ok(north);
  assert.equal(north.kilograms, 4000);
  assert.equal(north.deliveriesCount, 2);
  assert.equal(north.coveredKilograms, 4000);
  assert.equal(north.weightedYieldPercent, 23);

  const south = summaries.find((item) => item.plotName === 'Parcela Sur');
  assert.ok(south);
  assert.equal(south.weightedYieldPercent, null);
  assert.equal(south.coveredKilograms, 0);
});

test('harvest PDF is a self-contained multi-line PDF without external renderer dependencies', () => {
  const pdf = buildCampaignHarvestReportPdf({
    exportedAt: '2026-11-20T09:00:00.000Z',
    holding: { name: 'Mi olivar', municipality: 'Bedmar y Garcíez', province: 'Jaén' },
    campaign: { name: 'Campaña 2026/27', seasonStartYear: 2026, seasonEndYear: 2027 },
    deliveries: [delivery()],
  });

  const ascii = pdf.toString('ascii');
  assert.ok(ascii.startsWith('%PDF-1.4'));
  assert.match(ascii, /\/Type \/Catalog/);
  assert.match(ascii, /\/Type \/Page/);
  assert.match(ascii, /\/BaseFont \/Helvetica-Bold/);
  assert.match(ascii, /xref/);
  assert.ok(pdf.byteLength > 700);
});
