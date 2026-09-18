import {
  isKnownCatastroUpstreamUnavailable,
  runCatastroE2E,
} from "./catastro-e2e.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("anonymous auth -> bbox -> reference returns the same parcel", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  const fakeFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const value = String(url);
    calls.push({ url: value, init });

    if (value.endsWith("/auth/v1/signup")) {
      return Response.json({
        access_token: "jwt-test",
        user: { is_anonymous: true, role: "authenticated" },
      });
    }

    const body = JSON.parse(String(init?.body ?? "{}"));

    if (body.operation === "bbox") {
      return Response.json({
        items: [{
          nationalCadastralReference: "23013A00700198",
          geometry: { type: "Polygon", coordinates: [] },
        }],
        source: { provider: "Dirección General del Catastro" },
      });
    }

    if (body.operation === "reference") {
      return Response.json({
        item: {
          nationalCadastralReference: "23013A00700198",
          geometry: { type: "Polygon", coordinates: [] },
        },
        source: { provider: "Dirección General del Catastro" },
      });
    }

    return new Response("unexpected", { status: 500 });
  };

  const result = await runCatastroE2E(
    {
      supabaseUrl: "https://project.supabase.co",
      publishableKey: "sb_publishable_test",
      bbox: {
        minLongitude: -3.414,
        minLatitude: 37.821,
        maxLongitude: -3.410,
        maxLatitude: 37.825,
      },
    },
    fakeFetch,
  );

  assert(result.reference === "23013A00700198", "reference should match");
  assert(result.itemCount === 1, "one bbox item expected");
  assert(result.provider === "Dirección General del Catastro", "provider should match");
  assert(calls.length === 3, "auth + bbox + reference expected");

  const authHeader = new Headers(calls[1].init?.headers).get("Authorization");
  assert(authHeader === "Bearer jwt-test", "bbox must use anonymous JWT");
});

Deno.test("fails if reference verification does not match bbox parcel", async () => {
  const fakeFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const value = String(url);

    if (value.endsWith("/auth/v1/signup")) {
      return Response.json({
        access_token: "jwt-test",
        user: { is_anonymous: true, role: "authenticated" },
      });
    }

    const body = JSON.parse(String(init?.body ?? "{}"));

    if (body.operation === "bbox") {
      return Response.json({
        items: [{ nationalCadastralReference: "23013A00700198" }],
        source: { provider: "Dirección General del Catastro" },
      });
    }

    return Response.json({
      item: { nationalCadastralReference: "DIFFERENT000000" },
      source: { provider: "Dirección General del Catastro" },
    });
  };

  let failed = false;
  try {
    await runCatastroE2E(
      {
        supabaseUrl: "https://project.supabase.co",
        publishableKey: "sb_publishable_test",
        bbox: {
          minLongitude: -3.414,
          minLatitude: 37.821,
          maxLongitude: -3.410,
          maxLatitude: 37.825,
        },
      },
      fakeFetch,
    );
  } catch (error) {
    failed = error instanceof Error && error.message.includes("REFERENCE_MISMATCH");
  }

  assert(failed, "reference mismatch must fail the E2E");
});


Deno.test("classifies only known Catastro WFS 502 as upstream unavailable", () => {
  const bbox502 = new Error(
    'BBOX_HTTP_502:{"error":"error sending request for http://ovc.catastro.meh.es/INSPIRE/wfsCP.aspx"}',
  );
  const reference502 = new Error(
    'REFERENCE_HTTP_502:{"error":"connection reset for http://ovc.catastro.meh.es/INSPIRE/wfsCP.aspx"}',
  );
  const auth502 = new Error(
    'AUTH_HTTP_502:{"error":"gateway failure"}',
  );
  const unrelated502 = new Error(
    'BBOX_HTTP_502:{"error":"https://example.test failed"}',
  );
  const catastro500 = new Error(
    'BBOX_HTTP_500:{"error":"http://ovc.catastro.meh.es/INSPIRE/wfsCP.aspx"}',
  );

  assert(
    isKnownCatastroUpstreamUnavailable(bbox502),
    "Catastro BBOX 502 should be classified as upstream unavailable",
  );
  assert(
    isKnownCatastroUpstreamUnavailable(reference502),
    "Catastro reference 502 should be classified as upstream unavailable",
  );
  assert(
    !isKnownCatastroUpstreamUnavailable(auth502),
    "Auth failures must still fail CI",
  );
  assert(
    !isKnownCatastroUpstreamUnavailable(unrelated502),
    "Unrelated 502 responses must still fail CI",
  );
  assert(
    !isKnownCatastroUpstreamUnavailable(catastro500),
    "Only the observed Catastro 502 is softened",
  );
});
