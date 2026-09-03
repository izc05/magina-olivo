import { useEffect, useMemo, useState } from 'react';
import './catastro-panel.css';

type Position = [number, number];
type GeoJsonPolygon = { type: 'Polygon'; coordinates: number[][][] };
type CatastroGeometry = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
};
type PlotSummary = {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  cadastralReference: string | null;
  boundaryGeoJson: GeoJsonPolygon | null;
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
type CatastroResponse = {
  items: CatastroParcel[];
  source: {
    provider: string;
    dataset: string;
    service: string;
    status: string;
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

function exteriorRings(geometry: CatastroGeometry): Position[][] {
  if (geometry.type === 'Polygon') {
    const coordinates = geometry.coordinates as number[][][];
    return coordinates[0] ? [collectPositions(coordinates[0])] : [];
  }
  const coordinates = geometry.coordinates as number[][][][];
  return coordinates.flatMap((polygon) => polygon[0] ? [collectPositions(polygon[0])] : []);
}

function isSimpleImportablePolygon(geometry: CatastroGeometry): boolean {
  if (geometry.type !== 'Polygon') return false;
  const coordinates = geometry.coordinates as number[][][];
  if (coordinates.length !== 1 || !coordinates[0] || coordinates[0].length < 4) return false;
  const first = coordinates[0][0];
  const last = coordinates[0][coordinates[0].length - 1];
  return Boolean(first && last && first[0] === last[0] && first[1] === last[1]);
}

function bboxFromPlot(plot: PlotSummary): Bbox | null {
  const positions = collectPositions(plot.boundaryGeoJson?.coordinates ?? []);
  let centerLon = plot.longitude;
  let centerLat = plot.latitude;
  let spanLon = 0.012;
  let spanLat = 0.012;

  if (positions.length) {
    const longitudes = positions.map(([longitude]) => longitude);
    const latitudes = positions.map(([, latitude]) => latitude);
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
    minLat: Math.max(-85, centerLat - spanLat / 2),
    maxLon: Math.min(180, centerLon + spanLon / 2),
    maxLat: Math.min(85, centerLat + spanLat / 2),
  };
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

function GeometryPreview({ geometry }: { geometry: CatastroGeometry }) {
  const rings = useMemo(() => exteriorRings(geometry), [geometry]);
  const positions = rings.flat();
  if (!positions.length) return <div className="catastro-preview-empty">Geometría no representable</div>;

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
    <svg className="catastro-geometry-preview" viewBox="0 0 100 100" role="img" aria-label="Geometría oficial de la parcela catastral">
      {rings.map((ring, index) => <polygon key={index} points={pointString(ring)} />)}
    </svg>
  );
}

export function CatastroParcelPanel({ farmId, onImported }: { farmId: string; onImported: () => Promise<void> }) {
  const [plots, setPlots] = useState<PlotSummary[]>([]);
  const [plotId, setPlotId] = useState('');
  const [items, setItems] = useState<CatastroParcel[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [source, setSource] = useState<CatastroResponse['source'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmImportId, setConfirmImportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedPlot = useMemo(() => plots.find((plot) => plot.id === plotId) ?? null, [plots, plotId]);
  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? items[0] ?? null, [items, selectedId]);
  const importable = selected ? isSimpleImportablePolygon(selected.geometry) : false;

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

  async function searchParcels() {
    if (!selectedPlot) return;
    const bbox = bboxFromPlot(selectedPlot);
    if (!bbox) {
      setError('Sitúa primero la parcela en el mapa o dibuja un perímetro para buscar parcelas catastrales cercanas.');
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
      const result = await request<CatastroResponse>(`/api/v1/maps/catastro/parcelas?${params.toString()}`);
      setItems(result.items);
      setSelectedId(result.items[0]?.id ?? '');
      setSource(result.source);
      setNotice(result.items.length
        ? `${result.items.length} parcela${result.items.length === 1 ? '' : 's'} catastral${result.items.length === 1 ? '' : 'es'} encontrada${result.items.length === 1 ? '' : 's'} en la zona.`
        : 'Catastro no ha devuelto parcelas para esta zona.');
    } catch (reason) {
      setItems([]);
      setSelectedId('');
      setError(reason instanceof Error ? reason.message : 'No se ha podido consultar Catastro.');
    } finally {
      setLoading(false);
    }
  }

  async function importSelected() {
    if (!selectedPlot || !selected || !importable) return;
    if (confirmImportId !== selected.id) {
      setConfirmImportId(selected.id);
      setNotice('Revisa la referencia y la geometría. Pulsa “Confirmar perímetro Catastro” para que el servidor vuelva a verificarla directamente en la Dirección General del Catastro.');
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
      setNotice(`Parcela catastral ${selected.nationalCadastralReference} verificada y guardada como perímetro privado de trabajo.`);
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

  return (
    <section className="section catastro-shell" aria-labelledby="catastro-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow page-eyebrow">Cartografía oficial</p>
          <h2 id="catastro-title" className="section-title">Consulta Catastro</h2>
          <p className="section-copy">Consulta parcelas catastrales INSPIRE y compáralas con tu parcela de trabajo y con SIGPAC.</p>
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
        <div className="catastro-plot-status">
          <span>{selectedPlot?.boundaryGeoJson ? 'Perímetro disponible' : selectedPlot?.latitude != null ? 'Punto disponible' : 'Sin localización'}</span>
          {selectedPlot?.cadastralReference ? <span>RC {selectedPlot.cadastralReference}</span> : null}
          {selectedPlot?.boundaryAreaHa ? <span>{selectedPlot.boundaryAreaHa} ha geométricas</span> : null}
        </div>
        <button className="primary-button" type="button" onClick={() => void searchParcels()} disabled={loading}>{loading ? 'Consultando Catastro…' : 'Buscar parcelas catastrales cercanas'}</button>
        <p className="catastro-warning"><strong>Catastro y SIGPAC no son equivalentes.</strong> Pueden tener límites o superficies diferentes. Mágina Olivo los mantiene como fuentes independientes.</p>
        {error ? <div className="alert" role="alert">{error}</div> : null}
        {notice ? <div className="alert success" role="status">{notice}</div> : null}
      </div>

      {items.length ? (
        <div className="catastro-results-grid">
          <div className="catastro-result-list" role="list" aria-label="Parcelas catastrales encontradas">
            {items.map((item) => (
              <button key={item.id} type="button" role="listitem" className={`card catastro-result${selected?.id === item.id ? ' active' : ''}`} onClick={() => { setSelectedId(item.id); setConfirmImportId(null); }}>
                <strong>{item.nationalCadastralReference}</strong>
                <span>{formatSurface(item.areaM2)}</span>
                <small>{item.label ? `Parcela ${item.label}` : 'Parcela catastral'} · alta {formatDate(item.beginLifespanVersion)}</small>
              </button>
            ))}
          </div>

          {selected ? (
            <article className="card card-body catastro-detail">
              <GeometryPreview geometry={selected.geometry} />
              <div className="catastro-detail-copy">
                <p className="eyebrow">Parcela catastral seleccionada</p>
                <h3>{selected.nationalCadastralReference}</h3>
                <dl>
                  <div><dt>Referencia catastral</dt><dd>{selected.nationalCadastralReference}</dd></div>
                  <div><dt>Superficie Catastro</dt><dd>{formatSurface(selected.areaM2)}</dd></div>
                  <div><dt>Etiqueta</dt><dd>{selected.label ?? '—'}</dd></div>
                  <div><dt>Alta cartográfica</dt><dd>{formatDate(selected.beginLifespanVersion)}</dd></div>
                  <div><dt>Geometría</dt><dd>{selected.geometry.type}</dd></div>
                </dl>
                {importable ? (
                  <button className={confirmImportId === selected.id ? 'primary-button' : 'ghost-button'} type="button" onClick={() => void importSelected()} disabled={importing}>
                    {importing ? 'Verificando…' : confirmImportId === selected.id ? 'Confirmar perímetro Catastro' : 'Usar como perímetro'}
                  </button>
                ) : (
                  <p className="catastro-unsupported">Esta geometría es compleja. Puede consultarse, pero no se importa automáticamente en V1.</p>
                )}
              </div>
            </article>
          ) : null}
        </div>
      ) : null}

      {source ? (
        <p className="catastro-attribution">Fuente: {source.provider} · {source.dataset} · {source.service} · consulta {new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(source.checkedAt))}.</p>
      ) : null}
    </section>
  );
}
