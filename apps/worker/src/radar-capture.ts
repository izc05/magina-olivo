import { createHash, randomUUID } from 'node:crypto';
import type pg from 'pg';

const AEMET_RADAR_PRODUCTS = [
  { url: 'https://opendata.aemet.es/opendata/api/red/radar/nacional', product: 'national-radar-composite' },
  // AEMET does not always publish the national composite. Malaga covers Sierra Magina.
  { url: 'https://opendata.aemet.es/opendata/api/red/radar/regional/ml', product: 'regional-radar-malaga' },
] as const;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_FRAMES = 18;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/gif', 'image/jpeg', 'image/webp']);

type AemetEnvelope = {
  estado?: number | string;
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

async function readBodyWithinLimit(response: Response, maxBytes: number): Promise<Buffer> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('AEMET radar image response had no body');

  const chunks: Buffer[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new Error('AEMET radar image exceeds the configured size limit');
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  if (totalBytes === 0) throw new Error('AEMET radar image is empty');
  return Buffer.concat(chunks, totalBytes);
}

export async function captureRadarFrame(pool: pg.Pool): Promise<{ inserted: boolean; hash: string; product: string }> {
  const apiKey = aemetApiKey();
  let selected: { imageUrl: URL; product: string } | null = null;
  for (const candidate of AEMET_RADAR_PRODUCTS) {
    const endpoint = new URL(candidate.url);
    endpoint.searchParams.set('api_key', apiKey);
    const metadataResponse = await fetchWithTimeout(endpoint);
    if (!metadataResponse.ok) continue;
    const envelope = await metadataResponse.json() as AemetEnvelope;
    if (Number(envelope.estado) === 200 && typeof envelope.datos === 'string' && envelope.datos) {
      selected = { imageUrl: validateAemetDataUrl(envelope.datos), product: candidate.product };
      break;
    }
  }
  if (!selected) throw new Error('AEMET radar metadata did not include a usable image URL');

  const imageResponse = await fetchWithTimeout(selected.imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`AEMET radar image HTTP ${imageResponse.status}`);
  }

  const contentType = (imageResponse.headers.get('content-type') ?? '').split(';', 1)[0]?.trim().toLowerCase();
  if (!contentType || !ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error(`Unsupported AEMET radar content type: ${contentType || 'missing'}`);
  }

  const declaredLength = Number(imageResponse.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
    await imageResponse.body?.cancel().catch(() => undefined);
    throw new Error('AEMET radar image exceeds the configured size limit');
  }

  const image = await readBodyWithinLimit(imageResponse, MAX_IMAGE_BYTES);

  const hash = createHash('sha256').update(image).digest('hex');
  const inserted = await pool.query(
    `
      insert into weather_radar_frames (
        id, captured_at, image_sha256, content_type, image_data, provider, source_product
      )
      values ($1, now(), $2, $3, $4, 'AEMET OpenData', $5)
      on conflict (image_sha256) do nothing
      returning id
    `,
    [randomUUID(), hash, contentType, image, selected.product],
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

  return { inserted: inserted.rowCount === 1, hash, product: selected.product };
}
