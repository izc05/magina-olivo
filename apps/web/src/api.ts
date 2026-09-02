import { enqueueDeliveryCreate } from './offline/outbox';

export type User = { id: string; name?: string | null; email: string };
export type Holding = { id: string; name: string; municipality: string | null; province: string | null; role: 'owner' | 'admin' | 'collaborator' | 'viewer' };
export type Farm = { id: string; name: string; description: string | null; areaHa: string | null };
export type Plot = { id: string; name: string; areaHa: string | null; sigpacReference: string | null; irrigationType: string | null; oliveTreeCount: number | null; notes: string | null };
export type Campaign = { id: string; name: string; seasonStartYear: number; seasonEndYear: number; startDate: string | null; status: string; notes: string | null };
export type Delivery = { id: string; deliveredAt: string; kilograms: string; customDestination: string | null; farmId: string | null; plotId: string | null; ticketNumber: string | null; variety: string | null; verificationStatus: string; version: number };
export type CampaignSummary = { campaignId: string; deliveriesCount: number; totalKilograms: string; deliveriesWithResult: number; pendingResultCount: number; resultCoveredKilograms: string; coveragePercent: string | null; weightedYieldPercent: string | null };
export type DeliveryCreateBody = { deliveredAt: string; kilograms: string; customDestination: string; farmId?: string; plotId?: string; ticketNumber?: string; variety?: string; notes?: string; clientGeneratedId: string };
export type DeliveryCreateResult = Delivery | { offlineQueued: true; clientGeneratedId: string };

const OWNER_CACHE_KEY = 'magina-olivo-current-user-id';
const memoryCache = new Map<string, unknown>();

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    if (code !== undefined) this.code = code;
  }
}

function rememberOwnerUserId(userId: string): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(OWNER_CACHE_KEY, userId);
}

export function cachedOwnerUserId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(OWNER_CACHE_KEY);
}

function forgetOwnerUserId(): void {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(OWNER_CACHE_KEY);
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  headers.set('accept', 'application/json');
  const response = await fetch(url, { ...init, headers, credentials: 'include' });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    let code: string | undefined;
    try {
      const body = (await response.json()) as { error?: { message?: string; code?: string } };
      message = body.error?.message ?? message;
      code = body.error?.code;
    } catch {
      // Keep generic HTTP message for non-JSON responses.
    }
    throw new ApiError(message, response.status, code);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function cachedGet<T>(url: string): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false && memoryCache.has(url)) {
    return memoryCache.get(url) as T;
  }

  try {
    const value = await request<T>(url);
    memoryCache.set(url, value);
    return value;
  } catch (error) {
    if (!(error instanceof ApiError) && memoryCache.has(url)) return memoryCache.get(url) as T;
    throw error;
  }
}

async function queueDeliveryOffline(campaignId: string, body: DeliveryCreateBody, idempotencyKey: string): Promise<DeliveryCreateResult> {
  const ownerUserId = cachedOwnerUserId();
  if (!ownerUserId) throw new Error('No se puede guardar offline antes de iniciar una sesión online en este dispositivo.');
  await enqueueDeliveryCreate({ ownerUserId, campaignId, idempotencyKey, body: { ...body } as Record<string, unknown> });
  return { offlineQueued: true, clientGeneratedId: body.clientGeneratedId };
}

export const api = {
  me: async () => {
    const result = await request<{ user: User }>('/api/v1/me');
    rememberOwnerUserId(result.user.id);
    return result;
  },

  signIn: (email: string, password: string) => request<unknown>('/api/auth/sign-in/email', { method: 'POST', body: JSON.stringify({ email, password }) }),

  signOut: async () => {
    const result = await request<unknown>('/api/auth/sign-out', { method: 'POST', body: JSON.stringify({}) });
    forgetOwnerUserId();
    memoryCache.clear();
    return result;
  },

  requestPasswordReset: (email: string) => request<unknown>('/api/auth/request-password-reset', { method: 'POST', body: JSON.stringify({ email, redirectTo: `${window.location.origin}/reset-password` }) }),

  holdings: () => cachedGet<{ items: Holding[] }>('/api/v1/holdings'),
  createHolding: (body: { name: string; municipality?: string; province?: string }) => request<Holding>('/api/v1/holdings', { method: 'POST', body: JSON.stringify(body) }),
  farms: (holdingId: string) => cachedGet<{ items: Farm[] }>(`/api/v1/holdings/${holdingId}/farms`),
  createFarm: (holdingId: string, body: { name: string; areaHa?: number; description?: string }) => request<Farm>(`/api/v1/holdings/${holdingId}/farms`, { method: 'POST', body: JSON.stringify(body) }),
  plots: (farmId: string) => cachedGet<{ items: Plot[] }>(`/api/v1/farms/${farmId}/plots`),
  createPlot: (farmId: string, body: { name: string; areaHa?: number; sigpacReference?: string; irrigationType?: 'dryland' | 'irrigated' | 'mixed' | 'unknown'; oliveTreeCount?: number; notes?: string }) => request<Plot>(`/api/v1/farms/${farmId}/plots`, { method: 'POST', body: JSON.stringify(body) }),
  campaigns: (holdingId: string) => cachedGet<{ items: Campaign[] }>(`/api/v1/holdings/${holdingId}/campaigns`),
  createCampaign: (holdingId: string, body: { name: string; seasonStartYear: number; startDate?: string; notes?: string }) => request<Campaign>(`/api/v1/holdings/${holdingId}/campaigns`, { method: 'POST', body: JSON.stringify(body) }),
  deliveries: (campaignId: string) => cachedGet<{ items: Delivery[] }>(`/api/v1/campaigns/${campaignId}/deliveries`),

  createDelivery: async (campaignId: string, body: DeliveryCreateBody, idempotencyKey: string): Promise<DeliveryCreateResult> => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return queueDeliveryOffline(campaignId, body, idempotencyKey);
    try {
      return await request<Delivery>(`/api/v1/campaigns/${campaignId}/deliveries`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(body) });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      return queueDeliveryOffline(campaignId, body, idempotencyKey);
    }
  },

  createYield: (deliveryId: string, value: string) => request<unknown>(`/api/v1/deliveries/${deliveryId}/results`, { method: 'POST', body: JSON.stringify({ value, measuredAt: new Date().toISOString() }) }),
  campaignSummary: (campaignId: string) => cachedGet<CampaignSummary>(`/api/v1/campaigns/${campaignId}/summary`),
};
