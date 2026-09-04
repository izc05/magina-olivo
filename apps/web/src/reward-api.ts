export type RewardCatalogItem = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  rewardType: string;
  productFormat: string | null;
  costOlives: number;
  availableUnits: number;
  pickupRequired: boolean;
  termsSummary: string | null;
  imageUrl: string | null;
  partner: { id: string; name: string } | null;
  pickupPoints: Array<{
    id: string;
    name: string;
    address: string;
    municipality: string | null;
    province: string | null;
    instructions: string | null;
  }>;
};

export type RedemptionSummary = {
  id: string;
  rewardId: string;
  rewardCode: string;
  rewardTitle: string;
  status: string;
  olivesCost: number;
  reservedAt: string;
  expiresAt: string;
  redeemedAt: string | null;
  pickupPoint: { id: string; name: string; address: string } | null;
  partnerName: string | null;
  tokenHint: string | null;
};

export type RedeemResult = {
  redemption: RedemptionSummary;
  qrToken: string | null;
  duplicate: boolean;
};

export class RewardApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    let code: string | undefined;
    try {
      const body = (await response.json()) as { error?: { message?: string; code?: string } };
      message = body.error?.message ?? message;
      code = body.error?.code;
    } catch {
      // Preserve the generic HTTP error when the payload is not JSON.
    }
    throw new RewardApiError(message, response.status, code);
  }

  return (await response.json()) as T;
}

export const rewardApi = {
  catalog: async () => {
    const response = await request<{ items: RewardCatalogItem[] }>('/api/v1/rewards');
    return response.items;
  },

  myRedemptions: async () => {
    const response = await request<{ items: RedemptionSummary[] }>('/api/v1/rewards/redemptions/me');
    return response.items;
  },

  redeem: (rewardId: string, pickupPointId: string | undefined, idempotencyKey: string) =>
    request<RedeemResult>(`/api/v1/rewards/${encodeURIComponent(rewardId)}/redeem`, {
      method: 'POST',
      body: JSON.stringify({
        ...(pickupPointId ? { pickupPointId } : {}),
        idempotencyKey,
      }),
    }),

  reissueToken: (redemptionId: string) =>
    request<{ redemption: RedemptionSummary; qrToken: string }>(
      `/api/v1/rewards/redemptions/${encodeURIComponent(redemptionId)}/reissue-token`,
      { method: 'POST', body: JSON.stringify({}) },
    ),
};
