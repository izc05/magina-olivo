export type BoundarySource = 'manual_map' | 'manual_gps' | 'imported' | 'sigpac' | 'catastro';

export type GeoJsonPolygon = {
  type: 'Polygon';
  coordinates: number[][][];
};

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

export function validateBoundary(boundary: GeoJsonPolygon): { ok: true; areaHa: number } | { ok: false; message: string } {
  if (boundary.type !== 'Polygon' || !Array.isArray(boundary.coordinates) || boundary.coordinates.length !== 1) {
    return { ok: false, message: 'Boundary must be a GeoJSON Polygon with one exterior ring' };
  }

  const ring = boundary.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4) {
    return { ok: false, message: 'Boundary must contain at least three vertices and a closing position' };
  }
  if (ring.length > 501) {
    return { ok: false, message: 'Boundary exceeds the V2 limit of 500 vertices' };
  }

  for (const position of ring) {
    if (!Array.isArray(position) || position.length !== 2) {
      return { ok: false, message: 'Each boundary position must contain longitude and latitude' };
    }
    const [longitude, latitude] = position;
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      return { ok: false, message: 'Boundary contains a non-numeric coordinate' };
    }
    if (longitude! < -180 || longitude! > 180 || latitude! < -90 || latitude! > 90) {
      return { ok: false, message: 'Boundary contains coordinates outside WGS84 ranges' };
    }
  }

  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
    return { ok: false, message: 'Boundary ring must be closed' };
  }

  const uniqueVertices = new Set(ring.slice(0, -1).map((position) => `${position[0]},${position[1]}`));
  if (uniqueVertices.size < 3) {
    return { ok: false, message: 'Boundary requires at least three distinct vertices' };
  }

  const areaSquareMeters = polygonAreaSquareMeters(ring);
  if (!Number.isFinite(areaSquareMeters) || areaSquareMeters <= 0) {
    return { ok: false, message: 'Boundary area could not be calculated' };
  }

  return { ok: true, areaHa: areaSquareMeters / 10_000 };
}
