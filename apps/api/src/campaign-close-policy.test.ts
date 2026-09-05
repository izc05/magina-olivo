import assert from 'node:assert/strict';
import test from 'node:test';
import { decideCampaignClose } from './campaign-close-policy.ts';

const base = {
  role: 'owner' as const,
  status: 'active' as const,
  confirmedDeliveryCount: 1,
  pendingYieldCount: 0,
  startDate: '2026-09-01',
  existingEndDate: null,
  requestedEndDate: null,
  today: '2026-09-30',
};

test('owner can close a real completed campaign using today by default', () => {
  assert.deepEqual(decideCampaignClose(base), {
    ok: true,
    alreadyClosed: false,
    endDate: '2026-09-30',
  });
});

test('collaborator cannot close campaign lifecycle', () => {
  const decision = decideCampaignClose({ ...base, role: 'collaborator' });
  assert.equal(decision.ok, false);
  if (!decision.ok) assert.equal(decision.code, 'CAMPAIGN_CLOSE_FORBIDDEN');
});

test('empty campaign cannot be closed for loyalty', () => {
  const decision = decideCampaignClose({ ...base, confirmedDeliveryCount: 0 });
  assert.equal(decision.ok, false);
  if (!decision.ok) assert.equal(decision.code, 'CAMPAIGN_HAS_NO_CONFIRMED_DELIVERIES');
});

test('campaign with pending yield cannot be closed', () => {
  const decision = decideCampaignClose({ ...base, pendingYieldCount: 1 });
  assert.equal(decision.ok, false);
  if (!decision.ok) assert.equal(decision.code, 'CAMPAIGN_RESULTS_PENDING');
});

test('future or pre-start end date is rejected', () => {
  const future = decideCampaignClose({ ...base, requestedEndDate: '2026-10-01' });
  assert.equal(future.ok, false);
  if (!future.ok) assert.equal(future.code, 'CAMPAIGN_END_DATE_IN_FUTURE');

  const before = decideCampaignClose({ ...base, requestedEndDate: '2026-08-31' });
  assert.equal(before.ok, false);
  if (!before.ok) assert.equal(before.code, 'CAMPAIGN_END_BEFORE_START');
});

test('already closed campaign can safely retry the loyalty side effect', () => {
  const decision = decideCampaignClose({
    ...base,
    status: 'closed',
    existingEndDate: '2026-09-20',
  });
  assert.deepEqual(decision, {
    ok: true,
    alreadyClosed: true,
    endDate: '2026-09-20',
  });
});
