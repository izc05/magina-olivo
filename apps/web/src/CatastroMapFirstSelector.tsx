import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  buildCatastroSelectorMap,
  DEFAULT_CATASTRO_CENTER,
  exteriorRings,
  geometryCenter,
  isSimpleImportablePolygon,
  MAP_VIEW_SIZE,
  MIN_CATASTRO_ZOOM,
  panCenter,
  screenPoint,
  viewportBbox,
  type CatastroGeometry,
  type MapCenter,
} from './catastro-selector-map.ts';
import './catastro-map-first.css';

type PlotSummary = {
  id: string;
  name: string;
  cadastralReference: string | null;
};

type CatastroParcel = {
  id: string;
  nationalCadastralReference: string;
  label: string | null;
  areaM2: number | null;
  beginLifespanVersion: string | null;
  geometry: CatastroGeometry;
};

type Source = {
  provider: string;
  dataset: string;
  service: string;
  status: string;
  checkedAt: string;
};

type CatastroResponse = { items: CatastroParcel[]; source: Source };
type ReferenceResponse = { item: CatastroParcel; source: Source };
type ApiErrorBody = { error?: { message?: string } };

type DragState = {
  pointerId: number;
  x: number;
  y: number;
};

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
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

function formatArea(areaM2: number | null): string {
  if (areaM2 == null || !Number.isFinite(areaM2)) return 'Superficie no disponible';
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4 }).format(areaM2 / 10_000)} ha`;
}

function normalizeReferenceInput(value: string): string | null {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (![14, 18, 20].includes(compact.length)) return null;
  return compact.slice(0, 14);
}

function requestDeviceLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('GEOLOCATION_UNAVAILABLE'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 30_000,
    });
  });
}

export function CatastroMapFirstSelector({ farmId }: { farmId: string }) {
  const [open, setOpen] = useState(false);
  const [center, setCenter] = useState<MapCenter>(DEFAULT_CATASTRO_CENTER);
  const [zoom, setZoom] = useState(16);
  const [plots, setPlots] = useState<PlotSummary[]>([]);
  const [items, setItems] = useState<CatastroParcel[]>([]);
  const [parcelCache, setParcelCache] = useState<Record<string, CatastroParcel>>({});
  const [selectedReferences, setSelectedReferences] = useState<string[]>([]);
  const [focusedReference, setFocusedReference] = useState<string | null>(null);
  const [referenceInput, setReferenceInput] = useState('');
  const [source, setSource] = useState<Source | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const drag = useRef<DragState | null>(null);

  const model = useMemo(() => buildCatastroSelectorMap(center, zoom), [center, zoom]);
  const existingReferences = useMemo(
    () => new Set(plots.flatMap((plot) => plot.cadastralReference ? [plot.cadastralReference.toUpperCase()] : [])),
    [plots],
  );
  const selectedItems = useMemo(
    () => selectedReferences.flatMap((reference) => parcelCache[reference] ? [parcelCache[reference]!] : []),
    [parcelCache, selectedReferences],
  );

  useEffect(() => {
    let cancelled = false;
    void request<{ items: PlotSummary[] }>(`/api/v1/farms/${farmId}/plots`).then((result) => {
      if (!cancelled) setPlots(result.items);
    }).catch(() => {
      if (!cancelled) setPlots([]);
    });
    return () => { cancelled = true; };
  }, [farmId]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open || zoom < MIN_CATASTRO_ZOOM) {
      setItems([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const bbox = viewportBbox(center, zoom);
      const params = new URLSearchParams({
        minLon: String(bbox.minLon),
        minLat: String(bbox.minLat),
        maxLon: String(bbox.maxLon),
        maxLat: String(bbox.maxLat),
      });
      setLoading(true);
      setError(null);
      void request<CatastroResponse>(`/api/v1/maps/catastro/parcelas?${params.toString()}`, { signal: controller.signal })
        .then((result) => {
          setItems(result.items);
          setSource(result.source);
          setParcelCache((current) => {
            const next = { ...current };
            for (const item of result.items) next[item.nationalCadastralReference] = item;
            return next;
          });
        })
        .catch((reason) => {
          if (controller.signal.aborted) return;
          setError(reason instanceof Error ? reason.message : 'No se ha podido consultar Catastro.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [center, open, zoom]);

  function toggleSelection(item: CatastroParcel) {
    const reference = item.nationalCadastralReference;
    if (existingReferences.has(reference)) {
      setNotice(`La parcela ${reference} ya está añadida a esta finca.`);
      return;
    }
    setParcelCache((current) => ({ ...current, [reference]: item }));
    setSelectedReferences((current) => current.includes(reference)
      ? current.filter((value) => value !== reference)
      : [...current, reference]);
    setFocusedReference(reference);
    setReviewing(false);
    setNotice(null);
  }

  async function locateMe() {
    setLocating(true);
    setError(null);
    try {
      const position = await requestDeviceLocation();
      setCenter({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setZoom(18);
    } catch {
      setError('No se ha podido obtener tu ubicación. Puedes seguir moviendo el mapa manualmente.');
    } finally {
      setLocating(false);
    }
  }

  async function searchByReference() {
    const reference = normalizeReferenceInput(referenceInput);
    if (!reference) {
      setError('Escribe una referencia catastral de 14, 18 o 20 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const result = await request<ReferenceResponse>(`/api/v1/maps/catastro/parcelas/by-reference/${encodeURIComponent(reference)}`);
      const item = result.item;
      setSource(result.source);
      setParcelCache((current) => ({ ...current, [item.nationalCadastralReference]: item }));
      setItems((current) => current.some((candidate) => candidate.id === item.id) ? current : [item, ...current]);
      setFocusedReference(item.nationalCadastralReference);
      const nextCenter = geometryCenter(item.geometry);
      if (nextCenter) setCenter(nextCenter);
      setZoom((current) => Math.max(current, 18));
      setNotice(`Referencia ${item.nationalCadastralReference} localizada. Toca su perímetro para seleccionarla.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido localizar la referencia.');
    } finally {
      setLoading(false);
    }
  }

  function panBy(deltaX: number, deltaY: number) {
    setCenter((current) => panCenter(current, zoom, deltaX, deltaY));
  }

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - current.x;
    const deltaY = event.clientY - current.y;
    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;
    drag.current = { ...current, x: event.clientX, y: event.clientY };
    setCenter((value) => panCenter(value, zoom, deltaX, deltaY));
  }

  function onPointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function polygonPoints(ring: [number, number][]) {
    return ring.map((position) => {
      const point = screenPoint(position, zoom, model.topLeft);
      return `${point.x},${point.y}`;
    }).join(' ');
  }

  return (
    <section className="section catastro-map-first-entry" aria-labelledby="catastro-map-first-entry-title">
      <div className="card card-body">
        <p className="eyebrow page-eyebrow">Alta rápida de parcelas</p>
        <h2 id="catastro-map-first-entry-title" className="section-title">Busca tus parcelas directamente en el mapa</h2>
        <p className="section-copy">No necesitas crear una parcela ni escribir coordenadas antes. Localiza la zona, toca las parcelas oficiales que gestionas y continúa con sus datos agrícolas.</p>
        <button className="primary-button" type="button" onClick={() => setOpen(true)}>Buscar mis parcelas en el mapa</button>
        <p className="plot-editor-help">Seleccionar una parcela expresa tu elección de trabajo; no acredita titularidad ni propiedad.</p>
      </div>

      {open ? (
        <div className="catastro-map-first-overlay" role="dialog" aria-modal="true" aria-labelledby="catastro-map-first-title">
          <div className="catastro-map-first-shell">
            <header className="catastro-map-first-header">
              <div>
                <p className="eyebrow">Catastro · selector visual</p>
                <h2 id="catastro-map-first-title">Selecciona parcelas</h2>
              </div>
              <button className="ghost-button" type="button" onClick={() => setOpen(false)} aria-label="Cerrar selector">Cerrar</button>
            </header>

            <div className="catastro-map-first-searchbar">
              <label className="field">
                <span>Referencia catastral</span>
                <input value={referenceInput} onChange={(event) => setReferenceInput(event.target.value)} placeholder="14, 18 o 20 caracteres" autoComplete="off" />
              </label>
              <button className="ghost-button" type="button" onClick={() => void searchByReference()} disabled={loading}>Buscar referencia</button>
              <button className="ghost-button" type="button" onClick={() => void locateMe()} disabled={locating}>{locating ? 'Buscando GPS…' : 'Mi ubicación'}</button>
            </div>

            <div className="catastro-map-first-layout">
              <div className="catastro-map-first-map-card">
                <div className="catastro-map-first-toolbar" aria-label="Controles del mapa">
                  <button type="button" onClick={() => setZoom((value) => Math.min(20, value + 1))} disabled={zoom >= 20} aria-label="Acercar">+</button>
                  <button type="button" onClick={() => setZoom((value) => Math.max(13, value - 1))} disabled={zoom <= 13} aria-label="Alejar">−</button>
                  <button type="button" onClick={() => panBy(120, 0)} aria-label="Mover mapa al oeste">←</button>
                  <button type="button" onClick={() => panBy(0, 120)} aria-label="Mover mapa al norte">↑</button>
                  <button type="button" onClick={() => panBy(0, -120)} aria-label="Mover mapa al sur">↓</button>
                  <button type="button" onClick={() => panBy(-120, 0)} aria-label="Mover mapa al este">→</button>
                  <span>z{zoom}</span>
                </div>

                <svg
                  className="catastro-map-first-map"
                  viewBox={`0 0 ${MAP_VIEW_SIZE} ${MAP_VIEW_SIZE}`}
                  role="img"
                  aria-label="Mapa para seleccionar parcelas catastrales"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                >
                  {model.tiles.map((tile) => (
                    <image key={tile.key} href={tile.href} x={tile.x} y={tile.y} width="256" height="256" />
                  ))}
                  {items.flatMap((item) => {
                    const selectedIndex = selectedReferences.indexOf(item.nationalCadastralReference);
                    const isSelected = selectedIndex >= 0;
                    const alreadyAdded = existingReferences.has(item.nationalCadastralReference);
                    const focused = focusedReference === item.nationalCadastralReference;
                    const rings = exteriorRings(item.geometry);
                    const centerPoint = geometryCenter(item.geometry);
                    const marker = centerPoint ? screenPoint([centerPoint.longitude, centerPoint.latitude], zoom, model.topLeft) : null;
                    return [
                      <g
                        key={item.id}
                        className={`catastro-map-first-parcel${isSelected ? ' selected' : ''}${alreadyAdded ? ' existing' : ''}${focused ? ' focused' : ''}`}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        aria-label={`${item.label ? `Parcela ${item.label}` : 'Parcela'} ${item.nationalCadastralReference}${alreadyAdded ? ', ya añadida' : ''}`}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => toggleSelection(item)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            toggleSelection(item);
                          }
                        }}
                      >
                        {rings.map((ring, index) => <polygon key={index} points={polygonPoints(ring)} />)}
                        {isSelected && marker ? <text x={marker.x} y={marker.y}>{selectedIndex + 1}</text> : null}
                      </g>,
                    ];
                  })}
                </svg>

                <div className="catastro-map-first-map-status" aria-live="polite">
                  {zoom < MIN_CATASTRO_ZOOM
                    ? <strong>Acércate para ver parcelas de Catastro.</strong>
                    : loading
                      ? <strong>Cargando parcelas oficiales…</strong>
                      : <span>{items.length} parcelas visibles · arrastra el mapa para moverte</span>}
                  <small>© OpenStreetMap contributors · límites: Dirección General del Catastro</small>
                </div>
              </div>

              <aside className="catastro-map-first-sheet" aria-label="Parcelas seleccionadas">
                <div className="catastro-map-first-sheet-heading">
                  <div>
                    <strong>{selectedItems.length} seleccionada{selectedItems.length === 1 ? '' : 's'}</strong>
                    <small>{source ? `Catastro · consulta ${new Intl.DateTimeFormat('es-ES', { timeStyle: 'short' }).format(new Date(source.checkedAt))}` : 'Fuente oficial pendiente'}</small>
                  </div>
                  {selectedItems.length ? <button className="text-button" type="button" onClick={() => { setSelectedReferences([]); setReviewing(false); }}>Limpiar</button> : null}
                </div>

                {selectedItems.length ? (
                  <div className="catastro-map-first-selection-list">
                    {selectedItems.map((item, index) => (
                      <article className="catastro-map-first-selection" key={item.nationalCadastralReference}>
                        <span className="catastro-map-first-number">{index + 1}</span>
                        <div>
                          <strong>{item.label ? `Parcela ${item.label}` : item.nationalCadastralReference}</strong>
                          <small>{item.nationalCadastralReference}</small>
                          <small>{formatArea(item.areaM2)} · {isSimpleImportablePolygon(item.geometry) ? 'importable' : 'geometría compleja'}</small>
                        </div>
                        <button className="text-button" type="button" onClick={() => toggleSelection(item)}>Quitar</button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">Toca una parcela en el mapa. Puedes seleccionar varias antes de continuar.</div>
                )}

                {reviewing && selectedItems.length ? (
                  <div className="alert success" role="status">
                    Has seleccionado {selectedItems.length} parcela{selectedItems.length === 1 ? '' : 's'} oficial{selectedItems.length === 1 ? '' : 'es'} de Catastro. La creación se hará en el siguiente paso, revalidando cada referencia en el servidor.
                  </div>
                ) : null}

                <button className="primary-button catastro-map-first-cta" type="button" disabled={!selectedItems.length} onClick={() => setReviewing(true)}>
                  {selectedItems.length === 1 ? 'Revisar esta parcela' : `Revisar ${selectedItems.length} parcelas`}
                </button>

                <p className="catastro-map-first-trust">Mágina Olivo no interpreta la selección como prueba de propiedad. Catastro aporta referencia, geometría y superficie; olivos, variedad y riego los declararás tú.</p>
              </aside>
            </div>

            {error ? <div className="alert catastro-map-first-feedback" role="alert">{error}</div> : null}
            {notice ? <div className="alert success catastro-map-first-feedback" role="status">{notice}</div> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
