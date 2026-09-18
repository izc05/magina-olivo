import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const AEMET_RADAR_ENDPOINT =
  "https://opendata.aemet.es/opendata/api/red/radar/nacional";
const BUCKET = "weather-radar";
const PREFIX = "national";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_FRAMES = 18;
const CAPTURE_INTERVAL_MS = 10 * 60 * 1000;
const SIGNED_URL_TTL_SECONDS = 15 * 60;
const REQUEST_TIMEOUT_MS = 12_000;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/gif",
  "image/jpeg",
  "image/webp",
]);

type AemetEnvelope = {
  estado?: number | string;
  datos?: string;
};

type StoredFrame = {
  name: string;
  id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function adminKey(): string {
  const current = Deno.env.get("SUPABASE_SECRET_KEYS")?.trim();
  if (current) {
    try {
      const parsed = JSON.parse(current) as Record<string, string>;
      if (typeof parsed.default === "string" && parsed.default.trim()) {
        return parsed.default.trim();
      }
    } catch {
      // Fall through to the legacy key while migration remains supported.
    }
  }

  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (legacy) return legacy;

  throw new Error("SUPABASE_ADMIN_KEY_NOT_CONFIGURED");
}

function supabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL")?.trim();
  if (!url) throw new Error("SUPABASE_URL_NOT_CONFIGURED");

  return createClient(url, adminKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function parseFrameName(name: string): {
  capturedAtEpochMs: number;
  hash: string;
  extension: string;
} | null {
  const match = /^(\d{13})_([a-f0-9]{64})\.(png|gif|jpg|webp)$/i.exec(name);
  if (!match) return null;

  const capturedAtEpochMs = Number(match[1]);
  if (!Number.isFinite(capturedAtEpochMs)) return null;

  return {
    capturedAtEpochMs,
    hash: match[2].toLowerCase(),
    extension: match[3].toLowerCase(),
  };
}

function extensionFor(contentType: string): string {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    default:
      throw new Error("UNSUPPORTED_RADAR_IMAGE_TYPE");
  }
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function fetchWithTimeout(
  url: string | URL,
  init: RequestInit = {},
): Promise<Response> {
  return await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

function trustedAemetUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "opendata.aemet.es") {
    throw new Error("AEMET_UNTRUSTED_DATA_URL");
  }
  return url;
}

async function fetchCurrentRadar(apiKey: string): Promise<{
  bytes: Uint8Array;
  contentType: string;
  hash: string;
}> {
  const endpoint = new URL(AEMET_RADAR_ENDPOINT);
  endpoint.searchParams.set("api_key", apiKey);

  const metadataResponse = await fetchWithTimeout(endpoint, {
    headers: {
      accept: "application/json",
      api_key: apiKey,
      "user-agent": "Magina-Olivo-Android/0.1",
    },
  });

  if (!metadataResponse.ok) {
    throw new Error("AEMET_RADAR_METADATA_HTTP_" + metadataResponse.status);
  }

  const envelope = await metadataResponse.json() as AemetEnvelope;
  if (
    Number(envelope.estado) !== 200 ||
    typeof envelope.datos !== "string" ||
    !envelope.datos
  ) {
    throw new Error("AEMET_RADAR_DATA_URL_MISSING");
  }

  const imageUrl = trustedAemetUrl(envelope.datos);
  const imageResponse = await fetchWithTimeout(imageUrl, {
    headers: {
      accept: "image/*",
      "user-agent": "Magina-Olivo-Android/0.1",
    },
  });

  if (!imageResponse.ok) {
    throw new Error("AEMET_RADAR_IMAGE_HTTP_" + imageResponse.status);
  }

  const contentType = (imageResponse.headers.get("content-type") ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();

  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error("AEMET_RADAR_UNSUPPORTED_CONTENT_TYPE");
  }

  const declaredLength = Number(
    imageResponse.headers.get("content-length") ?? "0",
  );
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_IMAGE_BYTES
  ) {
    throw new Error("AEMET_RADAR_IMAGE_TOO_LARGE");
  }

  const bytes = new Uint8Array(await imageResponse.arrayBuffer());
  if (bytes.byteLength === 0) {
    throw new Error("AEMET_RADAR_IMAGE_EMPTY");
  }
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("AEMET_RADAR_IMAGE_TOO_LARGE");
  }

  return {
    bytes,
    contentType,
    hash: await sha256Hex(bytes),
  };
}

async function listFrames(
  admin: ReturnType<typeof supabaseAdmin>,
): Promise<StoredFrame[]> {
  const { data, error } = await admin.storage.from(BUCKET).list(PREFIX, {
    limit: 100,
    offset: 0,
    sortBy: {
      column: "name",
      order: "desc",
    },
  });

  if (error) throw new Error("RADAR_STORAGE_LIST_FAILED:" + error.message);

  return (data ?? [])
    .filter((item) => parseFrameName(item.name) !== null)
    .sort((a, b) => b.name.localeCompare(a.name));
}

async function captureIfNeeded(
  admin: ReturnType<typeof supabaseAdmin>,
  existing: StoredFrame[],
): Promise<{
  status: "updated" | "unchanged" | "fresh-enough" | "not-configured" | "unavailable";
  message?: string;
}> {
  const latest = existing[0];
  const latestParsed = latest ? parseFrameName(latest.name) : null;

  if (
    latestParsed &&
    Date.now() - latestParsed.capturedAtEpochMs < CAPTURE_INTERVAL_MS
  ) {
    return { status: "fresh-enough" };
  }

  const apiKey = Deno.env.get("AEMET_API_KEY")?.trim();
  if (!apiKey) {
    return {
      status: "not-configured",
      message: "AEMET_API_KEY no está configurada.",
    };
  }

  try {
    const current = await fetchCurrentRadar(apiKey);

    if (latestParsed?.hash === current.hash) {
      return { status: "unchanged" };
    }

    const capturedAtEpochMs = Date.now();
    const extension = extensionFor(current.contentType);
    const name =
      capturedAtEpochMs + "_" + current.hash + "." + extension;
    const path = PREFIX + "/" + name;

    const { error } = await admin.storage.from(BUCKET).upload(
      path,
      current.bytes,
      {
        contentType: current.contentType,
        cacheControl: "300",
        upsert: false,
      },
    );

    if (error) {
      throw new Error("RADAR_STORAGE_UPLOAD_FAILED:" + error.message);
    }

    return { status: "updated" };
  } catch (error) {
    console.error("weather-radar capture failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      status: "unavailable",
      message: "No se ha podido actualizar el radar de AEMET.",
    };
  }
}

async function pruneFrames(
  admin: ReturnType<typeof supabaseAdmin>,
  frames: StoredFrame[],
): Promise<void> {
  if (frames.length <= MAX_FRAMES) return;

  const stalePaths = frames
    .slice(MAX_FRAMES)
    .map((frame) => PREFIX + "/" + frame.name);

  const { error } = await admin.storage.from(BUCKET).remove(stalePaths);
  if (error) {
    console.error("weather-radar prune failed", { error: error.message });
  }
}

async function signedFrames(
  admin: ReturnType<typeof supabaseAdmin>,
  frames: StoredFrame[],
) {
  const selected = frames.slice(0, MAX_FRAMES).reverse();
  const result = [];

  for (const frame of selected) {
    const parsed = parseFrameName(frame.name);
    if (!parsed) continue;

    const path = PREFIX + "/" + frame.name;
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      console.error("weather-radar signed url failed", {
        path,
        error: error?.message,
      });
      continue;
    }

    result.push({
      id: parsed.hash.slice(0, 16) + "-" + parsed.capturedAtEpochMs,
      capturedAt: new Date(parsed.capturedAtEpochMs).toISOString(),
      imageUrl: data.signedUrl,
      sha256: parsed.hash,
    });
  }

  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  let body: { operation?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }

  const operation =
    typeof body.operation === "string" ? body.operation : "frames";
  if (operation !== "frames") {
    return json({ error: "UNSUPPORTED_OPERATION" }, 400);
  }

  try {
    const admin = supabaseAdmin();
    let frames = await listFrames(admin);

    const capture = await captureIfNeeded(admin, frames);
    if (capture.status === "updated") {
      frames = await listFrames(admin);
    }

    await pruneFrames(admin, frames);
    frames = frames.slice(0, MAX_FRAMES);

    const signed = await signedFrames(admin, frames);

    return json({
      provider: "AEMET OpenData",
      product: "national-radar-composite",
      observedOnly: true,
      captureIntervalMinutes: CAPTURE_INTERVAL_MS / 60_000,
      retentionFrames: MAX_FRAMES,
      capture,
      frames: signed,
      source: {
        attribution: "AEMET",
        scopeNote:
          "Radar observado de precipitación. No es una predicción ni sustituye avisos oficiales.",
      },
      servedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("weather-radar failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    return json(
      {
        error: "RADAR_UNAVAILABLE",
        message: "El radar no está disponible temporalmente.",
      },
      502,
    );
  }
});
