import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

test('campaign close is locked, eligibility-gated and rewarded after commit', async () => {
  const source = await fs.readFile(new URL('./campaign-routes.ts', import.meta.url), 'utf8');

  assert.match(source, /\/api\/v1\/campaigns\/:campaignId\/close/);
  assert.match(source, /for update/);
  assert.match(source, /verification_status = 'confirmed'/);
  assert.match(source, /dr\.result_type = 'fat_yield'/);
  assert.match(source, /dr\.status = 'current'/);
  assert.match(source, /decideCampaignClose\(/);
  assert.match(source, /status = 'closed'/);

  const commitIndex = source.indexOf("await client.query('commit')");
  const awardIndex = source.indexOf('campaignCompletedLoyaltyAward(');
  assert.ok(commitIndex >= 0, 'campaign close must commit its business transition');
  assert.ok(awardIndex > commitIndex, 'campaign completion reward must run after commit');
  assert.match(source, /awardLoyaltyBestEffort\([\s\S]*campaignCompletedLoyaltyAward/);
});

test('campaign completion award remains server-side and retry-safe', async () => {
  const policy = await fs.readFile(new URL('./loyalty-business-policy.ts', import.meta.url), 'utf8');
  assert.match(policy, /eventType: 'campaign\.completed'/);
  assert.match(policy, /idempotencyKey: `campaign\.completed:\$\{campaignId\}`/);
  assert.match(policy, /metadata: \{ trigger: 'campaign\.close' \}/);
});
