import type { AwardLoyaltyEventInput } from './loyalty-service.ts';

export function firstPlotLoyaltyAward(userId: string, plotId: string): AwardLoyaltyEventInput {
  return {
    userId,
    eventType: 'parcel.first_created',
    idempotencyKey: `parcel.first_created:${plotId}`,
    sourceType: 'plot',
    sourceId: plotId,
    metadata: { trigger: 'plot.create' },
  };
}

export function yieldRecordedLoyaltyAward(
  userId: string,
  deliveryId: string,
  resultId: string,
): AwardLoyaltyEventInput {
  return {
    userId,
    eventType: 'yield.recorded',
    idempotencyKey: `yield.recorded:${deliveryId}`,
    sourceType: 'delivery',
    sourceId: deliveryId,
    metadata: {
      trigger: 'delivery_result.create',
      resultId,
    },
  };
}

export function campaignCompletedLoyaltyAward(
  userId: string,
  campaignId: string,
): AwardLoyaltyEventInput {
  return {
    userId,
    eventType: 'campaign.completed',
    idempotencyKey: `campaign.completed:${campaignId}`,
    sourceType: 'campaign',
    sourceId: campaignId,
    metadata: { trigger: 'campaign.close' },
  };
}
