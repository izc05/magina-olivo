import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(path: string): Promise<string> {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('Mi Campo keeps the private farm overview wired to real holdings and farms', async () => {
  const app = await source('./App.tsx');
  const vite = await source('../vite.config.ts');

  assert.match(app, /<PrivateAccessGate returnTo=\{window\.location\.pathname\} \/>/);
  assert.match(app, /api\.farms\(holdingId\)/);
  assert.match(app, /farms\.map\(\(farm\) =>/);
  assert.match(app, /onClick=\{\(\) => setSelectedFarmId\(farm\.id\)\}/);
  assert.match(app, /aria-pressed=\{farm\.id === selectedFarmId\}/);
  assert.match(app, /api\.createFarm\(holdingId, body\)/);
  assert.match(app, /Aún no has añadido ninguna finca\./);
  assert.match(app, /Añadir mi primera finca/);
  assert.match(app, /<FieldNotebook holdingId=\{selectedHolding\.id\} farmId=\{selectedFarm\.id\} plots=\{plots\} \/>/);
  assert.ok(vite.includes('urlPattern: /\\/api\\/v1\\/public\\//'));
  assert.equal(vite.includes('urlPattern: /\\/api\\/v1\\//,'), false);
});

test('farm detail and plots remain a local visual layer over the existing private contract', async () => {
  const app = await source('./App.tsx');

  assert.match(app, /void loadPlots\(selectedFarmId\)/);
  assert.match(app, /const \[selectedPlotId, setSelectedPlotId\] = useState\(''\)/);
  assert.match(app, /plots\.some\(\(plot\) => plot\.id === current\)/);
  assert.match(app, /<section className="farm-detail-card"/);
  assert.match(app, /plots\.map\(\(plot\) =>/);
  assert.match(app, /onClick=\{\(\) => setSelectedPlotId\(plot\.id\)\}/);
  assert.match(app, /aria-pressed=\{plot\.id === selectedPlotId\}/);
  assert.match(app, /Aún no has añadido parcelas a esta finca\./);
  assert.match(app, /api\.createPlot\(farmId, body\)/);
  assert.match(app, /<FieldNotebook holdingId=\{selectedHolding\.id\} farmId=\{selectedFarm\.id\} plots=\{plots\} \/>/);
  assert.doesNotMatch(app, /boundaryGeoJson|<polygon/);
});

test('campaign and delivery composition preserves its private and offline workflow', async () => {
  const app = await source('./App.tsx');
  const delivery = await source('./DeliveryEntryCard.tsx');
  const documents = await source('./CampaignDocuments.tsx');

  assert.match(app, /selectedCampaignId/);
  assert.match(app, /summary\?\.totalKilograms/);
  assert.match(app, /summary\?\.weightedYieldPercent/);
  assert.match(app, /summary\?\.pendingResultCount/);
  assert.match(app, /Aún no tienes una campaña creada\./);
  assert.match(app, /entry\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(app, /<CampaignDocuments holdingId=\{selectedHolding\.id\} campaignId=\{selectedCampaign\.id\} deliveries=\{deliveries\} \/>/);
  assert.match(delivery, /crypto\.randomUUID\(\)/);
  assert.match(delivery, /api\.createDelivery\(campaignId, body, clientGeneratedId\)/);
  assert.match(delivery, /'offlineQueued' in result/);
  assert.match(delivery, /api\.plots\(farmId\)/);
  assert.match(delivery, /canonicalDestination.*cooperativeId/s);
  assert.match(delivery, /uploadDeliveryTicket/);
  assert.match(delivery, /tabIndex=\{-1\}/);
  assert.match(documents, /listCampaignDocuments\(holdingId, campaignId\)/);
  assert.match(documents, /privateDocumentContentUrl\(document\.id\)/);
  assert.match(documents, /Cargando archivo privado…/);
  assert.match(documents, /Aún no hay documentos/);
  assert.match(documents, /Los tickets que adjuntes a una entrega aparecerán aquí automáticamente\./);
  assert.match(documents, /role="alert"/);
  assert.match(documents, /aria-busy=\{loading\}/);
  assert.match(documents, /aria-hidden="true"/);
  assert.doesNotMatch(documents, /▤/);
  assert.match(documents, /Para hoja de cálculo/);
  assert.match(documents, /Copia completa estructurada/);
});

test('notebook and private hub keep real contracts while presenting the V2 hierarchy', async () => {
  const notebook = await source('./FieldNotebook.tsx');
  const app = await source('./App.tsx');

  assert.match(notebook, /CUADERNO/);
  assert.match(notebook, /Registra el trabajo realizado y consulta la historia de cada parcela\./);
  assert.match(notebook, /Parcela activa:/);
  assert.match(notebook, /<PlotMapPanel farmId=\{farmId\}/);
  assert.match(notebook, /api\.createActivity\(holdingId, body\)/);
  assert.match(notebook, /offlineQueued/);
  assert.match(notebook, /api\.plotTimeline\(plotId\)/);
  assert.match(notebook, /aria-pressed=\{timelineFilter === filter\}/);
  assert.match(notebook, /Labor guardada en este móvil/);
  assert.match(app, /MI MÁGINA/);
  assert.match(app, /Cuenta y ajustes/);
  assert.match(app, /href="\/cuenta"/);
  assert.match(app, /href="\/calendario"/);
  assert.match(app, /onSignOut/);
  assert.doesNotMatch(app, /Biblia Visual V2/);
});
