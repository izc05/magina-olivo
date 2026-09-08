const CATASTRO_WFS_URL = 'https://ovc.catastro.meh.es/INSPIRE/wfsCP.aspx';
const CATASTRO_TIMEOUT_MS = 8_000;
const CATASTRO_MAX_FEATURES = 80;
const MAX_XML_BYTES = 2_000_000;
const WEB_MERCATOR_RADIUS = 6_378_137;
const POINT_QUERY_RADIUS_DEGREES = 0.00035;

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

export type CatastroGeometry = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
};

export type CatastroParcel = {
  id: string;
  nationalCadastralReference: string;
  label: string | null;
  areaM2: number | null;
  beginLifespanVersion: string | null;
  geometry: CatastroGeometry;
};

export class CatastroParcelNotFoundError extends Error {
  constructor(message = 'Catastro parcel not found') {
    super(message);
    this.name = 'CatastroParcelNotFoundError';
  }
}

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

export function normalizeCadastralReference(reference: string): string {
  const normalized = reference.replace(/\s+/g, '').trim().toUpperCase();
  if (!/^[A-Z0-9]{14}(?:[A-Z0-9]{4}(?:[A-Z0-9]{2})?)?$/.test(normalized)) {
    throw new Error('Invalid cadastral reference');
  }
  return normalized.slice(0, 14);
}

export function validateCadastralReference(reference: string): boolean {
  try {
    normalizeCadastralReference(reference);
    return true;
  } catch {
    return false;
  }
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
  const normalized = normalizeCadastralReference(reference);
  const url = new URL(CATASTRO_WFS_URL);
  url.searchParams.set('service', 'WFS');
  url.searchParams.set('version', '2.0.0');
  url.searchParams.set('request', 'GetFeature');
  url.searchParams.set('STOREDQUERY_ID', 'GetParcel');
  url.searchParams.set('refcat', normalized);
  url.searchParams.set('srsName', 'EPSG::3857');
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

function blocksByLocalName(xml: string, localName: string): string[] {
  const blocks: string[] = [];
  const expression = new RegExp(`<(?:(?:[A-Za-z0-9_-]+):)?${localName}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[A-Za-z0-9_-]+):)?${localName}>`, 'gi');
  let match: RegExpExecArray | null;
  while ((match = expression.exec(xml)) !== null) {
    if (match[1]) blocks.push(match[1]);
    if (blocks.length > 128) break;
  }
  return blocks;
}

function firstPosList(block: string): number[][] | null {
  const match = /<(?:(?:[A-Za-z0-9_-]+):)?posList\b[^>]*>([\s\S]*?)<\/(?:(?:[A-Za-z0-9_-]+):)?posList>/i.exec(block);
  return match?.[1] ? parsePosList(xmlText(match[1])) : null;
}

function polygonCoordinates(block: string): number[][][] | null {
  const exteriorBlock = blocksByLocalName(block, 'exterior')[0] ?? block;
  const exterior = firstPosList(exteriorBlock);
  if (!exterior) return null;

  const coordinates: number[][][] = [exterior];
  for (const interiorBlock of blocksByLocalName(block, 'interior')) {
    const interior = firstPosList(interiorBlock);
    if (interior) coordinates.push(interior);
    if (coordinates.length > 64) break;
  }
  return coordinates;
}

function extractPolygons(memberXml: string): number[][][][] {
  let blocks = blocksByLocalName(memberXml, 'PolygonPatch');
  if (!blocks.length) blocks = blocksByLocalName(memberXml, 'Polygon');

  const polygons = blocks
    .map(polygonCoordinates)
    .filter((value): value is number[][][] => value !== null);
  if (polygons.length) return polygons;

  const fallback = firstPosList(memberXml);
  return fallback ? [[fallback]] : [];
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
    const rawReference = tagValue(member, 'nationalCadastralReference');
    if (!rawReference || !validateCadastralReference(rawReference)) continue;
    const reference = normalizeCadastralReference(rawReference);
    const polygons = extractPolygons(member);
    if (!polygons.length) continue;
    const geometry: CatastroGeometry = polygons.length === 1
      ? { type: 'Polygon', coordinates: polygons[0]! }
      : { type: 'MultiPolygon', coordinates: polygons };
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

function pointOnSegment(point: CatastroPoint, start: number[], end: number[]): boolean {
  const [x, y] = [point.longitude, point.latitude];
  const [x1, y1] = start;
  const [x2, y2] = end;
  if (![x1, y1, x2, y2].every(Number.isFinite)) return false;
  const cross = (x - x1!) * (y2! - y1!) - (y - y1!) * (x2! - x1!);
  if (Math.abs(cross) > 1e-10) return false;
  const squaredLength = (x2! - x1!) ** 2 + (y2! - y1!) ** 2;
  if (squaredLength <= 1e-20) {
    return Math.abs(x - x1!) <= 1e-10 && Math.abs(y - y1!) <= 1e-10;
  }
  const dot = (x - x1!) * (x2! - x1!) + (y - y1!) * (y2! - y1!);
  if (dot < -1e-10) return false;
  return dot <= squaredLength + 1e-10;
}

function pointInRing(point: CatastroPoint, ring: number[][]): boolean {
  if (ring.length < 4) return false;
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const currentPoint = ring[index]!;
    const previousPoint = ring[previous]!;
    if (pointOnSegment(point, previousPoint, currentPoint)) return true;
    const [xCurrent, yCurrent] = currentPoint;
    const [xPrevious, yPrevious] = previousPoint;
    if (![xCurrent, yCurrent, xPrevious, yPrevious].every(Number.isFinite)) continue;
    const crosses = (yCurrent! > point.latitude) !== (yPrevious! > point.latitude)
      && point.longitude < (xPrevious! - xCurrent!) * (point.latitude - yCurrent!) / (yPrevious! - yCurrent!) + xCurrent!;
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point: CatastroPoint, coordinates: number[][][]): boolean {
  const exterior = coordinates[0];
  if (!exterior || !pointInRing(point, exterior)) return false;
  return !coordinates.slice(1).some((hole) => pointInRing(point, hole));
}

export function geometryContainsPoint(geometry: CatastroGeometry, point: CatastroPoint): boolean {
  const validation = validateCatastroPoint(point);
  if (validation) return false;
  if (geometry.type === 'Polygon') return pointInPolygon(point, geometry.coordinates as number[][][]);
  return (geometry.coordinates as number[][][][]).some((polygon) => pointInPolygon(point, polygon));
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

export async function fetchCatastroParcels(bbox: CatastroBbox): Promise<CatastroParcel[]> {
  return parseCatastroGml(await fetchCatastroXml(buildCatastroBboxUrl(bbox)));
}

export async function fetchCatastroParcelByReference(reference: string): Promise<CatastroParcel> {
  const normalized = normalizeCadastralReference(reference);
  const items = parseCatastroGml(await fetchCatastroXml(buildCatastroReferenceUrl(normalized)));
  const exact = items.find((item) => item.nationalCadastralReference === normalized);
  if (!exact) throw new CatastroParcelNotFoundError();
  return exact;
}

export async function fetchCatastroParcelAtPoint(point: CatastroPoint): Promise<CatastroParcel> {
  const validation = validateCatastroPoint(point);
  if (validation) throw new Error(validation);
  const bbox: CatastroBbox = {
    minLon: Math.max(-180, point.longitude - POINT_QUERY_RADIUS_DEGREES),
    minLat: Math.max(-85, point.latitude - POINT_QUERY_RADIUS_DEGREES),
    maxLon: Math.min(180, point.longitude + POINT_QUERY_RADIUS_DEGREES),
    maxLat: Math.min(85, point.latitude + POINT_QUERY_RADIUS_DEGREES),
  };
  const items = await fetchCatastroParcels(bbox);
  const exact = items.find((item) => geometryContainsPoint(item.geometry, point));
  if (!exact) throw new CatastroParcelNotFoundError('No cadastral parcel contains the selected point');
  return exact;
}
