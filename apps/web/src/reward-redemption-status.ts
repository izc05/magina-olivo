export type RewardRedemptionState = 'active' | 'redeemed' | 'expired' | 'inactive';

export function classifyRewardRedemptionStatus(status: string): RewardRedemptionState {
  if (status === 'reserved' || status === 'issued') return 'active';
  if (status === 'redeemed') return 'redeemed';
  if (status === 'expired') return 'expired';
  return 'inactive';
}

export function rewardRedemptionStatusNotice(status: string): string {
  const state = classifyRewardRedemptionStatus(status);
  if (state === 'redeemed') return 'Entrega confirmada. Este QR ya no es válido.';
  if (state === 'expired') return 'El canje ha caducado y las aceitunas han vuelto a tu saldo.';
  return 'Este canje ya no está activo. El QR se ha retirado.';
}
