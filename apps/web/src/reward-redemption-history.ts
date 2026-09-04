import type { RedemptionSummary } from './reward-api';
import { classifyRewardRedemptionStatus } from './reward-redemption-status';

export type RewardRedemptionHistoryBucket = 'pending' | 'redeemed' | 'expired' | 'other';

export type RewardRedemptionHistoryGroups = Record<RewardRedemptionHistoryBucket, RedemptionSummary[]>;

export function bucketRewardRedemptionStatus(status: string): RewardRedemptionHistoryBucket {
  const state = classifyRewardRedemptionStatus(status);
  if (state === 'active') return 'pending';
  if (state === 'redeemed') return 'redeemed';
  if (state === 'expired') return 'expired';
  return 'other';
}

function redemptionTimestamp(item: RedemptionSummary): number {
  const value = item.redeemedAt ?? item.reservedAt;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function groupRewardRedemptions(items: RedemptionSummary[]): RewardRedemptionHistoryGroups {
  const groups: RewardRedemptionHistoryGroups = {
    pending: [],
    redeemed: [],
    expired: [],
    other: [],
  };

  for (const item of items) {
    groups[bucketRewardRedemptionStatus(item.status)].push(item);
  }

  for (const group of Object.values(groups)) {
    group.sort((left, right) => redemptionTimestamp(right) - redemptionTimestamp(left));
  }

  return groups;
}
