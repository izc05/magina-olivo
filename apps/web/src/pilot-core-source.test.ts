import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('pilot core keeps the complete grower journey wired end to end', async () => {
  const app = await read('./App.tsx');
  const deliveryEntry = await read('./DeliveryEntryCard.tsx');
  const api = await read('./api.ts');
  const deliveryRoutes = await read('../../api/src/delivery-routes.ts');
  const resultRoutes = await read('../../api/src/delivery-result-routes.ts');
  const summaryRoutes = await read('../../api/src/campaign-summary-routes.ts');

  assert.match(app, /Crear explotación/);
  assert.match(app, /Añadir finca/);
  assert.match(app, /Añadir parcela/);
  assert.match(app, /Crear campaña/);
  assert.match(app, /<DeliveryEntryCard/);
  assert.match(app, /api\.createYield\(deliveryId, value\)/);
  assert.match(app, /weightedYieldPercent/);
  assert.match(app, /pendingResultCount/);
  assert.match(app, /Rendimientos pendientes/);

  assert.match(deliveryEntry, /api\.createDelivery/);
  assert.match(deliveryEntry, /crypto\.randomUUID\(\)/);
  assert.match(deliveryEntry, /customDestination/);
  assert.match(deliveryEntry, /ticketNumber/);

  assert.match(api, /queueDeliveryOffline/);
  assert.match(api, /\/api\/v1\/campaigns\/\$\{campaignId\}\/deliveries/);
  assert.match(api, /\/api\/v1\/deliveries\/\$\{deliveryId\}\/results/);

  assert.match(deliveryRoutes, /Idempotency-Key/);
  assert.match(deliveryRoutes, /IDEMPOTENCY_KEY_REQUIRED/);
  assert.match(deliveryRoutes, /DESTINATION_REQUIRED/);
  assert.match(resultRoutes, /status = 'superseded'/);
  assert.match(resultRoutes, /status = 'current'/);
  assert.match(summaryRoutes, /weightedYieldPercent/);
  assert.match(summaryRoutes, /pendingResultCount/);
});

test('pilot core preserves private/offline safeguards around the journey', async () => {
  const app = await read('./App.tsx');
  const api = await read('./api.ts');

  assert.match(app, /offline_locked/);
  assert.match(app, /listPendingOperations/);
  assert.match(app, /Sincronízalos antes de cerrar sesión/);
  assert.match(api, /magina:delivery-offline-queued/);
  assert.match(api, /magina:activity-offline-queued/);
  assert.match(api, /credentials: 'include'/);
});
