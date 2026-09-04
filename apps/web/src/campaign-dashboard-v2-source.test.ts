import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('Campaign Visual V2 is wired over the canonical delivery and yield flow', async () => {
  const [app, dashboard, main] = await Promise.all([
    read('./App.tsx'),
    read('./CampaignDashboardV2.tsx'),
    read('./main.tsx'),
  ]);

  assert.match(app, /import \{ CampaignDashboardV2 \} from '\.\/CampaignDashboardV2'/);
  assert.match(app, /<CampaignDashboardV2/);
  assert.match(app, /<DeliveryEntryCard/);
  assert.match(app, /<YieldForm/);
  assert.match(app, /<DeliveryTicketButton/);
  assert.match(app, /<CampaignDocuments/);
  assert.match(app, /<CreateCampaignCard/);
  assert.match(main, /import '\.\/campaign-dashboard-v2\.css'/);

  assert.match(dashboard, /Campaña activa/);
  assert.match(dashboard, /Aceituna/);
  assert.match(dashboard, /Rendimiento/);
  assert.match(dashboard, /Entregas/);
  assert.match(dashboard, /Pendientes/);
  assert.match(dashboard, /coveragePercent/);
  assert.match(dashboard, /Registrar entrega/);
  assert.match(dashboard, /Documentos de campaña/);
  assert.doesNotMatch(dashboard, /localStorage/);
  assert.doesNotMatch(dashboard, /Math\.random/);
});

test('Campaign Visual V2 derives its headline metrics only from the real campaign summary', async () => {
  const dashboard = await read('./CampaignDashboardV2.tsx');

  assert.match(dashboard, /summary\?\.totalKilograms/);
  assert.match(dashboard, /summary\?\.weightedYieldPercent/);
  assert.match(dashboard, /summary\?\.deliveriesCount/);
  assert.match(dashboard, /summary\?\.pendingResultCount/);
  assert.match(dashboard, /summary\?\.coveragePercent/);
});
