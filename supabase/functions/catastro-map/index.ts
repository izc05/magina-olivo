const CATASTRO_WFS_URL = "https://ovc.catastro.meh.es/INSPIRE/wfsCP.aspx";
const TIMEOUT_MS = 8_000;
const MAX_FEATURES = 80;
const MAX_XML_BYTES = 2_000_000;
const MAX_BBOX_SPAN = 0.05;
const WEB_MERCATOR_RADIUS = 6_378_137;

type Bbox = {
  minLongitude: number;
  minLatitude: number;
  maxLongitude: number;
  maxLatitude: number;
};

type Geometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

type Parcel = {
  id: string;
  nationalCadastralReference: string;
  label: string | null;
  areaM2: number | null;
  beginLifespanVersion: string | null;
  geometry: Geometry;
};

type Body =
  | { operation: "reference"; reference: string }
  | { operation: "bbox"; bbox: Bbox };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, max-age=30",
    },
  });
}

function normalizeReference(value: string): string | null {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (![14, 18, 20].includes(compact.length)) return null;
  return compact.slice(0, 14);
}

function validateBbox(bbox: Bbox): string | null {
  const values = [
    bbox.minLongitude,
    bbox.minLatitude,
    bbox.maxLongitude,
    bbox.maxLatitude,
  ];

  if (!values.every(Number.isFinite)) return "BBOX_NON_FINITE";
  if (bbox.minLongitude < -180 || bbox.maxLongitude > 180) {
    return "BBOX_LONGITUDE_OUT_OF_RANGE";
  }
  if (bbox.minLatitude < -85 || bbox.maxLatitude > 85) {
    return "BBOX_LATITUDE_OUT_OF_RANGE";
  }
  if (
    bbox.minLongitude >= bbox.maxLongitude ||
    bbox.minLatitude >= bbox.maxLatitude
  ) {
    return "BBOX_EMPTY_OR_INVERTED";
  }
  if (bbox.maxLongitude - bbox.minLongitude > MAX_BBOX_SPAN) {
    return "BBOX_TOO_WIDE";
  }
  if (bbox.maxLatitude - bbox.minLatitude > MAX_BBOX_SPAN) {
    return "BBOX_TOO_TALL";
  }
  return null;
}

function lonLatToMercator(longitude: number, latitude: number): [number, number] {
  const x = WEB_MERCATOR_RADIUS * longitude * Math.PI / 180;
  const safeLatitude = Math.max(-85.05112878, Math.min(85.05112878, latitude));
  const y = WEB_MERCATOR_RADIUS *
    Math.log(Math.tan(Math.PI / 4 + safeLatitude * Math.PI / 360));
  return [x, y];
}

function mercatorToLonLat(x: number, y: number): [number, number] {
  const longitude = x / WEB_MERCATOR_RADIUS * 180 / Math.PI;
  const latitude = (
    2 * Math.atan(Math.exp(y / WEB_MERCATOR_RADIUS)) - Math.PI / 2
  ) * 180 / Math.PI;
  return [longitude, latitude];
}

function buildReferenceUrl(reference: string): string {
  const url = new URL(CATASTRO_WFS_URL);
  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", "2.0.0");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("STOREDQUERY_ID", "GetParcel");
  url.searchParams.set("refcat", reference);
  url.searchParams.set("srsName", "EPSG::3857");
  return url.toString();
}

function buildBboxUrl(bbox: Bbox): string {
  const [minX, minY] = lonLatToMercator(bbox.minLongitude, bbox.minLatitude);
  const [maxX, maxY] = lonLatToMercator(bbox.maxLongitude, bbox.maxLatitude);

  const url = new URL(CATASTRO_WFS_URL);
  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", "2.0.0");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("typenames", "cp:CadastralParcel");
  url.searchParams.set("srsName", "EPSG::3857");
  url.searchParams.set("bbox", `${minX},${minY},${maxX},${maxY}`);
  url.searchParams.set("count", String(MAX_FEATURES));
  return url.toString();
}

function xmlText(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function tagValue(xml: string, localName: string): string | null {
  const expression = new RegExp(
    `<(?:(?:[A-Za-z0-9_-]+):)?${localName}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[A-Za-z0-9_-]+):)?${localName}>`,
    "i",
  );
  const match = expression.exec(xml);
  if (!match?.[1]) return null;
  return xmlText(match[1].replace(/<[^>]+>/g, ""));
}

function finiteNumber(value: string | null): number | null {
  if (!value) return null;
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function parseRing(text: string): number[][] | null {
  const values = text.trim().split(/\s+/).map(Number);
  if (
    values.length < 8 ||
    values.length % 2 !== 0 ||
    !values.every(Number.isFinite)
  ) {
    return null;
  }

  const ring: number[][] = [];
  for (let index = 0; index < values.length; index += 2) {
    ring.push(mercatorToLonLat(values[index], values[index + 1]));
    if (ring.length > 10_000) return null;
  }

  return ring;
}

function extractPosLists(xml: string): number[][][] {
  const rings: number[][][] = [];
  const expression =
    /<(?:(?:[A-Za-z0-9_-]+):)?posList\b[^>]*>([\s\S]*?)<\/(?:(?:[A-Za-z0-9_-]+):)?posList>/gi;
  let match: RegExpExecArray | null;

  while ((match = expression.exec(xml)) !== null) {
    if (!match[1]) continue;
    const ring = parseRing(xmlText(match[1]));
    if (ring) rings.push(ring);
    if (rings.length > 128) break;
  }

  return rings;
}

function extractGeometry(member: string): Geometry | null {
  const polygonBlocks: string[] = [];
  const polygonExpression =
    /<(?:(?:[A-Za-z0-9_-]+):)?(?:Polygon|PolygonPatch)\b[^>]*>([\s\S]*?)<\/(?:(?:[A-Za-z0-9_-]+):)?(?:Polygon|PolygonPatch)>/gi;
  let polygonMatch: RegExpExecArray | null;

  while ((polygonMatch = polygonExpression.exec(member)) !== null) {
    if (polygonMatch[1]) polygonBlocks.push(polygonMatch[1]);
    if (polygonBlocks.length > 64) break;
  }

  const polygons = polygonBlocks
    .map(extractPosLists)
    .filter((rings) => rings.length > 0);

  if (polygons.length === 1) {
    return { type: "Polygon", coordinates: polygons[0] };
  }
  if (polygons.length > 1) {
    return { type: "MultiPolygon", coordinates: polygons };
  }

  const fallbackRings = extractPosLists(member);
  if (!fallbackRings.length) return null;
  return { type: "Polygon", coordinates: fallbackRings };
}

function parseCatastroGml(xml: string): Parcel[] {
  if (!xml || new TextEncoder().encode(xml).byteLength > MAX_XML_BYTES) {
    throw new Error("CATASTRO_RESPONSE_TOO_LARGE");
  }
  if (/<(?:ows:)?ExceptionReport\b/i.test(xml)) {
    throw new Error("CATASTRO_WFS_EXCEPTION");
  }

  const memberExpression =
    /<(?:(?:[A-Za-z0-9_-]+):)?member\b[^>]*>([\s\S]*?)<\/(?:(?:[A-Za-z0-9_-]+):)?member>/gi;

  const items: Parcel[] = [];
  let memberMatch: RegExpExecArray | null;

  while (
    (memberMatch = memberExpression.exec(xml)) !== null &&
    items.length < MAX_FEATURES
  ) {
    const member = memberMatch[1] ?? "";
    if (!/CadastralParcel/i.test(member)) continue;

    const reference = tagValue(member, "nationalCadastralReference")?.toUpperCase();
    if (!reference || !/^[A-Z0-9]{14}$/.test(reference)) continue;

    const geometry = extractGeometry(member);
    if (!geometry) continue;

    items.push({
      id: reference,
      nationalCadastralReference: reference,
      label: tagValue(member, "label"),
      areaM2: finiteNumber(tagValue(member, "areaValue")),
      beginLifespanVersion: tagValue(member, "beginLifespanVersion"),
      geometry,
    });
  }

  return items;
}

async function fetchXml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      accept: "application/gml+xml, application/xml, text/xml",
      "user-agent": "Magina-Olivo/1.0 Catastro-INSPIRE-adapter",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`CATASTRO_HTTP_${response.status}`);
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_XML_BYTES) {
    throw new Error("CATASTRO_RESPONSE_TOO_LARGE");
  }

  return await response.text();
}

function sourceMetadata() {
  return {
    provider: "Dirección General del Catastro",
    dataset: "INSPIRE Cadastral Parcels",
    service: "WFS 2.0",
    checkedAt: new Date().toISOString(),
  };
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  let body: Body;
  try {
    body = await request.json() as Body;
  } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }

  try {
    if (body.operation === "reference") {
      const reference = normalizeReference(body.reference ?? "");
      if (!reference) {
        return json({ error: "INVALID_CADASTRAL_REFERENCE" }, 400);
      }

      const items = parseCatastroGml(await fetchXml(buildReferenceUrl(reference)));
      const item = items.find(
        (candidate) => candidate.nationalCadastralReference === reference,
      );

      if (!item) {
        return json({ error: "PARCEL_NOT_FOUND" }, 404);
      }

      return json({ item, source: sourceMetadata() });
    }

    if (body.operation === "bbox") {
      const validationError = validateBbox(body.bbox);
      if (validationError) {
        return json({ error: validationError }, 400);
      }

      const items = parseCatastroGml(await fetchXml(buildBboxUrl(body.bbox)));
      return json({ items, source: sourceMetadata() });
    }

    return json({ error: "UNSUPPORTED_OPERATION" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    console.error("catastro-map", { message });
    return json({ error: message }, 502);
  }
});
