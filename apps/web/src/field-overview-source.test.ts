import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(path: string): Promise<string> {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('Mi Campo keeps the private farm overview wired to real holdings and farms', async () => {
  const app = await source('./App.tsx');
  const vite = await source('../vite.config.ts');

  assert.match(app, /<PrivateAccessGate returnTo=\{window\.location\.pathname\} area="field" \/>/);
  assert.match(app, /api\.farms\(holdingId\)/);
  assert.match(app, /Promise\.all\(farms\.map\(async \(farm\) => \[farm\.id, \(await api\.plots\(farm\.id\)\)\.items\.length\]/);
  assert.match(app, /farms\.map\(\(farm\) =>/);
  assert.match(app, /onClick=\{\(\) => setSelectedFarmId\(farm\.id\)\}/);
  assert.match(app, /aria-pressed=\{farm\.id === selectedFarmId\}/);
  assert.match(app, /api\.createFarm\(holdingId, body\)/);
  assert.match(app, /Aún no has añadido ninguna finca\./);
  assert.match(app, /className="field-overview-hero"/);
  assert.match(app, /className="field-overview-portal"/);
  assert.match(app, /Tu explotación, al día/);
  assert.match(app, /const openFieldView = \(view: FieldInitialView\) =>/);
  assert.match(app, /href="\/calendario"/);
  assert.match(app, /href="\/campana"/);
  assert.match(app, /selectedFarmOliveTrees/);
  assert.match(app, /className="field-hero-farm-picker"/);
  assert.match(app, /<select value=\{selectedFarmId\}/);
  assert.match(app, /Gestionar o añadir finca/);
  assert.doesNotMatch(app, /Contexto de trabajo/);
  assert.match(app, /backHref="\/mi-campo"/);
  assert.match(app, /summary\?\.weightedYieldPercent/);
  assert.match(app, /<CampaignDeliveryTrend deliveries=\{deliveries\} \/>/);
  assert.match(app, /function CampaignDeliveryTrend/);
  assert.match(app, /Evolución de entregas/);
  assert.match(app, /Añadir mi primera finca/);
  assert.match(app, /<FieldNotebook holdingId=\{selectedHolding\.id\} farmId=\{selectedFarm\.id\} plots=\{plots\} onOpenMap=\{openMapWorkspace\} initialActivityType=\{notebookActivityType\} openEntry=\{Boolean\(notebookActivityType\)\} \/>/);
  assert.ok(vite.includes('urlPattern: /\\/api\\/v1\\/public\\//'));
  assert.equal(vite.includes('urlPattern: /\\/api\\/v1\\//,'), false);
});

test('Mi Campo remembers the active farm between screens and app restarts', async () => {
  const app = await source('./App.tsx');
  assert.match(app, /localStorage\.getItem\(`magina:farm:/);
  assert.match(app, /localStorage\.setItem\(`magina:farm:/);
});

test('Mi Campo opens the map as a dedicated workspace instead of placing it after every field form', async () => {
  const app = await source('./App.tsx');
  const mapStyles = await source('./plot-map.css');

  assert.match(app, /const \[showMapWorkspace, setShowMapWorkspace\] = useState\(initialView === 'map'\)/);
  assert.match(app, /const openMapWorkspace = \(\) =>/);
  assert.match(app, /className="field-map-workspace"/);
  assert.match(app, /id="mapa-parcelas"/);
  assert.match(app, /<PlotMapPanel farmId=\{selectedFarm\.id\} \/>/);
  assert.match(app, /onOpenMap=\{openMapWorkspace\}/);
  assert.doesNotMatch(app, /className="section field-map-section"/);
  assert.match(mapStyles, /\.field-map-workspace \.plot-map-card \{ order: -1/);
  assert.match(mapStyles, /\.field-map-workspace \.plot-map-editor \{ min-height: min\(60vh, 590px\)/);
});

test('Mi Campo uses dedicated URLs for its short workspaces instead of a single long form', async () => {
  const app = await source('./App.tsx');
  const main = await source('./main.tsx');
  const notebook = await source('./FieldNotebook.tsx');

  assert.match(app, /export type FieldInitialView/);
  assert.match(app, /className="field-app-shortcuts"/);
  assert.match(app, /href="\/mi-campo\/mapa"/);
  assert.match(app, /href="\/mi-campo\/parcelas"/);
  assert.match(app, /href="\/mi-campo\/cuaderno"/);
  assert.match(app, /href="\/mi-campo\/tratamientos"/);
  assert.match(main, /path === '\/mi-campo\/mapa'/);
  assert.match(main, /initialFieldView="map"/);
  assert.match(main, /initialFieldView="treatments"/);
  assert.match(notebook, /initialActivityType\?: ActivityType/);
  assert.match(notebook, /open=\{openEntry\}/);
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
  assert.match(app, /<FieldNotebook holdingId=\{selectedHolding\.id\} farmId=\{selectedFarm\.id\} plots=\{plots\} onOpenMap=\{openMapWorkspace\} initialActivityType=\{notebookActivityType\} openEntry=\{Boolean\(notebookActivityType\)\} \/>/);
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
  assert.match(notebook, /href="#mapa-parcelas"/);
  assert.match(notebook, /Mapa, SIGPAC y Catastro/);
  assert.match(app, /<PlotMapPanel farmId=\{selectedFarm\.id\}/);
  assert.match(app, /Mapa de parcelas/);
  assert.match(notebook, /api\.createActivity\(holdingId, body\)/);
  assert.match(notebook, /offlineQueued/);
  assert.match(notebook, /api\.plotTimeline\(plotId\)/);
  assert.match(notebook, /aria-pressed=\{timelineFilter === filter\}/);
  assert.match(notebook, /Labor guardada en este móvil/);
  assert.match(app, /MI PERFIL/);
  assert.match(app, /Tu información y preferencias en un solo lugar/);
  assert.match(app, /href: '\/perfil\/editar'/);
  assert.match(app, /href: '\/perfil\/notificaciones'/);
  assert.match(app, /href: '\/perfil\/privacidad'/);
  assert.match(app, /href: '\/perfil\/preferencias'/);
  assert.match(app, /href: '\/perfil\/soporte'/);
  assert.match(app, /onSignOut/);
  assert.doesNotMatch(app, /Biblia Visual V2/);
});
