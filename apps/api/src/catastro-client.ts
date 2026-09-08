const CATASTRO_WFS_URL = 'https://ovc.catastro.meh.es/INSPIRE/wfsCP.aspx';
const CATASTRO_COORDINATE_JSON_URL = 'https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCoordenadas.svc/json';
const CATASTRO_TIMEOUT_MS = 8_000;
const CATASTRO_MAX_FEATURES = 80;
const CATASTRO_MAX_POINT_REFERENCES = 12;
const MAX_XML_BYTES = 2_000_000;
const MAX_JSON_BYTES = 512_000;
const WEB_MERCATOR_RADIUS = 6_378_137;

export type CatastroBbox = {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
};

export type CatastroPoint = {
  longitude: number;
  latitude: number;
};

export type CatastroPointMatch = 'exact' | 'nearby' | 'none';

export type CatastroParcel = {
  id: string;
  nationalCadastralReference: string;
  label: string | null;
  areaM2: number | null;
  beginLifespanVersion: string | null;
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
};

function xmlText(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function tagValue(xml: string, localName: string): string | null {
  const expression = new RegExp(`<(?:(?:[A-Za-z0-9_-]+):)?${localName}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[A-Za-z0-9_-]+):)?${localName}>`, 'i');
  const match = expression.exec(xml);
  if (!match?.[1]) return null;
  return xmlText(match[1].replace(/<[^>]+>/g, ''));
}

function finiteNumber(value: string | null): number | null {
  if (value == null || value === '') return null;
  const number = Number(value.replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

export function validateCatastroBbox(bbox: CatastroBbox): string | null {
  const values = [bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat];
  if (!values.every(Number.isFinite)) return 'Catastro bbox must contain finite coordinates';
  if (bbox.minLon < -180 || bbox.maxLon > 180 || bbox.minLat < -85 || bbox.maxLat > 85) {
    return 'Catastro bbox is outside supported WGS84 ranges';
  }
  if (bbox.minLon >= bbox.maxLon || bbox.minLat >= bbox.maxLat) return 'Catastro bbox is inverted or empty';
  if (bbox.maxLon - bbox.minLon > 0.05 || bbox.maxLat - bbox.minLat > 0.05) {
    return 'Catastro bbox exceeds the V1 maximum span';
  }
  return null;
}

export function validateCatastroPoint(point: CatastroPoint): string | null {
  if (!Number.isFinite(point.longitude) || !Number.isFinite(point.latitude)) {
    return 'Catastro point must contain finite coordinates';
  }
  if (point.longitude < -180 || point.longitude > 180 || point.latitude < -85 || point.latitude > 85) {
    return 'Catastro point is outside supported WGS84 ranges';
  }
  return null;
}

export function validateCadastralReference(reference: string): boolean {
  return /^[A-Z0-9]{14}$/.test(reference.trim().toUpperCase());
}

function lonLatToWebMercator(longitude: number, latitude: number): [number, number] {
  const x = WEB_MERCATOR_RADIUS * longitude * Math.PI / 180;
  const safeLatitude = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const y = WEB_MERCATOR_RADIUS * Math.log(Math.tan(Math.PI / 4 + safeLatitude * Math.PI / 360));
  return [x, y];
}

function webMercatorToLonLat(x: number, y: number): [number, number] {
  const longitude = x / WEB_MERCATOR_RADIUS * 180 / Math.PI;
  const latitude = (2 * Math.atan(Math.exp(y / WEB_MERCATOR_RADIUS)) - Math.PI / 2) * 180 / Math.PI;
  return [longitude, latitude];
}

export function buildCatastroBboxUrl(bbox: CatastroBbox): string {
  const validation = validateCatastroBbox(bbox);
  if (validation) throw new Error(validation);
  const [minX, minY] = lonLatToWebMercator(bbox.minLon, bbox.minLat);
  const [maxX, maxY] = lonLatToWebMercator(bbox.maxLon, bbox.maxLat);
  const url = new URL(CATASTRO_WFS_URL);
  url.searchParams.set('service', 'WFS');
  url.searchParams.set('version', '2.0.0');
  url.searchParams.set('request', 'GetFeature');
  url.searchParams.set('typenames', 'cp:CadastralParcel');
  url.searchParams.set('srsName', 'EPSG::3857');
  url.searchParams.set('bbox', `${minX},${minY},${maxX},${maxY}`);
  url.searchParams.set('count', String(CATASTRO_MAX_FEATURES));
  return url.toString();
}

export function buildCatastroReferenceUrl(reference: string): string {
  const normalized = reference.trim().toUpperCase();
  if (!validateCadastralReference(normalized)) throw new Error('Invalid cadastral reference');
  const url = new URL(CATASTRO_WFS_URL);
  url.searchParams.set('service', 'WFS');
  url.searchParams.set('version', '2.0.0');
  url.searchParams.set('request', 'GetFeature');
  url.searchParams.set('STOREDQUERY_ID', 'GetParcel');
  url.searchParams.set('refcat', normalized);
  url.searchParams.set('srsName', 'EPSG::3857');
  return url.toString();
}

export function buildCatastroPointUrl(point: CatastroPoint, nearby = false): string {
  const validation = validateCatastroPoint(point);
  if (validation) throw new Error(validation);
  const operation = nearby ? 'Consulta_RCCOOR_Distancia' : 'Consulta_RCCOOR';
  const url = new URL(`${CATASTRO_COORDINATE_JSON_URL}/${operation}`);
  url.searchParams.set('SRS', 'EPSG:4326');
  url.searchParams.set('CoorX', String(point.longitude));
  url.searchParams.set('CoorY', String(point.latitude));
  return url.toString();
}

function parsePosList(text: string): number[][] | null {
  const values = text.trim().split(/\s+/).map(Number);
  if (values.length < 8 || values.length % 2 !== 0 || !values.every(Number.isFinite)) return null;
  const ring: number[][] = [];
  for (let index = 0; index < values.length; index += 2) {
    const longitudeLatitude = webMercatorToLonLat(values[index]!, values[index + 1]!);
    if (!longitudeLatitude.every(Number.isFinite)) return null;
    ring.push(longitudeLatitude);
    if (ring.length > 10_000) return null;
  }
  return ring;
}

function extractRings(memberXml: string): number[][][] {
  const rings: number[][][] = [];
  const expression = /<(?:(?:[A-Za-z0-9_-]+):)?posList\b[^>]*>([\s\S]*?)<\/(?:(?:[A-Za-z0-9_-]+):)?posList>/gi;
  let match: RegExpExecArray | null;
  while ((match = expression.exec(memberXml)) !== null) {
    if (!match[1]) continue;
    const ring = parsePosList(xmlText(match[1]));
    if (ring) rings.push(ring);
    if (rings.length > 64) break;
  }
  return rings;
}

export function parseCatastroGml(xml: string): CatastroParcel[] {
  if (!xml || Buffer.byteLength(xml, 'utf8') > MAX_XML_BYTES) throw new Error('Catastro response exceeds safe XML size');
  if (/<(?:ows:)?ExceptionReport\b/i.test(xml)) throw new Error('Catastro WFS returned an exception');

  const memberExpression = /<(?:(?:[A-Za-z0-9_-]+):)?member\b[^>]*>([\s\S]*?)<\/(?:(?:[A-Za-z0-9_-]+):)?member>/gi;
  const items: CatastroParcel[] = [];
  let memberMatch: RegExpExecArray | null;
  while ((memberMatch = memberExpression.exec(xml)) !== null && items.length < CATASTRO_MAX_FEATURES) {
    const member = memberMatch[1] ?? '';
    if (!/(?:CadastralParcel)/i.test(member)) continue;
    const reference = tagValue(member, 'nationalCadastralReference')?.toUpperCase() ?? null;
    if (!reference || !validateCadastralReference(reference)) continue;
    const rings = extractRings(member);
    if (!rings.length) continue;
    const geometry = rings.length === 1
      ? { type: 'Polygon' as const, coordinates: [rings[0]!] }
      : { type: 'MultiPolygon' as const, coordinates: rings.map((ring) => [ring]) };
    items.push({
      id: reference,
      nationalCadastralReference: reference,
      label: tagValue(member, 'label'),
      areaM2: finiteNumber(tagValue(member, 'areaValue')),
      beginLifespanVersion: tagValue(member, 'beginLifespanVersion'),
      geometry,
    });
  }
  return items;
}

function collectCadastralReferences(value: unknown, output: Set<string>, depth = 0): void {
  if (depth > 16 || output.size >= CATASTRO_MAX_POINT_REFERENCES || value == null) return;
  if (Array.isArray(value)) {
    for (const child of value) collectCadastralReferences(child, output, depth + 1);
    return;
  }
  if (typeof value !== 'object') return;

  const object = value as Record<string, unknown>;
  const pc1 = typeof object.pc1 === 'string' ? object.pc1.trim().toUpperCase() : '';
  const pc2 = typeof object.pc2 === 'string' ? object.pc2.trim().toUpperCase() : '';
  const combined = `${pc1}${pc2}`;
  if (validateCadastralReference(combined)) output.add(combined);

  for (const candidate of [object.refcat, object.RefCat, object.rc]) {
    if (typeof candidate !== 'string') continue;
    const normalized = candidate.trim().toUpperCase().slice(0, 14);
    if (validateCadastralReference(normalized)) output.add(normalized);
  }

  for (const child of Object.values(object)) collectCadastralReferences(child, output, depth + 1);
}

export function parseCatastroCoordinateJson(value: unknown): string[] {
  const output = new Set<string>();
  collectCadastralReferences(value, output);
  return [...output];
}

async function fetchCatastroXml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      accept: 'application/gml+xml, application/xml, text/xml',
      'user-agent': 'Magina-Olivo/1.0 Catastro-INSPIRE-adapter',
    },
    signal: AbortSignal.timeout(CATASTRO_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Catastro upstream HTTP ${response.status}`);
  const contentLength = Number(response.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_XML_BYTES) throw new Error('Catastro response exceeds safe XML size');
  return response.text();
}

async function fetchCatastroJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'Magina-Olivo/1.0 Catastro-coordinate-adapter',
    },
    signal: AbortSignal.timeout(CATASTRO_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Catastro coordinate upstream HTTP ${response.status}`);
  const contentLength = Number(response.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BYTES) throw new Error('Catastro coordinate response exceeds safe JSON size');
  const text = await response.text();
  if (Buffer.byteLength(text, 'utf8') > MAX_JSON_BYTES) throw new Error('Catastro coordinate response exceeds safe JSON size');
  return JSON.parse(text) as unknown;
}

async function fetchParcelsByReferences(references: string[]): Promise<CatastroParcel[]> {
  const unique = [...new Set(references)].slice(0, CATASTRO_MAX_POINT_REFERENCES);
  const results = await Promise.allSettled(unique.map((reference) => fetchCatastroParcelByReference(reference)));
  return results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
}

export async function fetchCatastroParcels(bbox: CatastroBbox): Promise<CatastroParcel[]> {
  return parseCatastroGml(await fetchCatastroXml(buildCatastroBboxUrl(bbox)));
}

export async function fetchCatastroParcelByReference(reference: string): Promise<CatastroParcel> {
  const normalized = reference.trim().toUpperCase();
  const items = parseCatastroGml(await fetchCatastroXml(buildCatastroReferenceUrl(normalized)));
  const exact = items.find((item) => item.nationalCadastralReference === normalized);
  if (!exact) throw new Error('Catastro parcel not found');
  return exact;
}

export async function identifyCatastroParcelsAtPoint(
  point: CatastroPoint,
  includeNearby = false,
): Promise<{ items: CatastroParcel[]; match: CatastroPointMatch }> {
  const validation = validateCatastroPoint(point);
  if (validation) throw new Error(validation);

  const exactReferences = parseCatastroCoordinateJson(await fetchCatastroJson(buildCatastroPointUrl(point, false)));
  if (exactReferences.length) {
    return { items: await fetchParcelsByReferences(exactReferences), match: 'exact' };
  }

  if (!includeNearby) return { items: [], match: 'none' };

  const nearbyReferences = parseCatastroCoordinateJson(await fetchCatastroJson(buildCatastroPointUrl(point, true)));
  if (!nearbyReferences.length) return { items: [], match: 'none' };
  return { items: await fetchParcelsByReferences(nearbyReferences), match: 'nearby' };
}
