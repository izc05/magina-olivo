export type LoyaltySummary = {
  pendingBalance: number;
  availableBalance: number;
  lifetimeEarned: number;
  level: {
    code: string;
    name: string;
    minLifetimeEarned: number;
  } | null;
  nextLevel: {
    code: string;
    name: string;
    minLifetimeEarned: number;
    olivesRemaining: number;
  } | null;
};

export type LoyaltyBootstrapResult = {
  awarded: boolean;
  duplicate: boolean;
  olives: number;
  reason: string;
  sourcePlotId?: string;
  summary: LoyaltySummary;
};

export type LoyaltyCollectResult = {
  collected: number;
  duplicate: boolean;
  summary: LoyaltySummary;
};

export class LoyaltyApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    if (code !== undefined) this.code = code;
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  headers.set('accept', 'application/json');

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
      // Keep the generic HTTP error when the response is not JSON.
    }
    throw new LoyaltyApiError(message, response.status, code);
  }

  return (await response.json()) as T;
}

export const loyaltyApi = {
  bootstrap: () => request<LoyaltyBootstrapResult>('/api/v1/loyalty/bootstrap', {
    method: 'POST',
    body: JSON.stringify({}),
  }),

  summary: () => request<LoyaltySummary>('/api/v1/loyalty/me'),

  collect: (idempotencyKey: string) => request<LoyaltyCollectResult>('/api/v1/loyalty/collect', {
    method: 'POST',
    body: JSON.stringify({ idempotencyKey }),
  }),
};
