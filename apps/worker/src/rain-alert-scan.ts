import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { normalizePlace, selectRainTriggers, type RainForecastDay } from './rain-alert-rules.ts';

const AEMET_BASE_URL = 'https://opendata.aemet.es/opendata';
const AEMET_DATA_HOST = 'opendata.aemet.es';
const AEMET_PROVIDER = 'AEMET OpenData';
const FORECAST_HORIZON_DAYS = 2;

type CandidateRow = {
  user_id: string;
  threshold_percent: string;
  holding_id: string;
  municipality: string;
};

type MunicipalityRow = {
  slug: string;
  name: string;
  aemet_code: string;
  aliases: string[];
};

type AemetEnvelope = {
  estado?: number;
  descripcion?: string;
  datos?: string;
};

type AemetDay = {
  fecha?: string;
  probPrecipitacion?: Array<{ value?: number | string | null }>;
};

type AemetMunicipality = {
  elaborado?: string;
  prediccion?: { dia?: AemetDay[] };
};

type ForecastSnapshot = {
  elaboratedAt: string | null;
  days: RainForecastDay[];
};

function finiteNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function maxProbability(day: AemetDay): number | null {
  const values = (day.probPrecipitacion ?? [])
    .map((item) => finiteNumber(item.value))
    .filter((value): value is number => value != null);
  return values.length ? Math.max(...values) : null;
}

function safeIso(value: string | undefined): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'magina-olivo-worker/1.0',
      ...headers,
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`AEMET request failed with HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

async function fetchAemetForecast(aemetCode: string, apiKey: string): Promise<ForecastSnapshot> {
  const endpoint = `${AEMET_BASE_URL}/api/prediccion/especifica/municipio/diaria/${encodeURIComponent(aemetCode)}`;
  const envelope = await fetchJson<AemetEnvelope>(endpoint, { api_key: apiKey });
  if (envelope.estado && envelope.estado !== 200) {
    throw new Error(`AEMET metadata response ${envelope.estado}: ${envelope.descripcion ?? 'unknown error'}`);
  }
  if (!envelope.datos) throw new Error('AEMET response did not provide a data URL');

  const dataUrl = new URL(envelope.datos);
  if (dataUrl.protocol !== 'https:' || dataUrl.hostname !== AEMET_DATA_HOST) {
    throw new Error('AEMET returned an untrusted data URL');
  }

  const payload = await fetchJson<AemetMunicipality[]>(dataUrl.toString());
  const municipality = payload[0];
  if (!municipality) throw new Error('AEMET returned an empty municipality forecast');

  const days = (municipality.prediccion?.dia ?? [])
    .map((day) => ({
      date: typeof day.fecha === 'string' ? day.fecha.slice(0, 10) : '',
      precipitationProbabilityPercent: maxProbability(day),
    }))
    .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day.date));

  if (!days.length) throw new Error('AEMET returned no daily forecast data');
  return { elaboratedAt: safeIso(municipality.elaborado), days };
}

async function resolveActiveRainAlerts(pool: pg.Pool, userId: string, holdingId: string): Promise<void> {
  await pool.query(
    `
      update weather_alert_events
      set status = 'resolved',
          resolved_at = now(),
          updated_at = now()
      where user_id = $1
        and holding_id = $2
        and kind = 'rain'
        and status = 'active'
        and forecast_date >= current_date
    `,
    [userId, holdingId],
  );
}

export async function scanRainAlerts(pool: pg.Pool): Promise<{ users: number; alerts: number; sourceFailures: number }> {
  const apiKey = process.env.AEMET_API_KEY?.trim();
  if (!apiKey) throw new Error('AEMET_API_KEY is required for weather.rain.scan');

  await pool.query(
    `
      update weather_alert_events e
      set status = 'resolved',
          resolved_at = now(),
          updated_at = now()
      where e.kind = 'rain'
        and e.status = 'active'
        and not exists (
          select 1
          from user_preferences up
          where up.user_id = e.user_id
            and up.notify_weather = true
        )
    `,
  );

  const candidateResult = await pool.query<CandidateRow>(
    `
      with ranked as (
        select
          up.user_id,
          up.weather_rain_probability_percent_threshold::text as threshold_percent,
          h.id as holding_id,
          h.municipality,
          row_number() over (partition by up.user_id order by h.created_at asc, h.id asc) as position
        from user_preferences up
        join holding_members hm
          on hm.user_id = up.user_id
         and hm.status = 'active'
        join holdings h
          on h.id = hm.holding_id
         and h.active = true
        where up.notify_weather = true
          and h.municipality is not null
          and length(trim(h.municipality)) > 0
      )
      select user_id, threshold_percent, holding_id, municipality
      from ranked
      where position = 1
      order by user_id
    `,
  );

  const municipalityResult = await pool.query<MunicipalityRow>(
    `
      select slug, name, trim(aemet_code) as aemet_code, aliases
      from public_municipalities
      where active = true
    `,
  );

  const municipalityByName = new Map<string, MunicipalityRow>();
  for (const municipality of municipalityResult.rows) {
    municipalityByName.set(normalizePlace(municipality.name), municipality);
    for (const alias of municipality.aliases ?? []) {
      municipalityByName.set(normalizePlace(alias), municipality);
    }
  }

  const forecastCache = new Map<string, ForecastSnapshot | Error>();
  let alerts = 0;
  let sourceFailures = 0;

  for (const candidate of candidateResult.rows) {
    const municipality = municipalityByName.get(normalizePlace(candidate.municipality));
    if (!municipality) {
      await resolveActiveRainAlerts(pool, candidate.user_id, candidate.holding_id);
      continue;
    }

    let snapshot = forecastCache.get(municipality.aemet_code);
    if (!snapshot) {
      try {
        snapshot = await fetchAemetForecast(municipality.aemet_code, apiKey);
      } catch (error) {
        snapshot = error instanceof Error ? error : new Error(String(error));
      }
      forecastCache.set(municipality.aemet_code, snapshot);
    }

    if (snapshot instanceof Error) {
      sourceFailures += 1;
      continue;
    }

    const threshold = Number(candidate.threshold_percent);
    const triggers = selectRainTriggers(snapshot.days, threshold, FORECAST_HORIZON_DAYS);

    await resolveActiveRainAlerts(pool, candidate.user_id, candidate.holding_id);

    for (const trigger of triggers) {
      await pool.query(
        `
          insert into weather_alert_events (
            id,
            user_id,
            holding_id,
            kind,
            status,
            municipality_slug,
            forecast_date,
            precipitation_probability_percent,
            threshold_percent,
            provider,
            provider_elaborated_at,
            first_detected_at,
            last_detected_at,
            resolved_at,
            updated_at
          )
          values ($1, $2, $3, 'rain', 'active', $4, $5::date, $6, $7, $8, $9::timestamptz, now(), now(), null, now())
          on conflict (user_id, holding_id, kind, forecast_date)
          do update set
            status = 'active',
            municipality_slug = excluded.municipality_slug,
            precipitation_probability_percent = excluded.precipitation_probability_percent,
            threshold_percent = excluded.threshold_percent,
            provider = excluded.provider,
            provider_elaborated_at = excluded.provider_elaborated_at,
            last_detected_at = now(),
            resolved_at = null,
            updated_at = now()
        `,
        [
          randomUUID(),
          candidate.user_id,
          candidate.holding_id,
          municipality.slug,
          trigger.date,
          trigger.precipitationProbabilityPercent,
          threshold,
          AEMET_PROVIDER,
          snapshot.elaboratedAt,
        ],
      );
      alerts += 1;
    }
  }

  const attemptedSources = forecastCache.size;
  if (attemptedSources > 0 && [...forecastCache.values()].every((value) => value instanceof Error)) {
    throw new Error('AEMET rain alert scan failed for every requested municipality');
  }

  return { users: candidateResult.rows.length, alerts, sourceFailures };
}
