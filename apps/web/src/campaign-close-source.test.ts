import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function read(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('campaign close is mounted in the campaign view with safe role and completion gates', async () => {
  const documents = await read('./CampaignDocuments.tsx');
  const panel = await read('./CampaignClosePanel.tsx');
  const client = await read('./campaign-close-api.ts');

  assert.match(documents, /<CampaignClosePanel holdingId=\{holdingId\} campaignId=\{campaignId\} \/>/);
  assert.match(panel, /holding\?\.role === 'owner' \|\| holding\?\.role === 'admin'/);
  assert.match(panel, /summary\.deliveriesCount < 1/);
  assert.match(panel, /summary\.pendingResultCount > 0/);
  assert.match(panel, /Cerrar campaña · \+250 🫒/);
  assert.match(panel, /closeCampaign\(campaignId\)/);
  assert.match(panel, /Solo propietario o administrador puede cerrar el ciclo de campaña/);

  assert.match(client, /\/api\/v1\/campaigns\/\$\{encodeURIComponent\(campaignId\)\}\/close/);
  assert.match(client, /method: 'POST'/);
  assert.match(client, /credentials: 'include'/);
});

test('campaign close UI does not claim the reward before the server confirms closure', async () => {
  const panel = await read('./CampaignClosePanel.tsx');

  const closeCall = panel.indexOf('const result = await closeCampaign(campaignId);');
  const successNotice = panel.indexOf('Campaña cerrada. +250 🫒');
  assert.ok(closeCall >= 0, 'campaign close must call the server');
  assert.ok(successNotice > closeCall, 'success reward notice must only be set after the server responds');
  assert.match(panel, /magina:campaign-closed/);
});
