import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildCampaignCsv, csvCell, type CampaignExportDelivery } from './campaign-export-format.ts';

test('campaign CSV is UTF-8, quoted and spreadsheet-safe', () => {
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell('Aceite "El Olivo"'), '"Aceite ""El Olivo"""');
  assert.equal(csvCell('=2+2'), '"\'=2+2"');
  assert.equal(csvCell('@SUM(A1:A2)'), '"\'@SUM(A1:A2)"');

  const delivery: CampaignExportDelivery = {
    id: '11111111-1111-4111-8111-111111111111',
    deliveredAt: '2026-11-18T18:42:00.000Z',
    kilograms: '1842',
    cooperativeId: null,
    cooperativeName: null,
    customDestination: '=HYPERLINK("https://example.test")',
    destination: '=HYPERLINK("https://example.test")',
    farmId: null,
    farmName: 'Las Viñas',
    plotId: null,
    plotName: null,
    ticketNumber: '004281',
    variety: 'Picual',
    yieldPercent: '21.4',
    verificationStatus: 'confirmed',
    notes: 'Texto, con coma y "comillas"',
  };

  const csv = buildCampaignCsv([delivery]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.endsWith('\r\n'));
  assert.match(csv, /"delivery_id","delivered_at","kilograms"/);
  assert.match(csv, /"'=HYPERLINK\(""https:\/\/example\.test""\)"/);
  assert.match(csv, /"Texto, con coma y ""comillas"""/);
  assert.match(csv, /"21\.4"/);
});

test('campaign export routes stay private, isolated and registered', async () => {
  const routes = await readFile(new URL('./campaign-export-routes.ts', import.meta.url), 'utf8');
  const app = await readFile(new URL('./app.ts', import.meta.url), 'utf8');

  assert.match(routes, /getAuthenticatedSession/);
  assert.match(routes, /getCampaignAccess\(userId, campaignId\)/);
  assert.match(routes, /c\.holding_id = \$2/);
  assert.match(routes, /d\.holding_id = \$1/);
  assert.match(routes, /r\.status = 'current'/);
  assert.match(routes, /private, no-store/);
  assert.match(routes, /Content-Disposition/);
  assert.match(routes, /\/api\/v1\/campaigns\/:campaignId\/export\.json/);
  assert.match(routes, /\/api\/v1\/campaigns\/:campaignId\/export\.csv/);
  assert.match(routes, /\/api\/v1\/campaigns\/:campaignId\/export\.pdf/);
  assert.match(routes, /application\/pdf/);
  assert.match(routes, /buildCampaignHarvestReportPdf\(payload\)/);
  assert.match(app, /registerCampaignExportRoutes\(app\)/);
});
