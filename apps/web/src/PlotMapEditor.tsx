import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import './plot-map.css';

type BoundarySource = 'manual_map' | 'manual_gps' | 'imported' | 'sigpac' | 'catastro';
type Position = [number, number];
type GeoJsonPolygon = { type: 'Polygon'; coordinates: number[][][] };
type LocatedPlot = {
  id: string;
  name: string;
  areaHa: string | null;
  sigpacReference: string | null;
  latitude: number | null;
  longitude: number | null;
  boundaryGeoJson: GeoJsonPolygon | null;
  boundaryAreaHa: string | null;
  boundarySource: BoundarySource | null;
  boundaryUpdatedAt: string | null;
  irrigationType: string | null;
  oliveTreeCount: number | null;
  notes: string | null;
};

type ApiErrorBody = { error?: { message?: string } };
type EditorMode = 'location' | 'boundary';
type MapCenter = { latitude: number; longitude: number };

type Tile = {
  key: string;
  href: string;
  x: number;
  y: number;
};

const TILE_SIZE = 256;
const MAP_VIEW_SIZE = 768;
const DEFAULT_CENTER: MapCenter = { latitude: 37.74, longitude: -3.52 };
const MAX_MERCATOR_LATITUDE = 85.05112878;

async function apiRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body) headers.set('content-type', 'application/json');

  const response = await fetch(url, { ...init, headers, credentials: 'include' });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json() as ApiErrorBody;
      message = body.error?.message ?? message;
    } catch {
      // Keep the HTTP fallback for non-JSON errors.
    }
    throw new Error(message);
  }
  return await response.json() as T;
}

function externalMapUrl(latitude: number, longitude: number): string {
  return `https://www.openstreetmap.org/?mlat=${latitude.toFixed(6)}&mlon=${longitude.toFixed(6)}#map=17/${latitude.toFixed(6)}/${longitude.toFixed(6)}`;
}

function normalizeCoordinate(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function validCoordinate(latitude: number | null, longitude: number | null): latitude is number {
  return latitude != null && longitude != null
    && latitude >= -90 && latitude <= 90
    && longitude >= -180 && longitude <= 180;
}

function clampMercatorLatitude(latitude: number): number {
  return Math.max(-MAX_MERCATOR_LATITUDE, Math.min(MAX_MERCATOR_LATITUDE, latitude));
}

function worldSize(zoom: number): number {
  return TILE_SIZE * 2 ** zoom;
}

function latLonToWorldPixel(latitude: number, longitude: number, zoom: number) {
  const size = worldSize(zoom);
  const lat = clampMercatorLatitude(latitude) * Math.PI / 180;
  const x = ((longitude + 180) / 360) * size;
  const y = (0.5 - Math.log((1 + Math.sin(lat)) / (1 - Math.sin(lat))) / (4 * Math.PI)) * size;
  return { x, y };
}

function worldPixelToLatLon(x: number, y: number, zoom: number): MapCenter {
  const size = worldSize(zoom);
  const longitude = x / size * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y / size;
  const latitude = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { latitude, longitude };
}

function buildMapModel(center: MapCenter, zoom: number) {
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
        key: `${zoom}-${tileX}-${tileY}`,
        href: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${tileY}.png`,
        x: tileX * TILE_SIZE - topLeft.x,
        y: tileY * TILE_SIZE - topLeft.y,
      });
    }
  }

  return { topLeft, tiles };
}

function screenPoint(position: Position, zoom: number, topLeft: { x: number; y: number }) {
  const [longitude, latitude] = position;
  const world = latLonToWorldPixel(latitude, longitude, zoom);
  return { x: world.x - topLeft.x, y: world.y - topLeft.y };
}

function degreesToRadians(value: number): number {
  return value * Math.PI / 180;
}

function normalizedLongitudeDelta(from: number, to: number): number {
  let delta = degreesToRadians(to - from);
  if (delta > Math.PI) delta -= 2 * Math.PI;
  if (delta < -Math.PI) delta += 2 * Math.PI;
  return delta;
}

function polygonAreaSquareMeters(vertices: Position[]): number {
  if (vertices.length < 3) return 0;
  const ring = [...vertices, vertices[0]!];
  const earthRadiusM = 6_378_137;
  let sum = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const current = ring[index]!;
    const next = ring[index + 1]!;
    const deltaLon = normalizedLongitudeDelta(current[0], next[0]);
    sum += deltaLon * (2 + Math.sin(degreesToRadians(current[1])) + Math.sin(degreesToRadians(next[1])));
  }
  return Math.abs(sum) * earthRadiusM * earthRadiusM / 2;
}

function polygonFromVertices(vertices: Position[]): GeoJsonPolygon {
  const first = vertices[0]!;
  return {
    type: 'Polygon',
    coordinates: [[...vertices.map(([longitude, latitude]) => [longitude, latitude]), [first[0], first[1]]]],
  };
}

function verticesFromBoundary(boundary: GeoJsonPolygon | null): Position[] {
  const ring = boundary?.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 4) return [];
  return ring.slice(0, -1).flatMap((position) => {
    if (!Array.isArray(position) || position.length < 2) return [];
    const longitude = Number(position[0]);
    const latitude = Number(position[1]);
    return Number.isFinite(longitude) && Number.isFinite(latitude) ? [[longitude, latitude] as Position] : [];
  });
}

function centerFromVertices(vertices: Position[]): MapCenter | null {
  if (!vertices.length) return null;
  const totals = vertices.reduce(
    (accumulator, [longitude, latitude]) => ({
      latitude: accumulator.latitude + latitude,
      longitude: accumulator.longitude + longitude,
    }),
    { latitude: 0, longitude: 0 },
  );
  return {
    latitude: totals.latitude / vertices.length,
    longitude: totals.longitude / vertices.length,
  };
}

function boundarySourceLabel(source: BoundarySource | null): string {
  if (source === 'manual_gps') return 'GPS';
  if (source === 'manual_map') return 'Mapa';
  if (source === 'sigpac') return 'SIGPAC';
  if (source === 'catastro') return 'Catastro';
  if (source === 'imported') return 'Importado';
  return 'Sin perímetro';
}

function isOfficialBoundarySource(source: BoundarySource | null): source is 'sigpac' | 'catastro' {
  return source === 'sigpac' || source === 'catastro';
}

function formatArea(areaSquareMeters: number): string {
  if (!Number.isFinite(areaSquareMeters) || areaSquareMeters <= 0) return '—';
  const hectares = areaSquareMeters / 10_000;
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4 }).format(hectares)} ha · ${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(areaSquareMeters)} m²`;
}

function requestDeviceLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('GEOLOCATION_UNAVAILABLE'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 10_000,
    });
  });
}

function geolocationPermissionDenied(reason: unknown): boolean {
  if (typeof reason !== 'object' || reason === null || !('code' in reason)) return false;
  return Number((reason as { code?: unknown }).code) === 1;
}

export function PlotMapPanel({ farmId }: { farmId: string }) {
  const [plots, setPlots] = useState<LocatedPlot[]>([]);
  const [selectedPlotId, setSelectedPlotId] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [editorMode, setEditorMode] = useState<EditorMode>('location');
  const [boundaryVertices, setBoundaryVertices] = useState<Position[]>([]);
  const [boundaryDraftSource, setBoundaryDraftSource] = useState<BoundarySource>('manual_map');
  const [mapCenter, setMapCenter] = useState<MapCenter>(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(17);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedPlot = useMemo(
    () => plots.find((plot) => plot.id === selectedPlotId) ?? null,
    [plots, selectedPlotId],
  );

  const locatedCount = useMemo(
    () => plots.filter((plot) => plot.latitude != null && plot.longitude != null).length,
    [plots],
  );

  const boundedCount = useMemo(
    () => plots.filter((plot) => plot.boundaryGeoJson != null).length,
    [plots],
  );

  const draftLatitude = normalizeCoordinate(latitude);
  const draftLongitude = normalizeCoordinate(longitude);
  const canPreviewPoint = validCoordinate(draftLatitude, draftLongitude);
  const boundaryAreaPreviewM2 = useMemo(() => polygonAreaSquareMeters(boundaryVertices), [boundaryVertices]);
  const mapModel = useMemo(() => buildMapModel(mapCenter, zoom), [mapCenter, zoom]);
  const mapBoundaryPoints = useMemo(
    () => boundaryVertices.map((position) => screenPoint(position, zoom, mapModel.topLeft)),
    [boundaryVertices, zoom, mapModel.topLeft],
  );
  const mapPoint = canPreviewPoint
    ? screenPoint([draftLongitude!, draftLatitude!], zoom, mapModel.topLeft)
    : null;

  async function loadPlots() {
    if (!farmId) {
      setPlots([]);
      setSelectedPlotId('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<{ items: LocatedPlot[] }>(`/api/v1/farms/${farmId}/plots`);
      setPlots(result.items);
      setSelectedPlotId((current) => result.items.some((plot) => plot.id === current) ? current : (result.items[0]?.id ?? ''));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se han podido cargar las parcelas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlots();
  }, [farmId]);

  useEffect(() => {
    setLatitude(selectedPlot?.latitude == null ? '' : String(selectedPlot.latitude));
    setLongitude(selectedPlot?.longitude == null ? '' : String(selectedPlot.longitude));
    const savedVertices = verticesFromBoundary(selectedPlot?.boundaryGeoJson ?? null);
    setBoundaryVertices(savedVertices);
    setBoundaryDraftSource(
      selectedPlot?.boundarySource === 'manual_gps' ? 'manual_gps' : (selectedPlot?.boundarySource ?? 'manual_map'),
    );
    const boundaryCenter = centerFromVertices(savedVertices);
    if (boundaryCenter) {
      setMapCenter(boundaryCenter);
    } else if (selectedPlot?.latitude != null && selectedPlot.longitude != null) {
      setMapCenter({ latitude: selectedPlot.latitude, longitude: selectedPlot.longitude });
    } else {
      setMapCenter(DEFAULT_CENTER);
    }
    setNotice(null);
    setError(null);
  }, [selectedPlotId, selectedPlot?.latitude, selectedPlot?.longitude, selectedPlot?.boundaryGeoJson, selectedPlot?.boundarySource]);

  function replacePlot(updated: LocatedPlot) {
    setPlots((current) => current.map((plot) => plot.id === updated.id ? updated : plot));
  }

  async function useDeviceLocation() {
    setError(null);
    setNotice(null);
    setLocating(true);
    try {
      const position = await requestDeviceLocation();
      const latitudeValue = position.coords.latitude;
      const longitudeValue = position.coords.longitude;
      setLatitude(latitudeValue.toFixed(7));
      setLongitude(longitudeValue.toFixed(7));
      setMapCenter({ latitude: latitudeValue, longitude: longitudeValue });
      setNotice(`Ubicación obtenida con una precisión aproximada de ${Math.round(position.coords.accuracy)} m. Revisa el punto y pulsa Guardar ubicación.`);
    } catch (reason) {
      const denied = geolocationPermissionDenied(reason);
      setError(denied
        ? 'No se ha concedido permiso de ubicación. Puedes introducir las coordenadas manualmente.'
        : 'No se ha podido obtener una ubicación fiable. Inténtalo de nuevo al aire libre o introduce las coordenadas.');
    } finally {
      setLocating(false);
    }
  }

  async function addDeviceBoundaryVertex() {
    setError(null);
    setNotice(null);
    if (boundaryVertices.length >= 500) {
      setError('El perímetro ya ha alcanzado el máximo de 500 vértices.');
      return;
    }
    setLocating(true);
    try {
      const position = await requestDeviceLocation();
      const next: Position = [position.coords.longitude, position.coords.latitude];
      setBoundaryVertices((current) => [...current, next]);
      setBoundaryDraftSource((current) => current === 'manual_map' && boundaryVertices.length > 0 ? 'manual_map' : 'manual_gps');
      setMapCenter({ latitude: next[1], longitude: next[0] });
      setNotice(`Vértice ${boundaryVertices.length + 1} añadido por GPS · precisión aproximada ${Math.round(position.coords.accuracy)} m.`);
    } catch (reason) {
      const denied = geolocationPermissionDenied(reason);
      setError(denied
        ? 'No se ha concedido permiso de ubicación. Puedes marcar el vértice tocando el mapa.'
        : 'No se ha podido obtener el vértice por GPS. Prueba al aire libre o marca el punto sobre el mapa.');
    } finally {
      setLocating(false);
    }
  }

  async function saveLocation() {
    if (!selectedPlot) return;
    const lat = normalizeCoordinate(latitude);
    const lon = normalizeCoordinate(longitude);
    if (lat == null || lon == null) {
      setError('Escribe una latitud y una longitud válidas.');
      return;
    }
    if (!validCoordinate(lat, lon)) {
      setError('Las coordenadas están fuera del rango válido.');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await apiRequest<LocatedPlot>(`/api/v1/plots/${selectedPlot.id}/location`, {
        method: 'PATCH',
        body: JSON.stringify({ latitude: lat, longitude: lon }),
      });
      replacePlot(updated);
      setLatitude(String(updated.latitude ?? ''));
      setLongitude(String(updated.longitude ?? ''));
      setMapCenter({ latitude: lat, longitude: lon });
      setNotice('Ubicación guardada en la parcela.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido guardar la ubicación.');
    } finally {
      setSaving(false);
    }
  }

  async function clearLocation() {
    if (!selectedPlot) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await apiRequest<LocatedPlot>(`/api/v1/plots/${selectedPlot.id}/location`, {
        method: 'PATCH',
        body: JSON.stringify({ latitude: null, longitude: null }),
      });
      replacePlot(updated);
      setLatitude('');
      setLongitude('');
      setNotice('Ubicación eliminada. La parcela, su perímetro y su historial se conservan.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido eliminar la ubicación.');
    } finally {
      setSaving(false);
    }
  }

  async function saveBoundary() {
    if (!selectedPlot) return;
    if (boundaryVertices.length < 3) {
      setError('Marca al menos tres vértices distintos antes de guardar el perímetro.');
      return;
    }
    if (isOfficialBoundarySource(boundaryDraftSource)) {
      setError(null);
      setNotice('El perímetro oficial ya está guardado. Para modificarlo, edita sus vértices; al guardar pasará a ser un perímetro manual.');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await apiRequest<LocatedPlot>(`/api/v1/plots/${selectedPlot.id}/boundary`, {
        method: 'PATCH',
        body: JSON.stringify({ boundary: polygonFromVertices(boundaryVertices), source: boundaryDraftSource }),
      });
      replacePlot(updated);
      setBoundaryVertices(verticesFromBoundary(updated.boundaryGeoJson));
      setBoundaryDraftSource(updated.boundarySource ?? 'manual_map');
      setNotice(`Perímetro guardado · ${updated.boundaryAreaHa ?? '—'} ha calculadas por el servidor.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido guardar el perímetro.');
    } finally {
      setSaving(false);
    }
  }

  async function clearBoundary() {
    if (!selectedPlot) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await apiRequest<LocatedPlot>(`/api/v1/plots/${selectedPlot.id}/boundary`, {
        method: 'PATCH',
        body: JSON.stringify({ boundary: null, source: null }),
      });
      replacePlot(updated);
      setBoundaryVertices([]);
      setBoundaryDraftSource('manual_map');
      setNotice('Perímetro eliminado. La parcela, su punto y todo el historial se conservan.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido eliminar el perímetro.');
    } finally {
      setSaving(false);
    }
  }

  function undoBoundaryVertex() {
    setBoundaryVertices((current) => current.slice(0, -1));
    setBoundaryDraftSource((current) => isOfficialBoundarySource(current) ? 'manual_map' : current);
    setError(null);
    setNotice(null);
  }

  function handleMapClick(event: MouseEvent<SVGSVGElement>) {
    if (saving) return;
    const rectangle = event.currentTarget.getBoundingClientRect();
    const viewX = (event.clientX - rectangle.left) / rectangle.width * MAP_VIEW_SIZE;
    const viewY = (event.clientY - rectangle.top) / rectangle.height * MAP_VIEW_SIZE;
    const coordinate = worldPixelToLatLon(mapModel.topLeft.x + viewX, mapModel.topLeft.y + viewY, zoom);

    setError(null);
    setNotice(null);
    if (editorMode === 'location') {
      setLatitude(coordinate.latitude.toFixed(7));
      setLongitude(coordinate.longitude.toFixed(7));
      setNotice('Punto provisional movido. Pulsa Guardar ubicación para conservarlo.');
      return;
    }

    if (boundaryVertices.length >= 500) {
      setError('El perímetro ya ha alcanzado el máximo de 500 vértices.');
      return;
    }
    setBoundaryVertices((current) => [...current, [coordinate.longitude, coordinate.latitude]]);
    setBoundaryDraftSource('manual_map');
  }

  function recenterMap() {
    const boundaryCenter = centerFromVertices(boundaryVertices);
    if (editorMode === 'boundary' && boundaryCenter) {
      setMapCenter(boundaryCenter);
      return;
    }
    if (canPreviewPoint) {
      setMapCenter({ latitude: draftLatitude!, longitude: draftLongitude! });
      return;
    }
    setMapCenter(DEFAULT_CENTER);
  }

  const polygonPoints = mapBoundaryPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const mapStatus = editorMode === 'boundary'
    ? `${boundaryVertices.length} vértices · ${formatArea(boundaryAreaPreviewM2)}`
    : canPreviewPoint ? `${draftLatitude!.toFixed(6)}, ${draftLongitude!.toFixed(6)}` : 'Toca el mapa para situar el punto';

  return (
    <section className="section plot-map-shell" aria-labelledby="plot-map-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow page-eyebrow">Geolocalización</p>
          <h2 id="plot-map-title" className="section-title">Mapa de Parcelas</h2>
          <p className="section-copy">Sitúa el punto de trabajo y dibuja el perímetro real de cada parcela.</p>
        </div>
        <div className="plot-map-counts" aria-label="Cobertura cartográfica">
          <span className="badge gold">{locatedCount}/{plots.length} puntos</span>
          <span className="badge">{boundedCount}/{plots.length} perímetros</span>
        </div>
      </div>

      {loading ? <div className="card empty-state" role="status">Cargando parcelas…</div> : null}
      {!loading && !plots.length ? <div className="card empty-state"><strong>Sin parcelas</strong>Añade una parcela para poder situarla y delimitarla.</div> : null}

      {!loading && selectedPlot ? (
        <>
          <div className="plot-map-mode-tabs" role="group" aria-label="Modo del mapa">
            <button type="button" className={editorMode === 'location' ? 'active' : ''} aria-pressed={editorMode === 'location'} onClick={() => setEditorMode('location')}>Punto</button>
            <button type="button" className={editorMode === 'boundary' ? 'active' : ''} aria-pressed={editorMode === 'boundary'} onClick={() => setEditorMode('boundary')}>Perímetro</button>
          </div>

          <div className="plot-map-grid">
            <div className="card card-body plot-location-card">
              <div className="field">
                <label htmlFor="map-plot-select">Parcela</label>
                <select id="map-plot-select" value={selectedPlotId} onChange={(event) => setSelectedPlotId(event.target.value)}>
                  {plots.map((plot) => (
                    <option key={plot.id} value={plot.id}>{plot.name}{plot.boundaryGeoJson ? ' · perímetro' : plot.latitude != null && plot.longitude != null ? ' · localizada' : ' · pendiente'}</option>
                  ))}
                </select>
              </div>

              <div className="plot-map-meta" aria-label="Datos de la parcela seleccionada">
                <span>{selectedPlot.areaHa ? `${selectedPlot.areaHa} ha declaradas` : 'Superficie declarada pendiente'}</span>
                <span>{selectedPlot.boundaryAreaHa ? `${selectedPlot.boundaryAreaHa} ha geométricas` : 'Sin superficie geométrica'}</span>
                <span>{selectedPlot.oliveTreeCount ?? '—'} olivos</span>
                <span>{boundarySourceLabel(selectedPlot.boundarySource)}</span>
              </div>

              {editorMode === 'location' ? (
                <>
                  <p className="plot-editor-help">Usa el GPS, escribe coordenadas o toca directamente el mapa.</p>
                  <div className="inline-fields plot-coordinate-fields">
                    <div className="field">
                      <label htmlFor="plot-latitude">Latitud</label>
                      <input id="plot-latitude" inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="37.7…" />
                    </div>
                    <div className="field">
                      <label htmlFor="plot-longitude">Longitud</label>
                      <input id="plot-longitude" inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="-3.5…" />
                    </div>
                  </div>

                  <div className="plot-map-actions">
                    <button className="ghost-button" type="button" onClick={() => void useDeviceLocation()} disabled={locating || saving}>{locating ? 'Buscando GPS…' : 'Usar mi ubicación'}</button>
                    <button className="primary-button" type="button" onClick={() => void saveLocation()} disabled={!canPreviewPoint || saving}>{saving ? 'Guardando…' : 'Guardar ubicación'}</button>
                  </div>

                  {selectedPlot.latitude != null && selectedPlot.longitude != null ? (
                    <button className="text-button plot-clear-location" type="button" onClick={() => void clearLocation()} disabled={saving}>Quitar ubicación guardada</button>
                  ) : null}
                </>
              ) : (
                <>
                  <div className="plot-boundary-summary" aria-live="polite">
                    <strong>{boundaryVertices.length} vértices</strong>
                    <span>{formatArea(boundaryAreaPreviewM2)}</span>
                    <small>La superficie definitiva se recalcula en el servidor al guardar.</small>
                  </div>
                  <p className="plot-editor-help">Toca el mapa sobre cada esquina/linde. Si estás recorriendo la finca, pulsa “Añadir mi posición” en cada cambio de dirección.</p>
                  <div className="plot-map-actions">
                    <button className="ghost-button" type="button" onClick={() => void addDeviceBoundaryVertex()} disabled={locating || saving || boundaryVertices.length >= 500}>{locating ? 'Leyendo GPS…' : 'Añadir mi posición'}</button>
                    <button className="ghost-button" type="button" onClick={undoBoundaryVertex} disabled={!boundaryVertices.length || saving}>Deshacer vértice</button>
                  </div>
                  <div className="plot-map-actions">
                    <button className="ghost-button" type="button" onClick={() => { setBoundaryVertices([]); setBoundaryDraftSource('manual_map'); }} disabled={!boundaryVertices.length || saving}>Limpiar borrador</button>
                    <button className="primary-button" type="button" onClick={() => void saveBoundary()} disabled={boundaryVertices.length < 3 || saving}>{saving ? 'Guardando…' : 'Guardar perímetro'}</button>
                  </div>
                  {selectedPlot.boundaryGeoJson ? (
                    <button className="text-button plot-clear-location" type="button" onClick={() => void clearBoundary()} disabled={saving}>Eliminar perímetro guardado</button>
                  ) : null}
                </>
              )}

              {error ? <div className="alert" role="alert">{error}</div> : null}
              {notice ? <div className="alert success" role="status">{notice}</div> : null}
            </div>

            <div className="card plot-map-card">
              <div className="plot-map-toolbar" aria-label="Controles del mapa">
                <button type="button" onClick={() => setZoom((value) => Math.min(20, value + 1))} disabled={zoom >= 20} aria-label="Acercar mapa">+</button>
                <button type="button" onClick={() => setZoom((value) => Math.max(14, value - 1))} disabled={zoom <= 14} aria-label="Alejar mapa">−</button>
                <button type="button" onClick={recenterMap}>Centrar</button>
                <span>z{zoom}</span>
              </div>
              <svg
                className={`plot-map-editor ${editorMode === 'boundary' ? 'boundary-mode' : 'location-mode'}`}
                viewBox={`0 0 ${MAP_VIEW_SIZE} ${MAP_VIEW_SIZE}`}
                role="img"
                aria-label={editorMode === 'boundary' ? `Editor de perímetro de ${selectedPlot.name}` : `Mapa de ubicación de ${selectedPlot.name}`}
                onClick={handleMapClick}
              >
                {mapModel.tiles.map((tile) => (
                  <image key={tile.key} href={tile.href} x={tile.x} y={tile.y} width={TILE_SIZE} height={TILE_SIZE} />
                ))}
                {mapBoundaryPoints.length >= 3 ? <polygon className="plot-boundary-shape" points={polygonPoints} /> : null}
                {mapBoundaryPoints.length === 2 ? <polyline className="plot-boundary-line" points={polygonPoints} /> : null}
                {mapBoundaryPoints.map((point, index) => (
                  <g className="plot-boundary-vertex" key={`${boundaryVertices[index]?.[0]}-${boundaryVertices[index]?.[1]}-${index}`}>
                    <circle cx={point.x} cy={point.y} r="8" />
                    <text x={point.x + 11} y={point.y - 11}>{index + 1}</text>
                  </g>
                ))}
                {mapPoint ? (
                  <g className="plot-location-marker">
                    <circle className="plot-location-marker-ring" cx={mapPoint.x} cy={mapPoint.y} r="19" />
                    <circle cx={mapPoint.x} cy={mapPoint.y} r="8" />
                  </g>
                ) : null}
              </svg>
              <div className="plot-map-footer">
                <div>
                  <strong>{selectedPlot.name}</strong>
                  <small>{mapStatus}</small>
                  <small>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></small>
                </div>
                <a className="text-button" href={externalMapUrl(mapCenter.latitude, mapCenter.longitude)} target="_blank" rel="noreferrer">Abrir OSM ↗</a>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <p className="plot-map-disclaimer">El perímetro es una geometría privada de trabajo. La superficie calculada no sustituye por sí sola la superficie administrativa. SIGPAC y Catastro se consultan e importan como fuentes oficiales separadas y verificables. Si editas manualmente un perímetro oficial, la procedencia oficial se elimina al guardar.</p>
    </section>
  );
}