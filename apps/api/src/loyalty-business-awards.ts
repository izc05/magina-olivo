import type { AwardLoyaltyEventInput } from './loyalty-service.ts';
import { awardLoyaltyEvent } from './loyalty-service.ts';

export async function awardLoyaltyBestEffort(
  input: AwardLoyaltyEventInput,
  trigger: string,
): Promise<void> {
  try {
    await awardLoyaltyEvent(input);
  } catch (error) {
    console.warn(JSON.stringify({
      event: 'loyalty_business_award_failed',
      trigger,
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}
