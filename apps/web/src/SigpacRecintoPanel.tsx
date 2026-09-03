import { useEffect, useMemo, useState } from 'react';
import './sigpac-panel.css';

type Position = [number, number];
type GeoJsonPolygon = { type: 'Polygon'; coordinates: number[][][] };
type SigpacGeometry = { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
type PlotSummary = {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  boundaryGeoJson: GeoJsonPolygon | null;
  boundaryAreaHa: string | null;
};
type SigpacRecinto = {
  id: string;
  provincia: number | null;
  municipio: number | null;
  agregado: number | null;
  zona: number | null;
  poligono: number | null;
  parcela: number | null;
  recinto: number | null;
  pendienteMedia: number | null;
  altitud: number | null;
  surfaceM2: number | null;
  usoSigpac: string | null;
  geometry: SigpacGeometry;
};
type SigpacResponse = {
  items: SigpacRecinto[];
  source: {
    provider: string;
    collection: string;
    campaign: string;
    license: string;
    checkedAt: string;
  };
};
type ApiErrorBody = { error?: { message?: string } };

type Bbox = { minLon: number; minLat: number; maxLon: number; maxLat: number };

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
      // Keep generic status message.
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

function exteriorRings(geometry: SigpacGeometry): Position[][] {
  if (geometry.type === 'Polygon') {
    const polygon = geometry.coordinates;
    if (!Array.isArray(polygon) || !Array.isArray(polygon[0])) return [];
    return [collectPositions(polygon[0])];
  }
  const multipolygon = geometry.coordinates;
  if (!Array.isArray(multipolygon)) return [];
  return multipolygon.flatMap((polygon) => {
    if (!Array.isArray(polygon) || !Array.isArray(polygon[0])) return [];
    const ring = collectPositions(polygon[0]);
    return ring.length ? [ring] : [];
  });
}

function simplePolygon(geometry: SigpacGeometry): GeoJsonPolygon | null {
  if (geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length !== 1) return null;
  const ring = collectPositions(geometry.coordinates[0]);
  if (ring.length < 4) return null;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) return null;
  return { type: 'Polygon', coordinates: [ring.map(([longitude, latitude]) => [longitude, latitude])] };
}

function bboxFromPlot(plot: PlotSummary): Bbox | null {
  const boundaryPositions = collectPositions(plot.boundaryGeoJson?.coordinates ?? []);
  let centerLon: number | null = plot.longitude;
  let centerLat: number | null = plot.latitude;
  let spanLon = 0.012;
  let spanLat = 0.012;

  if (boundaryPositions.length) {
    const longitudes = boundaryPositions.map(([longitude]) => longitude);
    const latitudes = boundaryPositions.map(([, latitude]) => latitude);
    const minLon = Math.min(...longitudes);
    const maxLon = Math.max(...longitudes);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    centerLon = (minLon + maxLon) / 2;
    centerLat = (minLat + maxLat) / 2;
    spanLon = Math.max(0.006, Math.min(0.045, (maxLon - minLon) + 0.004));
    spanLat = Math.max(0.006, Math.min(0.045, (maxLat - minLat) + 0.004));
  }

  if (centerLon == null || centerLat == null) return null;
  return {
    minLon: Math.max(-180, centerLon - spanLon / 2),
    minLat: Math.max(-90, centerLat - spanLat / 2),
    maxLon: Math.min(180, centerLon + spanLon / 2),
    maxLat: Math.min(90, centerLat + spanLat / 2),
  };
}

function sigpacReference(item: SigpacRecinto): string {
  const values = [item.provincia, item.municipio, item.agregado, item.zona, item.poligono, item.parcela, item.recinto];
  return values.map((value) => value ?? '—').join(' / ');
}

function formatSurface(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(value)} m² · ${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4 }).format(value / 10_000)} ha`;
}

function GeometryPreview({ geometry }: { geometry: SigpacGeometry }) {
  const rings = useMemo(() => exteriorRings(geometry), [geometry]);
  const positions = rings.flat();
  if (!positions.length) return <div className="sigpac-preview-empty">Geometría no representable</div>;

  const longitudes = positions.map(([longitude]) => longitude);
  const latitudes = positions.map(([, latitude]) => latitude);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const width = Math.max(0.000001, maxLon - minLon);
  const height = Math.max(0.000001, maxLat - minLat);

  const pointString = (ring: Position[]) => ring.map(([longitude, latitude]) => {
    const x = 5 + (longitude - minLon) / width * 90;
    const y = 95 - (latitude - minLat) / height * 90;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="sigpac-geometry-preview" viewBox="0 0 100 100" role="img" aria-label="Geometría oficial del recinto SIGPAC">
      {rings.map((ring, index) => <polygon key={index} points={pointString(ring)} />)}
    </svg>
  );
}

export function SigpacRecintoPanel({ farmId, onImported }: { farmId: string; onImported: () => Promise<void> }) {
  const [plots, setPlots] = useState<PlotSummary[]>([]);
  const [plotId, setPlotId] = useState('');
  const [items, setItems] = useState<SigpacRecinto[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [source, setSource] = useState<SigpacResponse['source'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmImportId, setConfirmImportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedPlot = useMemo(() => plots.find((plot) => plot.id === plotId) ?? null, [plots, plotId]);
  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? items[0] ?? null, [items, selectedId]);
  const importableBoundary = selected ? simplePolygon(selected.geometry) : null;

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
    setItems([]);
    setSelectedId('');
    setSource(null);
    setConfirmImportId(null);
    setNotice(null);
    setError(null);
  }, [plotId]);

  async function searchRecintos() {
    if (!selectedPlot) return;
    const bbox = bboxFromPlot(selectedPlot);
    if (!bbox) {
      setError('Sitúa primero la parcela en el mapa o dibuja un perímetro para poder buscar recintos SIGPAC cercanos.');
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);
    setConfirmImportId(null);
    try {
      const params = new URLSearchParams({
        minLon: String(bbox.minLon),
        minLat: String(bbox.minLat),
        maxLon: String(bbox.maxLon),
        maxLat: String(bbox.maxLat),
      });
      const result = await request<SigpacResponse>(`/api/v1/maps/sigpac/recintos?${params.toString()}`);
      setItems(result.items);
      setSelectedId(result.items[0]?.id ?? '');
      setSource(result.source);
      setNotice(result.items.length
        ? `${result.items.length} recinto${result.items.length === 1 ? '' : 's'} oficial${result.items.length === 1 ? '' : 'es'} encontrado${result.items.length === 1 ? '' : 's'} en la zona.`
        : 'SIGPAC no ha devuelto recintos para esta zona.');
    } catch (reason) {
      setItems([]);
      setSelectedId('');
      setError(reason instanceof Error ? reason.message : 'No se ha podido consultar SIGPAC.');
    } finally {
      setLoading(false);
    }
  }

  async function importSelected() {
    if (!selectedPlot || !selected || !importableBoundary) return;
    if (confirmImportId !== selected.id) {
      setConfirmImportId(selected.id);
      setNotice('Revisa el recinto seleccionado. Pulsa “Confirmar perímetro SIGPAC” para guardarlo como perímetro privado de trabajo.');
      return;
    }

    setImporting(true);
    setError(null);
    setNotice(null);
    try {
      await request(`/api/v1/plots/${selectedPlot.id}/boundary`, {
        method: 'PATCH',
        body: JSON.stringify({ boundary: importableBoundary, source: 'sigpac' }),
      });
      setConfirmImportId(null);
      setNotice(`Recinto SIGPAC ${sigpacReference(selected)} guardado como perímetro privado. La superficie ha sido recalculada por Mágina Olivo.`);
      await onImported();
      const refreshed = await request<{ items: PlotSummary[] }>(`/api/v1/farms/${farmId}/plots`);
      setPlots(refreshed.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido importar el recinto.');
    } finally {
      setImporting(false);
    }
  }

  if (!plots.length) return null;

  return (
    <section className="section sigpac-shell" aria-labelledby="sigpac-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow page-eyebrow">Cartografía oficial</p>
          <h2 id="sigpac-title" className="section-title">Consulta SIGPAC</h2>
          <p className="section-copy">Consulta recintos vigentes de FEGA y decide explícitamente si quieres usar uno como perímetro privado.</p>
        </div>
        <span className="badge gold">Oficial · FEGA</span>
      </div>

      <div className="card card-body sigpac-search-card">
        <div className="field">
          <label htmlFor="sigpac-plot">Parcela de Mágina Olivo</label>
          <select id="sigpac-plot" value={plotId} onChange={(event) => setPlotId(event.target.value)}>
            {plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name}</option>)}
          </select>
        </div>
        <div className="sigpac-plot-status">
          <span>{selectedPlot?.boundaryGeoJson ? 'Perímetro disponible' : selectedPlot?.latitude != null ? 'Punto disponible' : 'Sin localización'}</span>
          {selectedPlot?.boundaryAreaHa ? <span>{selectedPlot.boundaryAreaHa} ha geométricas</span> : null}
        </div>
        <button className="primary-button" type="button" onClick={() => void searchRecintos()} disabled={loading}>{loading ? 'Consultando SIGPAC…' : 'Buscar recintos oficiales cercanos'}</button>
        {error ? <div className="alert" role="alert">{error}</div> : null}
        {notice ? <div className="alert success" role="status">{notice}</div> : null}
      </div>

      {items.length ? (
        <div className="sigpac-results-grid">
          <div className="sigpac-result-list" role="list" aria-label="Recintos SIGPAC encontrados">
            {items.map((item) => (
              <button key={item.id} type="button" role="listitem" className={`card sigpac-result${selected?.id === item.id ? ' active' : ''}`} onClick={() => { setSelectedId(item.id); setConfirmImportId(null); }}>
                <strong>P{item.poligono ?? '—'} · Parcela {item.parcela ?? '—'} · R{item.recinto ?? '—'}</strong>
                <span>{formatSurface(item.surfaceM2)}</span>
                <small>{item.usoSigpac ? `Uso ${item.usoSigpac}` : 'Uso no informado'} · Alt. {item.altitud ?? '—'} m</small>
              </button>
            ))}
          </div>

          {selected ? (
            <article className="card card-body sigpac-detail">
              <GeometryPreview geometry={selected.geometry} />
              <div className="sigpac-detail-copy">
                <p className="eyebrow">Recinto oficial seleccionado</p>
                <h3>Polígono {selected.poligono ?? '—'} · Parcela {selected.parcela ?? '—'} · Recinto {selected.recinto ?? '—'}</h3>
                <dl>
                  <div><dt>Referencia</dt><dd>{sigpacReference(selected)}</dd></div>
                  <div><dt>Superficie SIGPAC</dt><dd>{formatSurface(selected.surfaceM2)}</dd></div>
                  <div><dt>Uso</dt><dd>{selected.usoSigpac ?? '—'}</dd></div>
                  <div><dt>Pendiente media</dt><dd>{selected.pendienteMedia ?? '—'}</dd></div>
                  <div><dt>Altitud</dt><dd>{selected.altitud == null ? '—' : `${selected.altitud} m`}</dd></div>
                </dl>
                {importableBoundary ? (
                  <button className={confirmImportId === selected.id ? 'primary-button' : 'ghost-button'} type="button" onClick={() => void importSelected()} disabled={importing}>
                    {importing ? 'Guardando…' : confirmImportId === selected.id ? 'Confirmar perímetro SIGPAC' : 'Usar como perímetro'}
                  </button>
                ) : (
                  <div className="alert">Este recinto tiene una geometría compleja (MultiPolygon o huecos) y V1 lo deja solo en consulta para no simplificar lindes oficiales.</div>
                )}
              </div>
            </article>
          ) : null}
        </div>
      ) : null}

      {source ? (
        <p className="sigpac-attribution">Datos: {source.provider} · colección {source.collection} · campaña {source.campaign} · {source.license}. Consulta realizada {new Date(source.checkedAt).toLocaleString('es-ES')}.</p>
      ) : null}
    </section>
  );
}
