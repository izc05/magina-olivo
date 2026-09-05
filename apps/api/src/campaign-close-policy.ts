import type { MembershipRole } from './authorization.ts';

export type CampaignLifecycleStatus = 'planned' | 'active' | 'closed' | 'archived';

export type CampaignCloseInput = {
  role: MembershipRole;
  status: CampaignLifecycleStatus;
  confirmedDeliveryCount: number;
  pendingYieldCount: number;
  startDate: string | null;
  existingEndDate: string | null;
  requestedEndDate: string | null;
  today: string;
};

export type CampaignCloseDecision =
  | { ok: true; alreadyClosed: boolean; endDate: string }
  | { ok: false; statusCode: 400 | 403 | 409; code: string; message: string };

export function decideCampaignClose(input: CampaignCloseInput): CampaignCloseDecision {
  if (input.role !== 'owner' && input.role !== 'admin') {
    return {
      ok: false,
      statusCode: 403,
      code: 'CAMPAIGN_CLOSE_FORBIDDEN',
      message: 'Owner or admin access is required to close a campaign',
    };
  }

  if (input.status !== 'active' && input.status !== 'closed') {
    return {
      ok: false,
      statusCode: 409,
      code: 'CAMPAIGN_NOT_ACTIVE',
      message: 'Only an active campaign can be closed',
    };
  }

  if (input.confirmedDeliveryCount < 1) {
    return {
      ok: false,
      statusCode: 409,
      code: 'CAMPAIGN_HAS_NO_CONFIRMED_DELIVERIES',
      message: 'At least one confirmed delivery is required before closing the campaign',
    };
  }

  if (input.pendingYieldCount > 0) {
    return {
      ok: false,
      statusCode: 409,
      code: 'CAMPAIGN_RESULTS_PENDING',
      message: 'All confirmed deliveries must have a current yield result before closing the campaign',
    };
  }

  const endDate = input.status === 'closed'
    ? (input.existingEndDate ?? input.requestedEndDate ?? input.today)
    : (input.requestedEndDate ?? input.today);

  if (endDate > input.today) {
    return {
      ok: false,
      statusCode: 400,
      code: 'CAMPAIGN_END_DATE_IN_FUTURE',
      message: 'Campaign end date cannot be in the future',
    };
  }

  if (input.startDate && endDate < input.startDate) {
    return {
      ok: false,
      statusCode: 400,
      code: 'CAMPAIGN_END_BEFORE_START',
      message: 'Campaign end date cannot be before its start date',
    };
  }

  return {
    ok: true,
    alreadyClosed: input.status === 'closed',
    endDate,
  };
}
