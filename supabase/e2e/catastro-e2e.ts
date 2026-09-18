export type CatastroE2EConfig = {
  supabaseUrl: string;
  publishableKey: string;
  bbox: {
    minLongitude: number;
    minLatitude: number;
    maxLongitude: number;
    maxLatitude: number;
  };
};

export type CatastroE2EResult = {
  reference: string;
  itemCount: number;
  provider: string | null;
  geometryType: string | null;
};

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export function isKnownCatastroUpstreamUnavailable(
  error: unknown,
): boolean {
  if (!(error instanceof Error)) return false;

  return /^(BBOX|REFERENCE)_HTTP_502:/.test(error.message) &&
    error.message.includes("ovc.catastro.meh.es/INSPIRE/wfsCP.aspx");
}

async function readJson(response: Response, label: string): Promise<unknown> {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${label}_HTTP_${response.status}:${text.slice(0, 240)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label}_INVALID_JSON`);
  }
}

function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("E2E_INVALID_OBJECT");
  }
  return value as Record<string, unknown>;
}

export async function runCatastroE2E(
  config: CatastroE2EConfig,
  fetcher: FetchLike = fetch,
): Promise<CatastroE2EResult> {
  const baseUrl = config.supabaseUrl.replace(/\/$/, "");

  const authResponse = await fetcher(`${baseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: config.publishableKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({ data: {} }),
  });

  const authBody = objectValue(await readJson(authResponse, "AUTH"));
  const accessToken = authBody.access_token;
  const user = objectValue(authBody.user);

  if (typeof accessToken !== "string" || accessToken.length === 0) {
    throw new Error("AUTH_ACCESS_TOKEN_MISSING");
  }
  if (user.is_anonymous !== true) {
    throw new Error("AUTH_USER_NOT_ANONYMOUS");
  }

  const edgeHeaders = {
    apikey: config.publishableKey,
    Authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
  };

  const bboxResponse = await fetcher(`${baseUrl}/functions/v1/catastro-map`, {
    method: "POST",
    headers: edgeHeaders,
    body: JSON.stringify({
      operation: "bbox",
      bbox: config.bbox,
    }),
  });

  const bboxBody = objectValue(await readJson(bboxResponse, "BBOX"));
  const items = bboxBody.items;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("BBOX_NO_ITEMS");
  }

  const firstItem = objectValue(items[0]);
  const reference = firstItem.nationalCadastralReference;
  if (typeof reference !== "string" || reference.length === 0) {
    throw new Error("BBOX_REFERENCE_MISSING");
  }

  const referenceResponse = await fetcher(
    `${baseUrl}/functions/v1/catastro-map`,
    {
      method: "POST",
      headers: edgeHeaders,
      body: JSON.stringify({
        operation: "reference",
        reference,
      }),
    },
  );

  const referenceBody = objectValue(
    await readJson(referenceResponse, "REFERENCE"),
  );
  const verifiedItem = objectValue(referenceBody.item);
  const verifiedReference = verifiedItem.nationalCadastralReference;

  if (verifiedReference !== reference) {
    throw new Error(
      `REFERENCE_MISMATCH:${reference}:${String(verifiedReference)}`,
    );
  }

  const source = bboxBody.source && typeof bboxBody.source === "object"
    ? objectValue(bboxBody.source)
    : null;
  const geometry = verifiedItem.geometry &&
      typeof verifiedItem.geometry === "object"
    ? objectValue(verifiedItem.geometry)
    : null;

  return {
    reference,
    itemCount: items.length,
    provider: typeof source?.provider === "string" ? source.provider : null,
    geometryType: typeof geometry?.type === "string" ? geometry.type : null,
  };
}

if (import.meta.main) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY environment variable",
    );
  }

  try {
    const result = await runCatastroE2E({
      supabaseUrl,
      publishableKey,
      bbox: {
        minLongitude: -3.414,
        minLatitude: 37.821,
        maxLongitude: -3.410,
        maxLatitude: 37.825,
      },
    });

    console.log(JSON.stringify({
      status: "CATastro_E2E_OK",
      reference: result.reference,
      itemCount: result.itemCount,
      provider: result.provider,
      geometryType: result.geometryType,
    }));
  } catch (error) {
    if (isKnownCatastroUpstreamUnavailable(error)) {
      console.warn(JSON.stringify({
        status: "CATASTRO_UPSTREAM_UNAVAILABLE",
        provider: "Dirección General del Catastro",
        detail: error instanceof Error ? error.message : String(error),
      }));
    } else {
      throw error;
    }
  }
}
