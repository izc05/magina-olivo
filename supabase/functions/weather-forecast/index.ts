const AEMET_BASE_URL = "https://opendata.aemet.es/opendata";
const CACHE_TTL_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12_000;
const cache = new Map<string, { expiresAt: number; value: unknown }>();

const municipalities: Record<string, { code: string; name: string; province: string }> = {
  "23902": { code: "23902", name: "Bedmar y Garcíez", province: "Jaén" },
  "23053": { code: "23053", name: "Jódar", province: "Jaén" },
  "23052": { code: "23052", name: "Jimena", province: "Jaén" },
  "23001": { code: "23001", name: "Albanchez de Mágina", province: "Jaén" },
};

type AemetEnvelope = {
  estado?: number | string;
  descripcion?: string;
  datos?: string;
};

type AemetProbability = {
  value?: number | string | null;
  periodo?: string;
};

type AemetWind = {
  velocidad?: Array<number | string>;
};

type AemetSky = {
  value?: string | null;
  descripcion?: string | null;
  periodo?: string;
};

type AemetDay = {
  fecha?: string;
  probPrecipitacion?: AemetProbability[];
  temperatura?: {
    maxima?: number | string;
    minima?: number | string;
  };
  viento?: AemetWind[];
  estadoCielo?: AemetSky[];
  uvMax?: number | string | null;
};

type AemetForecast = {
  elaborado?: string;
  nombre?: string;
  provincia?: string;
  prediccion?: {
    dia?: AemetDay[];
  };
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "string" && value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function maxFinite(values: unknown[]): number | null {
  const valuesAsNumbers = values
    .map(finiteNumber)
    .filter((value): value is number => value !== null);
  return valuesAsNumbers.length ? Math.max(...valuesAsNumbers) : null;
}

function precipitationProbability(values: AemetProbability[] | undefined): number | null {
  if (!values?.length) return null;
  const fullDay = values.find((item) => item.periodo === "00-24");
  const fullDayValue = finiteNumber(fullDay?.value);
  if (fullDayValue !== null) return Math.round(fullDayValue);
  const maximum = maxFinite(values.map((item) => item.value));
  return maximum === null ? null : Math.round(maximum);
}

function windMaxKmh(values: AemetWind[] | undefined): number | null {
  if (!values?.length) return null;
  return maxFinite(values.flatMap((item) => item.velocidad ?? []));
}

function skyDescription(values: AemetSky[] | undefined): string | null {
  if (!values?.length) return null;
  const fullDay = values.find(
    (item) => item.periodo === "00-24" && typeof item.descripcion === "string" && item.descripcion.trim(),
  );
  if (fullDay?.descripcion?.trim()) return fullDay.descripcion.trim();
  const first = values.find(
    (item) => typeof item.descripcion === "string" && item.descripcion.trim(),
  );
  return first?.descripcion?.trim() || null;
}

function classifyFreshness(elaboratedAt: string | null): {
  status: "fresh" | "aging" | "stale" | "unknown";
  ageHours: number | null;
} {
  if (!elaboratedAt?.trim()) return { status: "unknown", ageHours: null };
  const trimmed = elaboratedAt.trim();
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  const timestamp = Date.parse(hasZone ? trimmed : trimmed + "Z");
  if (!Number.isFinite(timestamp)) return { status: "unknown", ageHours: null };

  const rawAgeHours = (Date.now() - timestamp) / 3_600_000;
  if (rawAgeHours < -6) return { status: "unknown", ageHours: null };
  const ageHours = Math.max(0, Math.round(rawAgeHours * 10) / 10);
  if (ageHours <= 18) return { status: "fresh", ageHours };
  if (ageHours <= 36) return { status: "aging", ageHours };
  return { status: "stale", ageHours };
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error("AEMET_HTTP_" + response.status);
  }
  return await response.json();
}

function trustedAemetDataUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "opendata.aemet.es") {
    throw new Error("AEMET_UNTRUSTED_DATA_URL");
  }
  return url;
}

async function fetchForecast(code: string, apiKey: string) {
  const municipality = municipalities[code];
  if (!municipality) throw new Error("MUNICIPALITY_NOT_ALLOWED");

  const endpoint =
    AEMET_BASE_URL +
    "/api/prediccion/especifica/municipio/diaria/" +
    encodeURIComponent(code);

  const envelope = await fetchJson(endpoint, {
    headers: {
      "accept": "application/json",
      "api_key": apiKey,
      "user-agent": "Magina-Olivo-Android/0.1",
    },
  }) as AemetEnvelope;

  if (Number(envelope.estado) !== 200 || typeof envelope.datos !== "string" || !envelope.datos) {
    throw new Error("AEMET_DATA_URL_MISSING");
  }

  const dataUrl = trustedAemetDataUrl(envelope.datos);
  const payload = await fetchJson(dataUrl.toString(), {
    headers: { "accept": "application/json" },
  });

  const rows = Array.isArray(payload) ? payload : [];
  const root = (rows[0] ?? {}) as AemetForecast;
  const days = (root.prediccion?.dia ?? [])
    .filter((day): day is AemetDay & { fecha: string } =>
      typeof day.fecha === "string" && day.fecha.length >= 10
    )
    .slice(0, 7)
    .map((day) => ({
      date: day.fecha,
      skyDescription: skyDescription(day.estadoCielo),
      precipitationProbabilityPercent: precipitationProbability(day.probPrecipitacion),
      temperatureMinC: finiteNumber(day.temperatura?.minima),
      temperatureMaxC: finiteNumber(day.temperatura?.maxima),
      windMaxKmh: windMaxKmh(day.viento),
      uvMax: finiteNumber(day.uvMax) === null ? null : Math.round(finiteNumber(day.uvMax)!),
    }));

  const elaboratedAt =
    typeof root.elaborado === "string" && root.elaborado.trim()
      ? root.elaborado.trim()
      : null;

  return {
    municipality: {
      code: municipality.code,
      name:
        typeof root.nombre === "string" && root.nombre.trim()
          ? root.nombre.trim()
          : municipality.name,
      province:
        typeof root.provincia === "string" && root.provincia.trim()
          ? root.provincia.trim()
          : municipality.province,
    },
    forecast: {
      provider: "AEMET OpenData",
      elaboratedAt,
      days,
    },
    freshness: classifyFreshness(elaboratedAt),
    availability: { mode: "live" },
    cache: { hit: false, ttlSeconds: CACHE_TTL_MS / 1000 },
    source: {
      label: "AEMET OpenData",
      attribution: "AEMET",
      scopeNote:
        "Predicción municipal de referencia; dentro del término municipal puede variar por altitud y localización de la finca.",
    },
    servedAt: new Date().toISOString(),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  let body: { municipalityCode?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "INVALID_JSON" }, 400);
  }

  const code =
    typeof body.municipalityCode === "string"
      ? body.municipalityCode.trim()
      : "";

  if (!municipalities[code]) {
    return jsonResponse({ error: "MUNICIPALITY_NOT_ALLOWED" }, 400);
  }

  const cached = cache.get(code);
  if (cached && cached.expiresAt > Date.now()) {
    const value = cached.value as Record<string, unknown>;
    return jsonResponse({
      ...value,
      availability: { mode: "cache" },
      cache: {
        hit: true,
        ttlSeconds: Math.max(0, Math.round((cached.expiresAt - Date.now()) / 1000)),
      },
      servedAt: new Date().toISOString(),
    });
  }

  const apiKey = Deno.env.get("AEMET_API_KEY")?.trim();
  if (!apiKey) {
    return jsonResponse(
      {
        error: "AEMET_API_KEY_NOT_CONFIGURED",
        message: "La clave de AEMET no está configurada en el backend.",
      },
      503,
    );
  }

  try {
    const value = await fetchForecast(code, apiKey);
    cache.set(code, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      value,
    });
    return jsonResponse(value);
  } catch (error) {
    console.error("weather-forecast error", {
      municipalityCode: code,
      error: error instanceof Error ? error.message : String(error),
    });

    if (cached) {
      const value = cached.value as Record<string, unknown>;
      const freshness = (value.freshness ?? {}) as { status?: string };
      if (freshness.status === "fresh" || freshness.status === "aging") {
        return jsonResponse({
          ...value,
          availability: { mode: "degraded-cache" },
          cache: { hit: true, ttlSeconds: 0 },
          servedAt: new Date().toISOString(),
        });
      }
    }

    return jsonResponse(
      {
        error: "WEATHER_PROVIDER_UNAVAILABLE",
        message: "AEMET no está disponible temporalmente.",
      },
      502,
    );
  }
});
