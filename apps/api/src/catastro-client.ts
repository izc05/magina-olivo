const CATASTRO_WFS_URL = 'https://ovc.catastro.meh.es/INSPIRE/wfsCP.aspx';
const CATASTRO_COORDINATE_JSON_URL = 'https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCoordenadas.svc/json';
const CATASTRO_TIMEOUT_MS = 8_000;
const CATASTRO_MAX_FEATURES = 80;
const CATASTRO_MAX_POINT_REFERENCES = 12;
const MAX_XML_BYTES = 2_000_000;
const MAX_JSON_BYTES = 512_000;
const MAX_XML_NODES = 100_000;
const MAX_XML_DEPTH = 64;
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

type XmlElement = {
  qName: string;
  localName: string;
  text: string[];
  children: XmlElement[];
};

function decodeXmlText(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function localName(qName: string): string {
  const separator = qName.indexOf(':');
  return separator >= 0 ? qName.slice(separator + 1) : qName;
}

function findMarkupEnd(xml: string, start: number): number {
  let quote: '"' | "'" | null = null;
  for (let index = start; index < xml.length; index += 1) {
    const character = xml[index];
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '>') return index;
  }
  return -1;
}

function parseElementName(markup: string): string {
  const trimmed = markup.trim();
  let end = 0;
  while (end < trimmed.length && !/\s|\//.test(trimmed[end]!)) end += 1;
  return trimmed.slice(0, end);
}

function parseXml(xml: string): XmlElement {
  const root: XmlElement = { qName: '#document', localName: '#document', text: [], children: [] };
  const stack: XmlElement[] = [root];
  let nodes = 0;
  let index = 0;

  while (index < xml.length) {
    const nextMarkup = xml.indexOf('<', index);
    if (nextMarkup < 0) {
      const tail = decodeXmlText(xml.slice(index));
      if (tail) stack[stack.length - 1]!.text.push(tail);
      break;
    }
    if (nextMarkup > index) {
      const text = decodeXmlText(xml.slice(index, nextMarkup));
      if (text) stack[stack.length - 1]!.text.push(text);
    }

    if (xml.startsWith('<!--', nextMarkup)) {
      const end = xml.indexOf('-->', nextMarkup + 4);
      if (end < 0) throw new Error('Catastro returned malformed XML comment');
      index = end + 3;
      continue;
    }
    if (xml.startsWith('<![CDATA[', nextMarkup)) {
      const end = xml.indexOf(']]>', nextMarkup + 9);
      if (end < 0) throw new Error('Catastro returned malformed CDATA');
      stack[stack.length - 1]!.text.push(xml.slice(nextMarkup + 9, end));
      index = end + 3;
      continue;
    }
    if (xml.startsWith('<?', nextMarkup)) {
      const end = xml.indexOf('?>', nextMarkup + 2);
      if (end < 0) throw new Error('Catastro returned malformed XML declaration');
      index = end + 2;
      continue;
    }
    if (xml.startsWith('<!', nextMarkup)) {
      const end = findMarkupEnd(xml, nextMarkup + 2);
      if (end < 0) throw new Error('Catastro returned malformed XML directive');
      index = end + 1;
      continue;
    }
    if (xml.startsWith('</', nextMarkup)) {
      const end = findMarkupEnd(xml, nextMarkup + 2);
      if (end < 0) throw new Error('Catastro returned malformed closing tag');
      const closingName = parseElementName(xml.slice(nextMarkup + 2, end));
      const current = stack[stack.length - 1];
      if (!current || current.qName !== closingName) throw new Error('Catastro returned mismatched XML tags');
      stack.pop();
      index = end + 1;
      continue;
    }

    const end = findMarkupEnd(xml, nextMarkup + 1);
    if (end < 0) throw new Error('Catastro returned malformed opening tag');
    const rawMarkup = xml.slice(nextMarkup + 1, end);
    const selfClosing = rawMarkup.trimEnd().endsWith('/');
    const qName = parseElementName(rawMarkup);
    if (!qName) throw new Error('Catastro returned an unnamed XML element');
    const element: XmlElement = { qName, localName: localName(qName), text: [], children: [] };
    stack[stack.length - 1]!.children.push(element);
    nodes += 1;
    if (nodes > MAX_XML_NODES) throw new Error('Catastro XML contains too many elements');
    if (!selfClosing) {
      stack.push(element);
      if (stack.length > MAX_XML_DEPTH) throw new Error('Catastro XML exceeds maximum nesting depth');
    }
    index = end + 1;
  }

  if (stack.length !== 1) throw new Error('Catastro returned unclosed XML tags');
  return root;
}

function descendants(element: XmlElement, wantedLocalName: string): XmlElement[] {
  const result: XmlElement[] = [];
  const queue = [...element.children];
  while (queue.length) {
    const current = queue.shift()!;
    if (current.localName === wantedLocalName) result.push(current);
    queue.push(...current.children);
  }
  return result;
}

function firstDescendant(element: XmlElement, wantedLocalName: string): XmlElement | null {
  const queue = [...element.children];
  while (queue.length) {
    const current = queue.shift()!;
    if (current.localName === wantedLocalName) return current;
    queue.push(...current.children);
  }
  return null;
}

function elementText(element: XmlElement): string {
  let value = element.text.join('');
  for (const child of element.children) value += elementText(child);
  return value.trim();
}

function firstDescendantText(element: XmlElement, wantedLocalName: string): string | null {
  const found = firstDescendant(element, wantedLocalName);
  if (!found) return null;
  const value = elementText(found);
  return value || null;
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
    if (ring.length > 20_000) return null;
  }
  return ring;
}

function ringFromBoundaryElement(element: XmlElement): number[][] | null {
  const posList = firstDescendant(element, 'posList');
  return posList ? parsePosList(elementText(posList)) : null;
}

function geometryFromParcel(parcel: XmlElement): CatastroGeometry | null {
  const patchContainers = descendants(parcel, 'PolygonPatch');
  const polygonContainers = patchContainers.length ? patchContainers : descendants(parcel, 'Polygon');
  const polygons: number[][][][] = [];

  for (const container of polygonContainers) {
    const exterior = firstDescendant(container, 'exterior');
    const exteriorRing = exterior ? ringFromBoundaryElement(exterior) : null;
    if (!exteriorRing) continue;
    const rings: number[][][] = [exteriorRing];
    for (const interior of descendants(container, 'interior')) {
      const hole = ringFromBoundaryElement(interior);
      if (hole) rings.push(hole);
    }
    polygons.push(rings);
  }

  if (!polygons.length) {
    const exterior = firstDescendant(parcel, 'exterior');
    const ring = exterior ? ringFromBoundaryElement(exterior) : null;
    if (ring) polygons.push([ring]);
  }
  if (!polygons.length) return null;
  if (polygons.length === 1) return { type: 'Polygon', coordinates: polygons[0]! };
  return { type: 'MultiPolygon', coordinates: polygons };
}

export function parseCatastroGml(xml: string): CatastroParcel[] {
  if (!xml || Buffer.byteLength(xml, 'utf8') > MAX_XML_BYTES) throw new Error('Catastro response exceeds safe XML size');
  const document = parseXml(xml);
  if (firstDescendant(document, 'ExceptionReport')) throw new Error('Catastro WFS returned an exception');

  const items: CatastroParcel[] = [];
  for (const parcel of descendants(document, 'CadastralParcel')) {
    if (items.length >= CATASTRO_MAX_FEATURES) break;
    const reference = firstDescendantText(parcel, 'nationalCadastralReference')?.toUpperCase() ?? null;
    if (!reference || !validateCadastralReference(reference)) continue;
    const geometry = geometryFromParcel(parcel);
    if (!geometry) continue;
    items.push({
      id: reference,
      nationalCadastralReference: reference,
      label: firstDescendantText(parcel, 'label'),
      areaM2: finiteNumber(firstDescendantText(parcel, 'areaValue')),
      beginLifespanVersion: firstDescendantText(parcel, 'beginLifespanVersion'),
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
  const xml = await response.text();
  if (Buffer.byteLength(xml, 'utf8') > MAX_XML_BYTES) throw new Error('Catastro response exceeds safe XML size');
  return xml;
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
