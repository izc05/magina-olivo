import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import './catastro-panel.css';

type Position = [number, number];
type GeoJsonBoundary = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
};
type CatastroGeometry = GeoJsonBoundary;
type PlotSummary = {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  cadastralReference: string | null;
  boundaryGeoJson: GeoJsonBoundary | null;
  boundaryAreaHa: string | null;
  boundarySource?: string | null;
};
type CatastroParcel = {
  id: string;
  nationalCadastralReference: string;
  label: string | null;
  areaM2: number | null;
  beginLifespanVersion: string | null;
  geometry: CatastroGeometry;
};
type CatastroSource = {
  provider: string;
  dataset: string;
  service: string;
  status: string;
  checkedAt: string;
};
type CatastroIdentifyResponse = {
  items: CatastroParcel[];
  match: 'exact' | 'nearby' | 'none';
  query: {
    latitude: number;
    longitude: number;
    nearby: boolean;
  };
  source: CatastroSource;
};
type CatastroReferenceResponse = { item: CatastroParcel; source: CatastroSource };
type ApiErrorBody = { error?: { message?: string } };
type SelectionMode = 'manual' | 'gps' | 'reference';
type MapCenter = { latitude: number; longitude: number };
type Tile = { key: string; href: string; x: number; y: number };

const TILE_SIZE = 256;
const MAP_VIEW_SIZE = 768;
const DEFAULT_CENTER: MapCenter = { latitude: 37.74, longitude: -3.52 };
const MAX_MERCATOR_LATITUDE = 85.05112878;

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
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
      // Keep HTTP fallback for non-JSON responses.
    }
    throw new Error(message);
  }
  return await response.json() as T;
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

function geometryRings(geometry: CatastroGeometry): Position[][] {
  if (geometry.type === 'Polygon') {
    return (geometry.coordinates as number[][][]).map((ring) => collectPositions(ring));
  }
  return (geometry.coordinates as number[][][][]).flatMap((polygon) => polygon.map((ring) => collectPositions(ring)));
}

function centerFromGeometry(geometry: CatastroGeometry): MapCenter | null {
  const positions = collectPositions(geometry.coordinates);
  if (!positions.length) return null;
  const totals = positions.reduce(
    (accumulator, [longitude, latitude]) => ({
      latitude: accumulator.latitude + latitude,
      longitude: accumulator.longitude + longitude,
    }),
    { latitude: 0, longitude: 0 },
  );
  return { latitude: totals.latitude / positions.length, longitude: totals.longitude / positions.length };
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

function centerFromPlot(plot: PlotSummary | null): MapCenter | null {
  if (!plot) return null;
  const positions = collectPositions(plot.boundaryGeoJson?.coordinates ?? []);
  if (positions.length) {
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
  if (plot.latitude != null && plot.longitude != null) {
    return { latitude: plot.latitude, longitude: plot.longitude };
  }
  return null;
}

function formatSurface(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(value)} m² · ${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4 }).format(value / 10_000)} ha`;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(date);
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
      maximumAge: 5_000,
    });
  });
}

function geolocationPermissionDenied(reason: unknown): boolean {
  if (typeof reason !== 'object' || reason === null || !('code' in reason)) return false;
  return Number((reason as { code?: unknown }).code) === 1;
}

export function CatastroParcelPanel({ farmId, onImported }: { farmId: string; onImported: () => Promise<void> }) {
  const [plots, setPlots] = useState<PlotSummary[]>([]);
  const [plotId, setPlotId] = useState('');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('manual');
  const [referenceQuery, setReferenceQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<MapCenter>(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(17);
  const [probe, setProbe] = useState<MapCenter | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [items, setItems] = useState<CatastroParcel[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [match, setMatch] = useState<CatastroIdentifyResponse['match']>('none');
  const [source, setSource] = useState<CatastroSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmImportId, setConfirmImportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedPlot = useMemo(() => plots.find((plot) => plot.id === plotId) ?? null, [plots, plotId]);
  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? items[0] ?? null, [items, selectedId]);
  const mapModel = useMemo(() => buildMapModel(mapCenter, zoom), [mapCenter, zoom]);
  const selectedRings = useMemo(() => selected ? geometryRings(selected.geometry) : [], [selected]);
  const mapSelectedRings = useMemo(
    () => selectedRings.map((ring) => ring.map((position) => screenPoint(position, zoom, mapModel.topLeft))),
    [selectedRings, zoom, mapModel.topLeft],
  );
  const probePoint = probe ? screenPoint([probe.longitude, probe.latitude], zoom, mapModel.topLeft) : null;

  useEffect(() => {
    let cancelled = false;
    void request<{ items: PlotSummary[] }>(`/api/v1/farms/${farmId}/plots`).then((result) => {
      if (cancelled) return;
      setPlots(result.items);
      setPlotId((current) => result.items.some((plot) => plot.id === current) ? current : (result.items[0]?.id ?? ''));
    }).catch(() => {
      if (!cancelled) setPlots([]);
    });
    return () => { cancelled = true; };
  }, [farmId]);

  useEffect(() => {
    const center = centerFromPlot(selectedPlot);
    if (center) setMapCenter(center);
    setItems([]);
    setSelectedId('');
    setMatch('none');
    setSource(null);
    setProbe(null);
    setGpsAccuracy(null);
    setReferenceQuery(selectedPlot?.cadastralReference ?? '');
    setConfirmImportId(null);
    setNotice(null);
    setError(null);
  }, [plotId]);

  async function identifyPoint(latitude: number, longitude: number, nearby: boolean, origin: 'manual' | 'gps') {
    setLoading(true);
    setError(null);
    setNotice(null);
    setConfirmImportId(null);
    setProbe({ latitude, longitude });
    try {
      const params = new URLSearchParams({
        lat: String(latitude),
        lon: String(longitude),
        nearby: nearby ? '1' : '0',
      });
      const result = await request<CatastroIdentifyResponse>(`/api/v1/maps/catastro/identify?${params.toString()}`);
      setItems(result.items);
      setSelectedId(result.items[0]?.id ?? '');
      setMatch(result.match);
      setSource(result.source);
      if (!result.items.length) {
        setNotice(origin === 'gps'
          ? 'No se ha identificado una parcela en esta posición. Prueba de nuevo al aire libre o cambia a selección manual.'
          : 'No se ha identificado una parcela en ese punto. Toca dentro de la finca, evitando caminos y lindes.');
      } else if (result.match === 'nearby') {
        setNotice(`Catastro ha encontrado ${result.items.length} parcela${result.items.length === 1 ? '' : 's'} próxima${result.items.length === 1 ? '' : 's'} al punto. Revisa cuál es la tuya antes de confirmar.`);
      } else {
        setNotice('Parcela localizada en Catastro. Revisa el perímetro y confirma que es la tuya.');
      }
    } catch (reason) {
      setItems([]);
      setSelectedId('');
      setMatch('none');
      setError(reason instanceof Error ? reason.message : 'No se ha podido consultar Catastro.');
    } finally {
      setLoading(false);
    }
  }

  async function lookupReference() {
    const reference = referenceQuery.trim().toUpperCase();
    if (!/^[A-Z0-9]{14}$/.test(reference)) {
      setError('La referencia catastral debe contener exactamente 14 caracteres alfanuméricos.');
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    setProbe(null);
    setGpsAccuracy(null);
    setConfirmImportId(null);
    try {
      const result = await request<CatastroReferenceResponse>(`/api/v1/maps/catastro/reference/${encodeURIComponent(reference)}`);
      setReferenceQuery(reference);
      setItems([result.item]);
      setSelectedId(result.item.id);
      setMatch('exact');
      setSource(result.source);
      const center = centerFromGeometry(result.item.geometry);
      if (center) setMapCenter(center);
      setNotice('Referencia encontrada en Catastro. Revisa la geometría oficial antes de asociarla a tu parcela.');
    } catch (reason) {
      setItems([]);
      setSelectedId('');
      setMatch('none');
      setError(reason instanceof Error ? reason.message : 'No se ha podido consultar esa referencia catastral.');
    } finally {
      setLoading(false);
    }
  }

  async function useGps() {
    setLocating(true);
    setError(null);
    setNotice(null);
    try {
      const position = await requestDeviceLocation();
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      setGpsAccuracy(position.coords.accuracy);
      setMapCenter({ latitude, longitude });
      await identifyPoint(latitude, longitude, true, 'gps');
    } catch (reason) {
      setError(geolocationPermissionDenied(reason)
        ? 'No se ha concedido permiso de ubicación. Activa el permiso del navegador o usa la selección manual.'
        : 'No se ha podido obtener una posición GPS fiable. Inténtalo de nuevo al aire libre o usa la selección manual.');
    } finally {
      setLocating(false);
    }
  }

  function handleMapClick(event: MouseEvent<SVGSVGElement>) {
    if (selectionMode !== 'manual' || loading || importing) return;
    const rectangle = event.currentTarget.getBoundingClientRect();
    const viewX = (event.clientX - rectangle.left) / rectangle.width * MAP_VIEW_SIZE;
    const viewY = (event.clientY - rectangle.top) / rectangle.height * MAP_VIEW_SIZE;
    const coordinate = worldPixelToLatLon(mapModel.topLeft.x + viewX, mapModel.topLeft.y + viewY, zoom);
    void identifyPoint(coordinate.latitude, coordinate.longitude, true, 'manual');
  }

  function recenterOnPlot() {
    const center = selected ? centerFromGeometry(selected.geometry) : centerFromPlot(selectedPlot);
    if (center) setMapCenter(center);
    else setMapCenter(DEFAULT_CENTER);
  }

  async function importSelected() {
    if (!selectedPlot || !selected) return;
    if (confirmImportId !== selected.id) {
      setConfirmImportId(selected.id);
      setNotice('Revisa la referencia y el perímetro. Pulsa “Esta es mi parcela” una segunda vez para que Mágina la verifique de nuevo directamente en Catastro antes de guardarla.');
      return;
    }

    setImporting(true);
    setError(null);
    setNotice(null);
    try {
      await request(`/api/v1/plots/${selectedPlot.id}/import-catastro`, {
        method: 'POST',
        body: JSON.stringify({ cadastralReference: selected.nationalCadastralReference }),
      });
      setConfirmImportId(null);
      setNotice(`Parcela ${selected.nationalCadastralReference} verificada y guardada. Catastro queda conservado además como fuente oficial para compararlo con SIGPAC.`);
      await onImported();
      const refreshed = await request<{ items: PlotSummary[] }>(`/api/v1/farms/${farmId}/plots`);
      setPlots(refreshed.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido verificar e importar la parcela catastral.');
    } finally {
      setImporting(false);
    }
  }

  if (!plots.length) return null;

  const matchLabel = selectionMode === 'reference'
    ? 'Referencia directa'
    : match === 'exact' ? 'Punto exacto' : match === 'nearby' ? 'Próxima al punto' : '—';

  return (
    <section className="section catastro-shell" aria-labelledby="catastro-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow page-eyebrow">Cartografía oficial</p>
          <h2 id="catastro-title" className="section-title">Añadir parcela desde Catastro</h2>
          <p className="section-copy">Toca el mapa, usa el GPS o introduce una referencia catastral que ya conozcas.</p>
        </div>
        <span className="badge gold">Oficial · DGC</span>
      </div>

      <div className="card card-body catastro-search-card">
        <div className="field">
          <label htmlFor="catastro-plot">Parcela de Mágina Olivo</label>
          <select id="catastro-plot" value={plotId} onChange={(event) => setPlotId(event.target.value)}>
            {plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name}</option>)}
          </select>
        </div>

        <div className="catastro-mode-tabs" role="group" aria-label="Método para localizar la parcela">
          <button type="button" className={selectionMode === 'manual' ? 'active' : ''} aria-pressed={selectionMode === 'manual'} onClick={() => setSelectionMode('manual')}>
            <span aria-hidden="true">☝</span><strong>Manual</strong><small>Toca tu finca</small>
          </button>
          <button type="button" className={selectionMode === 'gps' ? 'active' : ''} aria-pressed={selectionMode === 'gps'} onClick={() => setSelectionMode('gps')}>
            <span aria-hidden="true">⌖</span><strong>GPS</strong><small>Desde el campo</small>
          </button>
          <button type="button" className={selectionMode === 'reference' ? 'active' : ''} aria-pressed={selectionMode === 'reference'} onClick={() => setSelectionMode('reference')}>
            <span aria-hidden="true">#</span><strong>Referencia</strong><small>Si ya la conoces</small>
          </button>
        </div>

        <div className="catastro-selection-grid">
          <div className="catastro-map-card">
            <div className="catastro-map-toolbar" aria-label="Controles del mapa Catastro">
              <button type="button" onClick={() => setZoom((value) => Math.min(20, value + 1))} disabled={zoom >= 20} aria-label="Acercar mapa">+</button>
              <button type="button" onClick={() => setZoom((value) => Math.max(14, value - 1))} disabled={zoom <= 14} aria-label="Alejar mapa">−</button>
              <button type="button" onClick={recenterOnPlot}>Centrar</button>
              <span>z{zoom}</span>
            </div>
            <svg
              className={`catastro-map ${selectionMode}-mode`}
              viewBox={`0 0 ${MAP_VIEW_SIZE} ${MAP_VIEW_SIZE}`}
              role="img"
              aria-label="Mapa de selección y geometría catastral"
              onClick={handleMapClick}
            >
              {mapModel.tiles.map((tile) => (
                <image key={tile.key} href={tile.href} x={tile.x} y={tile.y} width={TILE_SIZE} height={TILE_SIZE} />
              ))}
              {mapSelectedRings.map((ring, index) => (
                <polygon key={index} className="catastro-selected-shape" points={ring.map((point) => `${point.x},${point.y}`).join(' ')} />
              ))}
              {probePoint ? (
                <g className="catastro-probe-marker">
                  {selectionMode === 'gps' ? <circle className="catastro-gps-halo" cx={probePoint.x} cy={probePoint.y} r="28" /> : null}
                  <circle className="catastro-probe-ring" cx={probePoint.x} cy={probePoint.y} r="17" />
                  <circle cx={probePoint.x} cy={probePoint.y} r="7" />
                </g>
              ) : null}
            </svg>
            <div className="catastro-map-caption">
              <strong>{selectionMode === 'manual' ? 'Selección manual' : selectionMode === 'gps' ? 'Selección por GPS' : 'Búsqueda por referencia'}</strong>
              <small>{selectionMode === 'manual'
                ? 'Acércate a la zona y toca dentro de tu parcela, evitando el camino o la linde.'
                : selectionMode === 'gps'
                  ? gpsAccuracy != null ? `Última precisión GPS aproximada: ±${Math.round(gpsAccuracy)} m` : 'Pulsa Localizar mi parcela para usar la ubicación del dispositivo.'
                  : selected ? 'La geometría de la referencia encontrada se muestra directamente sobre el mapa.' : 'Introduce la referencia catastral para cargar su geometría oficial.'}</small>
              <small>© OpenStreetMap contributors · Catastro: Dirección General del Catastro</small>
            </div>
          </div>

          <div className="catastro-method-card">
            {selectionMode === 'manual' ? (
              <>
                <span className="catastro-method-icon" aria-hidden="true">☝</span>
                <h3>Toca tu finca</h3>
                <p>Mueve y amplía el mapa. Al pulsar dentro del olivar, Mágina pregunta a Catastro qué parcela corresponde a ese punto.</p>
                <button className="ghost-button" type="button" onClick={recenterOnPlot}>Centrar en mi parcela</button>
              </>
            ) : selectionMode === 'gps' ? (
              <>
                <span className="catastro-method-icon" aria-hidden="true">⌖</span>
                <h3>Estoy en la parcela</h3>
                <p>El GPS localiza el punto y Catastro busca la parcela exacta o las más próximas si hay margen de error.</p>
                <button className="primary-button" type="button" onClick={() => void useGps()} disabled={locating || loading}>{locating ? 'Buscando GPS…' : 'Localizar mi parcela'}</button>
              </>
            ) : (
              <>
                <span className="catastro-method-icon" aria-hidden="true">#</span>
                <h3>Tengo la referencia catastral</h3>
                <p>Introduce los 14 caracteres de la referencia de parcela. La consulta se verifica directamente en el servicio INSPIRE de Catastro.</p>
                <div className="field catastro-reference-field">
                  <label htmlFor="catastro-reference-query">Referencia catastral</label>
                  <input id="catastro-reference-query" value={referenceQuery} onChange={(event) => setReferenceQuery(event.target.value.toUpperCase())} maxLength={14} autoCapitalize="characters" autoComplete="off" placeholder="XXXXXXXXXXXXXX" />
                </div>
                <button className="primary-button" type="button" onClick={() => void lookupReference()} disabled={loading || referenceQuery.trim().length !== 14}>{loading ? 'Consultando…' : 'Buscar referencia'}</button>
              </>
            )}

            <div className="catastro-plot-status">
              <span>{selectedPlot?.boundaryGeoJson ? 'Perímetro previo disponible' : selectedPlot?.latitude != null ? 'Punto previo disponible' : 'Sin localización previa'}</span>
              {selectedPlot?.cadastralReference ? <span>RC {selectedPlot.cadastralReference}</span> : null}
              {selectedPlot?.boundaryAreaHa ? <span>{selectedPlot.boundaryAreaHa} ha geométricas</span> : null}
            </div>
          </div>
        </div>

        {loading ? <div className="catastro-searching" role="status">Consultando Catastro…</div> : null}
        {error ? <div className="alert" role="alert">{error}</div> : null}
        {notice ? <div className="alert success" role="status">{notice}</div> : null}
        <p className="catastro-warning"><strong>Catastro y SIGPAC no son equivalentes.</strong> Mágina Olivo conserva ambas fuentes verificadas por separado para poder compararlas sin perder información.</p>
      </div>

      {items.length ? (
        <div className="catastro-results-grid">
          <div className="catastro-result-list" role="list" aria-label="Parcelas catastrales encontradas">
            {items.map((item) => (
              <button key={item.id} type="button" role="listitem" className={`card catastro-result${selected?.id === item.id ? ' active' : ''}`} onClick={() => { setSelectedId(item.id); setConfirmImportId(null); const center = centerFromGeometry(item.geometry); if (center) setMapCenter(center); }}>
                <strong>{item.nationalCadastralReference}</strong>
                <span>{formatSurface(item.areaM2)}</span>
                <small>{item.label ? `Parcela ${item.label}` : 'Parcela catastral'} · {selectionMode === 'reference' ? 'referencia consultada' : match === 'nearby' ? 'próxima al punto' : 'coincidencia en el punto'}</small>
              </button>
            ))}
          </div>

          {selected ? (
            <article className="card card-body catastro-detail">
              <div className="catastro-confirm-badge">✓ Parcela encontrada</div>
              <div className="catastro-detail-copy">
                <p className="eyebrow">Parcela catastral seleccionada</p>
                <h3>{selected.nationalCadastralReference}</h3>
                <dl>
                  <div><dt>Referencia catastral</dt><dd>{selected.nationalCadastralReference}</dd></div>
                  <div><dt>Superficie Catastro</dt><dd>{formatSurface(selected.areaM2)}</dd></div>
                  <div><dt>Parcela / etiqueta</dt><dd>{selected.label ?? '—'}</dd></div>
                  <div><dt>Alta cartográfica</dt><dd>{formatDate(selected.beginLifespanVersion)}</dd></div>
                  <div><dt>Geometría</dt><dd>{selected.geometry.type}{selected.geometry.type === 'MultiPolygon' ? ' · compleja' : ''}</dd></div>
                  <div><dt>Localización</dt><dd>{matchLabel}</dd></div>
                </dl>
                <button className="primary-button catastro-confirm-button" type="button" onClick={() => void importSelected()} disabled={importing}>
                  {importing ? 'Verificando…' : confirmImportId === selected.id ? 'Confirmar: esta es mi parcela' : 'Esta es mi parcela'}
                </button>
              </div>
            </article>
          ) : null}
        </div>
      ) : null}

      {source ? <p className="catastro-attribution">Fuente: {source.provider} · {source.dataset} · {source.service} · consulta {new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(source.checkedAt))}.</p> : null}
    </section>
  );
}
