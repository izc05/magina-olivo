import { ApiError } from './api.ts';

export type HarvestHistoryPoint = {
  campaignId: string;
  name: string;
  seasonStartYear: number;
  seasonEndYear: number;
  status: string;
  deliveriesCount: number;
  totalKilograms: number;
  kilogramsPerHectare: number | null;
  kilogramsPerOliveTree: number | null;
  weightedYieldPercent: number | null;
};

export type HarvestHistory = {
  activeAreaHa: number;
  activeOliveTreeCount: number;
  items: HarvestHistoryPoint[];
};

export async function getHarvestHistory(holdingId: string): Promise<HarvestHistory> {
  const response = await fetch(`/api/v1/holdings/${holdingId}/harvest-history`, {
    credentials: 'include',
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    let code: string | undefined;
    try {
      const body = (await response.json()) as { error?: { message?: string; code?: string } };
      message = body.error?.message ?? message;
      code = body.error?.code;
    } catch {
      // Keep the generic HTTP message when the API did not return JSON.
    }
    throw new ApiError(message, response.status, code);
  }

  return (await response.json()) as HarvestHistory;
}
