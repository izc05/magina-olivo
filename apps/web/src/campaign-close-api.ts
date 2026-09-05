export type CampaignCloseResult = {
  id: string;
  name: string;
  seasonStartYear: number;
  seasonEndYear: number;
  startDate: string | null;
  endDate: string | null;
  status: 'closed';
  notes: string | null;
  alreadyClosed: boolean;
};

export class CampaignCloseError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    if (code !== undefined) this.code = code;
  }
}

export async function closeCampaign(campaignId: string, endDate?: string): Promise<CampaignCloseResult> {
  const response = await fetch(`/api/v1/campaigns/${encodeURIComponent(campaignId)}/close`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(endDate ? { endDate } : {}),
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    let code: string | undefined;
    try {
      const body = (await response.json()) as { error?: { message?: string; code?: string } };
      message = body.error?.message ?? message;
      code = body.error?.code;
    } catch {
      // Keep the generic HTTP message for non-JSON responses.
    }
    throw new CampaignCloseError(message, response.status, code);
  }

  return (await response.json()) as CampaignCloseResult;
}
