import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

test('plot creation awards loyalty only through the best-effort server hook', async () => {
  const source = await fs.readFile(new URL('./plot-routes.ts', import.meta.url), 'utf8');
  assert.match(source, /awardLoyaltyBestEffort\(firstPlotLoyaltyAward\(session\.user\.id, row\.id\), 'plot\.create'\)/);
  assert.match(source, /if \(!row\) throw new Error\('Plot insert returned no row'\);[\s\S]*awardLoyaltyBestEffort/);
});

test('yield loyalty award runs only after the delivery result transaction commits', async () => {
  const source = await fs.readFile(new URL('./delivery-result-routes.ts', import.meta.url), 'utf8');
  const commitIndex = source.indexOf("await client.query('commit')");
  const awardIndex = source.indexOf('await awardLoyaltyBestEffort(');
  assert.ok(commitIndex >= 0, 'delivery result route must commit the agricultural write');
  assert.ok(awardIndex > commitIndex, 'loyalty side effect must run after the agricultural commit');
  assert.match(source, /yieldRecordedLoyaltyAward\(session\.user\.id, request\.params\.deliveryId, row\.id\)/);
});

test('best-effort award isolates loyalty failures from agricultural writes', async () => {
  const source = await fs.readFile(new URL('./loyalty-business-awards.ts', import.meta.url), 'utf8');
  assert.match(source, /try \{[\s\S]*await awardLoyaltyEvent\(input\);[\s\S]*\} catch \(error\)/);
  assert.match(source, /loyalty_business_award_failed/);
  assert.doesNotMatch(source, /throw error/);
});
