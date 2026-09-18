import { fetchWithSingleRetry } from "./retry.ts";

function assertEquals(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

Deno.test("retries once after a network error", async () => {
  let attempts = 0;
  const waits: number[] = [];

  const response = await fetchWithSingleRetry(
    "http://example.test",
    {},
    async () => {
      attempts += 1;
      if (attempts === 1) throw new TypeError("network reset");
      return new Response("ok", { status: 200 });
    },
    async (ms) => {
      waits.push(ms);
    },
  );

  assertEquals(response.status, 200, "status");
  assertEquals(attempts, 2, "attempts");
  assertEquals(waits.length, 1, "wait count");
  assertEquals(waits[0], 250, "retry delay");
});

Deno.test("retries once after HTTP 429", async () => {
  let attempts = 0;

  const response = await fetchWithSingleRetry(
    "http://example.test",
    {},
    async () => {
      attempts += 1;
      return attempts === 1
        ? new Response("busy", { status: 429 })
        : new Response("ok", { status: 200 });
    },
    async () => {},
  );

  assertEquals(response.status, 200, "status");
  assertEquals(attempts, 2, "attempts");
});

Deno.test("retries once after HTTP 5xx", async () => {
  let attempts = 0;

  const response = await fetchWithSingleRetry(
    "http://example.test",
    {},
    async () => {
      attempts += 1;
      return attempts === 1
        ? new Response("upstream", { status: 503 })
        : new Response("ok", { status: 200 });
    },
    async () => {},
  );

  assertEquals(response.status, 200, "status");
  assertEquals(attempts, 2, "attempts");
});

Deno.test("does not retry normal HTTP 4xx", async () => {
  let attempts = 0;

  const response = await fetchWithSingleRetry(
    "http://example.test",
    {},
    async () => {
      attempts += 1;
      return new Response("not found", { status: 404 });
    },
    async () => {},
  );

  assertEquals(response.status, 404, "status");
  assertEquals(attempts, 1, "attempts");
});
