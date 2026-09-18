export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type SleepLike = (ms: number) => Promise<void>;

const RETRY_DELAY_MS = 250;

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithSingleRetry(
  input: string | URL | Request,
  init: RequestInit,
  fetcher: FetchLike = fetch,
  sleep: SleepLike = defaultSleep,
): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetcher(input, init);

      if (attempt === 0 && isRetryableStatus(response.status)) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      return response;
    } catch (error) {
      if (attempt === 0) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw error;
    }
  }

  throw new Error("CATASTRO_RETRY_EXHAUSTED");
}
