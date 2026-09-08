export type BoundarySource = 'manual_map' | 'manual_gps' | 'imported' | 'sigpac' | 'catastro';

export type GeoJsonPolygon = {
  type: 'Polygon';
  coordinates: number[][][];
};

export type GeoJsonMultiPolygon = {
  type: 'MultiPolygon';
  coordinates: number[][][][];
};

export type GeoJsonBoundary = GeoJsonPolygon | GeoJsonMultiPolygon;

const MAX_BOUNDARY_POSITIONS = 20_000;
const MAX_BOUNDARY_RINGS = 256;
const MAX_BOUNDARY_POLYGONS = 128;

function degreesToRadians(value: number): number {
  return value * Math.PI / 180;
}

function normalizedLongitudeDelta(from: number, to: number): number {
  let delta = degreesToRadians(to - from);
  if (delta > Math.PI) delta -= 2 * Math.PI;
  if (delta < -Math.PI) delta += 2 * Math.PI;
  return delta;
}

export function polygonAreaSquareMeters(ring: number[][]): number {
  const earthRadiusM = 6_378_137;
  let sum = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const current = ring[index];
    const next = ring[index + 1];
    if (!current || !next) continue;
    const [lon1, lat1] = current;
    const [lon2, lat2] = next;
    if (lon1 == null || lat1 == null || lon2 == null || lat2 == null) continue;
    const deltaLon = normalizedLongitudeDelta(lon1, lon2);
    sum += deltaLon * (2 + Math.sin(degreesToRadians(lat1)) + Math.sin(degreesToRadians(lat2)));
  }
  return Math.abs(sum) * earthRadiusM * earthRadiusM / 2;
}

function validateRing(ring: unknown, counters: { positions: number; rings: number }): { ok: true; areaM2: number } | { ok: false; message: string } {
  if (!Array.isArray(ring) || ring.length < 4) {
    return { ok: false, message: 'Boundary ring must contain at least three vertices and a closing position' };
  }
  counters.rings += 1;
  counters.positions += ring.length;
  if (counters.rings > MAX_BOUNDARY_RINGS) return { ok: false, message: 'Boundary contains too many rings' };
  if (counters.positions > MAX_BOUNDARY_POSITIONS) return { ok: false, message: 'Boundary exceeds the maximum number of positions' };

  for (const position of ring) {
    if (!Array.isArray(position) || position.length !== 2) {
      return { ok: false, message: 'Each boundary position must contain longitude and latitude' };
    }
    const [longitude, latitude] = position;
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      return { ok: false, message: 'Boundary contains a non-numeric coordinate' };
    }
    if (Number(longitude) < -180 || Number(longitude) > 180 || Number(latitude) < -90 || Number(latitude) > 90) {
      return { ok: false, message: 'Boundary contains coordinates outside WGS84 ranges' };
    }
  }

  const first = ring[0] as number[] | undefined;
  const last = ring[ring.length - 1] as number[] | undefined;
  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
    return { ok: false, message: 'Boundary rings must be closed' };
  }

  const uniqueVertices = new Set((ring as number[][]).slice(0, -1).map((position) => `${position[0]},${position[1]}`));
  if (uniqueVertices.size < 3) {
    return { ok: false, message: 'Boundary ring requires at least three distinct vertices' };
  }

  const areaM2 = polygonAreaSquareMeters(ring as number[][]);
  if (!Number.isFinite(areaM2) || areaM2 <= 0) {
    return { ok: false, message: 'Boundary ring area could not be calculated' };
  }
  return { ok: true, areaM2 };
}

function validatePolygonCoordinates(
  rings: unknown,
  counters: { positions: number; rings: number },
): { ok: true; areaM2: number } | { ok: false; message: string } {
  if (!Array.isArray(rings) || rings.length < 1) {
    return { ok: false, message: 'Boundary polygon must contain an exterior ring' };
  }

  let areaM2 = 0;
  for (let index = 0; index < rings.length; index += 1) {
    const result = validateRing(rings[index], counters);
    if (!result.ok) return result;
    areaM2 += index === 0 ? result.areaM2 : -result.areaM2;
  }
  if (!Number.isFinite(areaM2) || areaM2 <= 0) {
    return { ok: false, message: 'Boundary holes consume the full exterior polygon area' };
  }
  return { ok: true, areaM2 };
}

export function validateBoundary(boundary: GeoJsonBoundary): { ok: true; areaHa: number; positions: number; rings: number; polygons: number } | { ok: false; message: string } {
  if (!boundary || (boundary.type !== 'Polygon' && boundary.type !== 'MultiPolygon') || !Array.isArray(boundary.coordinates)) {
    return { ok: false, message: 'Boundary must be a GeoJSON Polygon or MultiPolygon' };
  }

  const counters = { positions: 0, rings: 0 };
  const polygons = boundary.type === 'Polygon' ? [boundary.coordinates] : boundary.coordinates;
  if (!Array.isArray(polygons) || polygons.length < 1 || polygons.length > MAX_BOUNDARY_POLYGONS) {
    return { ok: false, message: 'Boundary contains an invalid number of polygons' };
  }

  let areaM2 = 0;
  for (const polygon of polygons) {
    const result = validatePolygonCoordinates(polygon, counters);
    if (!result.ok) return result;
    areaM2 += result.areaM2;
  }

  if (!Number.isFinite(areaM2) || areaM2 <= 0) {
    return { ok: false, message: 'Boundary area could not be calculated' };
  }

  return {
    ok: true,
    areaHa: areaM2 / 10_000,
    positions: counters.positions,
    rings: counters.rings,
    polygons: polygons.length,
  };
}
