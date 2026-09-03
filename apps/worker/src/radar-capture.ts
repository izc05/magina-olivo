import { createHash, randomUUID } from 'node:crypto';
import type pg from 'pg';

const AEMET_RADAR_URL = 'https://opendata.aemet.es/opendata/api/red/radar/nacional';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_FRAMES = 18;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/gif', 'image/jpeg', 'image/webp']);

type AemetEnvelope = {
  estado?: number;
  datos?: string;
};

function aemetApiKey(): string {
  const value = process.env.AEMET_API_KEY?.trim();
  if (!value) throw new Error('AEMET_API_KEY is required for radar capture');
  return value;
}

function validateAemetDataUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'opendata.aemet.es') {
    throw new Error('AEMET radar returned an unexpected data URL');
  }
  return url;
}

async function fetchWithTimeout(url: URL | string): Promise<Response> {
  return fetch(url, {
    headers: {
      accept: '*/*',
      'user-agent': 'MaginaOlivo/1.0 (+https://github.com/izc05/magina-olivo)',
    },
    signal: AbortSignal.timeout(12_000),
  });
}

export async function captureRadarFrame(pool: pg.Pool): Promise<{ inserted: boolean; hash: string }> {
  const endpoint = new URL(AEMET_RADAR_URL);
  endpoint.searchParams.set('api_key', aemetApiKey());

  const metadataResponse = await fetchWithTimeout(endpoint);
  if (!metadataResponse.ok) {
    throw new Error(`AEMET radar metadata HTTP ${metadataResponse.status}`);
  }

  const envelope = await metadataResponse.json() as AemetEnvelope;
  if (envelope.estado !== 200 || typeof envelope.datos !== 'string' || !envelope.datos) {
    throw new Error('AEMET radar metadata did not include a usable image URL');
  }

  const imageUrl = validateAemetDataUrl(envelope.datos);
  const imageResponse = await fetchWithTimeout(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`AEMET radar image HTTP ${imageResponse.status}`);
  }

  const contentType = (imageResponse.headers.get('content-type') ?? '').split(';', 1)[0]?.trim().toLowerCase();
  if (!contentType || !ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error(`Unsupported AEMET radar content type: ${contentType || 'missing'}`);
  }

  const declaredLength = Number(imageResponse.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
    throw new Error('AEMET radar image exceeds the configured size limit');
  }

  const image = Buffer.from(await imageResponse.arrayBuffer());
  if (image.length === 0 || image.length > MAX_IMAGE_BYTES) {
    throw new Error('AEMET radar image is empty or exceeds the configured size limit');
  }

  const hash = createHash('sha256').update(image).digest('hex');
  const inserted = await pool.query(
    `
      insert into weather_radar_frames (
        id, captured_at, image_sha256, content_type, image_data, provider, source_product
      )
      values ($1, now(), $2, $3, $4, 'AEMET OpenData', 'national-radar-composite')
      on conflict (image_sha256) do nothing
      returning id
    `,
    [randomUUID(), hash, contentType, image],
  );

  await pool.query(
    `
      delete from weather_radar_frames
      where id in (
        select id
        from weather_radar_frames
        order by captured_at desc, id desc
        offset $1
      )
    `,
    [MAX_FRAMES],
  );

  return { inserted: inserted.rowCount === 1, hash };
}
