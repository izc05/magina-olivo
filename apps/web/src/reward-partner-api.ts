export type RewardPartnerContext = {
  partnerId: string;
  partnerName: string;
  role: string;
  pickupPoints: Array<{ id: string; name: string; address: string }>;
};

export type RewardTokenInspection = {
  status: 'valid' | 'expired' | 'redeemed' | 'revoked' | 'inactive';
  redemptionId: string;
  rewardCode: string;
  rewardTitle: string;
  partnerName: string | null;
  pickupPoint: { id: string; name: string; address: string } | null;
  olivesCost: number;
  expiresAt: string;
};

export type RewardValidationResult = {
  outcome: 'redeemed' | 'expired';
  redemptionId: string;
  rewardCode: string;
  rewardTitle: string;
  partnerName: string | null;
  pickupPoint: { id: string; name: string; address: string } | null;
  olivesCost: number;
  redeemedAt: string | null;
  olivesRefunded: number;
};

export class RewardPartnerApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

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
      // Keep the generic HTTP message when the server payload is not JSON.
    }
    throw new RewardPartnerApiError(message, response.status, code);
  }

  return (await response.json()) as T;
}

export const rewardPartnerApi = {
  context: async () => {
    const result = await request<{ partners: RewardPartnerContext[] }>('/api/v1/rewards/partner/context');
    return result.partners;
  },

  inspect: (token: string) =>
    request<RewardTokenInspection>('/api/v1/rewards/partner/inspect', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  validate: (token: string) =>
    request<RewardValidationResult>('/api/v1/rewards/partner/validate', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
};
