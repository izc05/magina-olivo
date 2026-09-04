import type { SigpacBbox, SigpacGeometry } from './sigpac-client.ts';
import type { GeoJsonPolygon } from './plot-boundary-geometry.ts';

type Position = [number, number];

function collectPositions(value: unknown, output: Position[] = []): Position[] {
  if (!Array.isArray(value)) return output;
  if (value.length === 2 && value.every((item) => typeof item === 'number' && Number.isFinite(item))) {
    output.push([value[0] as number, value[1] as number]);
    return output;
  }
  for (const child of value) collectPositions(child, output);
  return output;
}

export function geometryBbox(geometry: GeoJsonPolygon | SigpacGeometry): SigpacBbox | null {
  const positions = collectPositions(geometry.coordinates);
  if (!positions.length) return null;
  const longitudes = positions.map(([longitude]) => longitude);
  const latitudes = positions.map(([, latitude]) => latitude);
  const bbox = {
    minLon: Math.min(...longitudes),
    minLat: Math.min(...latitudes),
    maxLon: Math.max(...longitudes),
    maxLat: Math.max(...latitudes),
  };
  if (![bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat].every(Number.isFinite)) return null;
  if (bbox.minLon >= bbox.maxLon || bbox.minLat >= bbox.maxLat) return null;
  return bbox;
}

export function expandSigpacBbox(bbox: SigpacBbox): SigpacBbox | null {
  const spanLon = bbox.maxLon - bbox.minLon;
  const spanLat = bbox.maxLat - bbox.minLat;
  if (spanLon <= 0 || spanLat <= 0 || spanLon > 0.048 || spanLat > 0.048) return null;

  const marginLon = Math.min(0.002, Math.max(0.0005, spanLon * 0.15));
  const marginLat = Math.min(0.002, Math.max(0.0005, spanLat * 0.15));
  const maxMarginLon = Math.max(0, (0.05 - spanLon) / 2);
  const maxMarginLat = Math.max(0, (0.05 - spanLat) / 2);

  return {
    minLon: Math.max(-180, bbox.minLon - Math.min(marginLon, maxMarginLon)),
    minLat: Math.max(-90, bbox.minLat - Math.min(marginLat, maxMarginLat)),
    maxLon: Math.min(180, bbox.maxLon + Math.min(marginLon, maxMarginLon)),
    maxLat: Math.min(90, bbox.maxLat + Math.min(marginLat, maxMarginLat)),
  };
}

export function bboxesIntersect(left: SigpacBbox, right: SigpacBbox): boolean {
  return left.minLon <= right.maxLon
    && left.maxLon >= right.minLon
    && left.minLat <= right.maxLat
    && left.maxLat >= right.minLat;
}
