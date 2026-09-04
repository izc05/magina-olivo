export type Position = [number, number];
export type MapCenter = { latitude: number; longitude: number };
export type Bbox = { minLon: number; minLat: number; maxLon: number; maxLat: number };
export type BaseMapLayer = 'map' | 'pnoa';
export type CatastroGeometry = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
};
export type Tile = { key: string; href: string; x: number; y: number };

export const TILE_SIZE = 256;
export const MAP_VIEW_SIZE = 768;
export const MIN_CATASTRO_ZOOM = 15;
export const DEFAULT_CATASTRO_CENTER: MapCenter = { latitude: 37.74, longitude: -3.52 };
const MAX_MERCATOR_LATITUDE = 85.05112878;
const PNOA_WMTS_URL = 'https://www.ign.es/wmts/pnoa-ma';

function clampMercatorLatitude(latitude: number): number {
  return Math.max(-MAX_MERCATOR_LATITUDE, Math.min(MAX_MERCATOR_LATITUDE, latitude));
}

function worldSize(zoom: number): number {
  return TILE_SIZE * 2 ** zoom;
}

export function latLonToWorldPixel(latitude: number, longitude: number, zoom: number) {
  const size = worldSize(zoom);
  const lat = clampMercatorLatitude(latitude) * Math.PI / 180;
  const x = ((longitude + 180) / 360) * size;
  const y = (0.5 - Math.log((1 + Math.sin(lat)) / (1 - Math.sin(lat))) / (4 * Math.PI)) * size;
  return { x, y };
}

export function worldPixelToLatLon(x: number, y: number, zoom: number): MapCenter {
  const size = worldSize(zoom);
  const longitude = x / size * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y / size;
  const latitude = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { latitude, longitude };
}

export function pnoaTileUrl(zoom: number, tileX: number, tileY: number): string {
  const params = new URLSearchParams({
    SERVICE: 'WMTS',
    REQUEST: 'GetTile',
    VERSION: '1.0.0',
    LAYER: 'OI.OrthoimageCoverage',
    STYLE: 'default',
    FORMAT: 'image/jpeg',
    TILEMATRIXSET: 'GoogleMapsCompatible',
    TILEMATRIX: String(zoom),
    TILECOL: String(tileX),
    TILEROW: String(tileY),
  });
  return `${PNOA_WMTS_URL}?${params.toString()}`;
}

function tileUrl(layer: BaseMapLayer, zoom: number, tileX: number, tileY: number): string {
  if (layer === 'pnoa') return pnoaTileUrl(zoom, tileX, tileY);
  return `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
}

export function buildCatastroSelectorMap(center: MapCenter, zoom: number, baseLayer: BaseMapLayer = 'map') {
  const centerPixel = latLonToWorldPixel(center.latitude, center.longitude, zoom);
  const topLeft = {
    x: centerPixel.x - MAP_VIEW_SIZE / 2,
    y: centerPixel.y - MAP_VIEW_SIZE / 2,
  };
  const startTileX = Math.floor(topLeft.x / TILE_SIZE);
  const endTileX = Math.floor((topLeft.x + MAP_VIEW_SIZE) / TILE_SIZE);
  const startTileY = Math.floor(topLeft.y / TILE_SIZE);
  const endTileY = Math.floor((topLeft.y + MAP_VIEW_SIZE) / TILE_SIZE);
  const tileCount = 2 ** zoom;
  const tiles: Tile[] = [];

  for (let tileY = startTileY; tileY <= endTileY; tileY += 1) {
    if (tileY < 0 || tileY >= tileCount) continue;
    for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
      const wrappedX = ((tileX % tileCount) + tileCount) % tileCount;
      tiles.push({
        key: `${baseLayer}-${zoom}-${tileX}-${tileY}`,
        href: tileUrl(baseLayer, zoom, wrappedX, tileY),
        x: tileX * TILE_SIZE - topLeft.x,
        y: tileY * TILE_SIZE - topLeft.y,
      });
    }
  }

  return { centerPixel, topLeft, tiles };
}

export function viewportBbox(center: MapCenter, zoom: number): Bbox {
  const model = buildCatastroSelectorMap(center, zoom);
  const topLeft = worldPixelToLatLon(model.topLeft.x, model.topLeft.y, zoom);
  const bottomRight = worldPixelToLatLon(
    model.topLeft.x + MAP_VIEW_SIZE,
    model.topLeft.y + MAP_VIEW_SIZE,
    zoom,
  );
  return {
    minLon: Math.min(topLeft.longitude, bottomRight.longitude),
    minLat: Math.min(topLeft.latitude, bottomRight.latitude),
    maxLon: Math.max(topLeft.longitude, bottomRight.longitude),
    maxLat: Math.max(topLeft.latitude, bottomRight.latitude),
  };
}

export function screenPoint(position: Position, zoom: number, topLeft: { x: number; y: number }) {
  const [longitude, latitude] = position;
  const world = latLonToWorldPixel(latitude, longitude, zoom);
  return { x: world.x - topLeft.x, y: world.y - topLeft.y };
}

function collectPositions(value: unknown, output: Position[] = []): Position[] {
  if (!Array.isArray(value)) return output;
  if (value.length === 2 && value.every((item) => typeof item === 'number' && Number.isFinite(item))) {
    output.push([value[0] as number, value[1] as number]);
    return output;
  }
  for (const child of value) collectPositions(child, output);
  return output;
}

export function exteriorRings(geometry: CatastroGeometry): Position[][] {
  if (geometry.type === 'Polygon') {
    const coordinates = geometry.coordinates as number[][][];
    return coordinates[0] ? [collectPositions(coordinates[0])] : [];
  }
  const coordinates = geometry.coordinates as number[][][][];
  return coordinates.flatMap((polygon) => polygon[0] ? [collectPositions(polygon[0])] : []);
}

export function geometryCenter(geometry: CatastroGeometry): MapCenter | null {
  const positions = exteriorRings(geometry).flat();
  if (!positions.length) return null;
  const totals = positions.reduce(
    (accumulator, [longitude, latitude]) => ({
      latitude: accumulator.latitude + latitude,
      longitude: accumulator.longitude + longitude,
    }),
    { latitude: 0, longitude: 0 },
  );
  return {
    latitude: totals.latitude / positions.length,
    longitude: totals.longitude / positions.length,
  };
}

export function isSimpleImportablePolygon(geometry: CatastroGeometry): boolean {
  if (geometry.type !== 'Polygon') return false;
  const coordinates = geometry.coordinates as number[][][];
  if (coordinates.length !== 1 || !coordinates[0] || coordinates[0].length < 4) return false;
  const first = coordinates[0][0];
  const last = coordinates[0][coordinates[0].length - 1];
  return Boolean(first && last && first[0] === last[0] && first[1] === last[1]);
}

export function panCenter(center: MapCenter, zoom: number, deltaX: number, deltaY: number): MapCenter {
  const pixel = latLonToWorldPixel(center.latitude, center.longitude, zoom);
  return worldPixelToLatLon(pixel.x - deltaX, pixel.y - deltaY, zoom);
}
