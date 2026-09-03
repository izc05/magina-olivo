const AEMET_BASE_URL = 'https://opendata.aemet.es/opendata';

export type PublicWeatherDay = {
  date: string;
  precipitationProbabilityPercent: number | null;
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
  windMaxKmh: number | null;
};

export type PublicWeatherForecast = {
  provider: 'AEMET OpenData';
  municipalityCode: string;
  municipalityName: string | null;
  province: string | null;
  elaboratedAt: string | null;
  days: PublicWeatherDay[];
};

type AemetEnvelope = {
  estado?: number;
  descripcion?: string;
  datos?: string;
};

type AemetProbability = { value?: number | string | null; periodo?: string };
type AemetWind = { velocidad?: Array<number | string> };
type AemetDay = {
  fecha?: string;
  probPrecipitacion?: AemetProbability[];
  temperatura?: { maxima?: number | string; minima?: number | string };
  viento?: AemetWind[];
};
type AemetMunicipalityForecast = {
  elaborado?: string;
  nombre?: string;
  provincia?: string;
  prediccion?: { dia?: AemetDay[] };
};

function finiteNumber(value: unknown): number | null {
  const number = typeof value === 'string' && value.trim() === '' ? Number.NaN : Number(value);
  return Number.isFinite(number) ? number : null;
}

function maxFinite(values: unknown[]): number | null {
  const numbers = values.map(finiteNumber).filter((value): value is number => value !== null);
  return numbers.length ? Math.max(...numbers) : null;
}

function dailyPrecipitationProbability(values: AemetProbability[] | undefined): number | null {
  if (!values?.length) return null;
  const fullDay = values.find((item) => item.periodo === '00-24');
  const fullDayValue = finiteNumber(fullDay?.value);
  if (fullDayValue !== null) return fullDayValue;
  return maxFinite(values.map((item) => item.value));
}

function maxWindKmh(values: AemetWind[] | undefined): number | null {
  if (!values?.length) return null;
  return maxFinite(values.flatMap((item) => item.velocidad ?? []));
}

export function parseAemetDailyForecast(
  municipalityCode: string,
  payload: unknown,
): PublicWeatherForecast {
  const rows = Array.isArray(payload) ? payload : [];
  const root = (rows[0] ?? {}) as AemetMunicipalityForecast;
  const days = root.prediccion?.dia ?? [];

  return {
    provider: 'AEMET OpenData',
    municipalityCode,
    municipalityName: root.nombre?.trim() || null,
    province: root.provincia?.trim() || null,
    elaboratedAt: root.elaborado?.trim() || null,
    days: days
      .filter((day): day is AemetDay & { fecha: string } => typeof day.fecha === 'string' && day.fecha.length > 0)
      .slice(0, 7)
      .map((day) => ({
        date: day.fecha,
        precipitationProbabilityPercent: dailyPrecipitationProbability(day.probPrecipitacion),
        temperatureMinC: finiteNumber(day.temperatura?.minima),
        temperatureMaxC: finiteNumber(day.temperatura?.maxima),
        windMaxKmh: maxWindKmh(day.viento),
      })),
  };
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`AEMET request failed with HTTP ${response.status}`);
  }
  return response.json() as Promise<unknown>;
}

export async function fetchAemetDailyForecast(municipalityCode: string): Promise<PublicWeatherForecast> {
  const apiKey = process.env.AEMET_API_KEY?.trim();
  if (!apiKey) throw new Error('AEMET_API_KEY_NOT_CONFIGURED');

  if (!/^\d{5}$/.test(municipalityCode)) {
    throw new Error('INVALID_AEMET_MUNICIPALITY_CODE');
  }

  const endpoint = `${AEMET_BASE_URL}/api/prediccion/especifica/municipio/diaria/${encodeURIComponent(municipalityCode)}`;
  const envelope = await fetchJson(endpoint, {
    headers: {
      api_key: apiKey,
      accept: 'application/json',
      'user-agent': 'Magina-Olivo/1.0 (+public-weather-adapter)',
    },
  }) as AemetEnvelope;

  if (!envelope.datos || typeof envelope.datos !== 'string') {
    throw new Error(`AEMET_DATA_URL_MISSING:${envelope.estado ?? 'unknown'}`);
  }

  const dataUrl = new URL(envelope.datos);
  if (dataUrl.protocol !== 'https:' || dataUrl.hostname !== 'opendata.aemet.es') {
    throw new Error('AEMET_DATA_URL_NOT_TRUSTED');
  }

  const payload = await fetchJson(dataUrl.toString(), { headers: { accept: 'application/json' } });
  return parseAemetDailyForecast(municipalityCode, payload);
}
