import { useEffect, useMemo, useState } from 'react';
import { areaDifferencePercent, differenceBand, numericArea } from './parcel-source-comparison.ts';
import './parcel-source-comparison.css';

type BoundarySource = 'manual_map' | 'manual_gps' | 'imported' | 'sigpac' | 'catastro';
type Position = [number, number];
type GeoJsonBoundary = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
};
type PlotComparison = {
  id: string;
  name: string;
  areaHa: string | null;
  sigpacReference: string | null;
  cadastralReference: string | null;
  boundaryAreaHa: string | null;
  boundarySource: BoundarySource | null;
  boundaryUpdatedAt: string | null;
  boundaryExternalId: string | null;
  boundarySourceCheckedAt: string | null;
};
type OfficialBoundarySource = {
  source: 'catastro' | 'sigpac';
  externalId: string;
  reference: string | null;
  geometryGeoJson: GeoJsonBoundary;
  calculatedAreaHa: string;
  providerAreaM2: string | null;
  provider: string;
  dataset: string;
  service: string;
  sourceVersion: string | null;
  checkedAt: string;
  metadata: Record<string, unknown>;
  updatedAt: string;
};
type ApiErrorBody = { error?: { message?: string } };

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json() as ApiErrorBody;
      message = body.error?.message ?? message;
    } catch {
      // Keep status fallback.
    }
    throw new Error(message);
  }
  return await response.json() as T;
}

function sourceLabel(source: BoundarySource | null): string {
  if (source === 'manual_map') return 'Perímetro dibujado';
  if (source === 'manual_gps') return 'Perímetro GPS';
  if (source === 'imported') return 'Perímetro importado';
  if (source === 'sigpac') return 'SIGPAC verificado';
  if (source === 'catastro') return 'Catastro verificado';
  return 'Sin perímetro';
}

function sourceDetail(plot: PlotComparison): string {
  if (plot.boundarySource === 'sigpac') return plot.boundaryExternalId ? `Recinto FEGA ${plot.boundaryExternalId}` : 'Recinto SIGPAC';
  if (plot.boundarySource === 'catastro') return plot.boundaryExternalId ? `RC ${plot.boundaryExternalId}` : 'Parcela catastral';
  if (plot.boundarySource === 'manual_gps') return 'Trazado con posiciones del dispositivo';
  if (plot.boundarySource === 'manual_map') return 'Trazado sobre el mapa';
  if (plot.boundarySource === 'imported') return 'Geometría externa sin certificación oficial activa';
  return 'Añade un perímetro para comparar superficies';
}

function bandLabel(percent: number | null): string {
  if (percent == null) return 'Comparación pendiente';
  if (percent < 2) return 'Diferencia menor del 2 %';
  if (percent < 5) return 'Diferencia entre 2 % y 5 %';
  return 'Diferencia igual o superior al 5 %';
}

function formatArea(value: string | null): string {
  const number = numericArea(value);
  if (number == null) return '—';
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4 }).format(number)} ha`;
}

function formatProviderArea(value: string | null): string {
  if (value == null) return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(number)} m² · ${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4 }).format(number / 10_000)} ha`;
}

function formatPercent(value: number | null): string {
  if (value == null) return '—';
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value)} %`;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
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

function geometryRings(geometry: GeoJsonBoundary): Position[][] {
  if (geometry.type === 'Polygon') {
    return (geometry.coordinates as number[][][]).map((ring) => collectPositions(ring));
  }
  return (geometry.coordinates as number[][][][]).flatMap((polygon) => polygon.map((ring) => collectPositions(ring)));
}

function overlayModel(sources: OfficialBoundarySource[]) {
  const positions = sources.flatMap((source) => collectPositions(source.geometryGeoJson.coordinates));
  if (!positions.length) return null;
  const longitudes = positions.map(([longitude]) => longitude);
  const latitudes = positions.map(([, latitude]) => latitude);
  const minLon = Math.min(...longitudes);
  const maxLon = Math.max(...longitudes);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const width = Math.max(0.000001, maxLon - minLon);
  const height = Math.max(0.000001, maxLat - minLat);
  const project = ([longitude, latitude]: Position) => ({
    x: 7 + (longitude - minLon) / width * 86,
    y: 93 - (latitude - minLat) / height * 86,
  });
  return { project };
}

function geometryPath(geometry: GeoJsonBoundary, project: (position: Position) => { x: number; y: number }): string {
  return geometryRings(geometry).map((ring) => ring.map((position, index) => {
    const point = project(position);
    return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(3)} ${point.y.toFixed(3)}`;
  }).join(' ') + ' Z').join(' ');
}

export function ParcelSourceComparisonPanel({ farmId, revision = 0 }: { farmId: string; revision?: number }) {
  const [plots, setPlots] = useState<PlotComparison[]>([]);
  const [selectedPlotId, setSelectedPlotId] = useState('');
  const [officialSources, setOfficialSources] = useState<OfficialBoundarySource[]>([]);
  const [refreshRevision, setRefreshRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void request<{ items: PlotComparison[] }>(`/api/v1/farms/${farmId}/plots`).then((result) => {
      if (cancelled) return;
      setPlots(result.items);
      setSelectedPlotId((current) => result.items.some((plot) => plot.id === current) ? current : (result.items[0]?.id ?? ''));
    }).catch((reason) => {
      if (cancelled) return;
      setPlots([]);
      setError(reason instanceof Error ? reason.message : 'No se han podido comparar las superficies.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [farmId, revision, refreshRevision]);

  useEffect(() => {
    if (!selectedPlotId) {
      setOfficialSources([]);
      return;
    }
    let cancelled = false;
    setSourceLoading(true);
    void request<{ items: OfficialBoundarySource[] }>(`/api/v1/plots/${selectedPlotId}/boundary-sources`).then((result) => {
      if (!cancelled) setOfficialSources(result.items);
    }).catch((reason) => {
      if (!cancelled) {
        setOfficialSources([]);
        setError(reason instanceof Error ? reason.message : 'No se han podido cargar las fuentes oficiales.');
      }
    }).finally(() => {
      if (!cancelled) setSourceLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedPlotId, revision, refreshRevision]);

  const selected = useMemo(() => plots.find((plot) => plot.id === selectedPlotId) ?? null, [plots, selectedPlotId]);
  const percent = selected ? areaDifferencePercent(selected.areaHa, selected.boundaryAreaHa) : null;
  const band = differenceBand(percent);
  const declared = selected ? numericArea(selected.areaHa) : null;
  const geometric = selected ? numericArea(selected.boundaryAreaHa) : null;
  const signedDifference = declared != null && geometric != null ? geometric - declared : null;
  const catastro = officialSources.find((source) => source.source === 'catastro') ?? null;
  const sigpac = officialSources.find((source) => source.source === 'sigpac') ?? null;
  const officialPercent = catastro && sigpac ? areaDifferencePercent(catastro.calculatedAreaHa, sigpac.calculatedAreaHa) : null;
  const catastroArea = catastro ? numericArea(catastro.calculatedAreaHa) : null;
  const sigpacArea = sigpac ? numericArea(sigpac.calculatedAreaHa) : null;
  const officialDelta = catastroArea != null && sigpacArea != null ? sigpacArea - catastroArea : null;
  const overlay = useMemo(() => overlayModel(officialSources), [officialSources]);

  if (loading) return <section className="section card card-body parcel-comparison-loading" role="status">Preparando comparación de la parcela…</section>;
  if (!plots.length && !error) return null;

  return (
    <section className="section parcel-comparison-shell" aria-labelledby="parcel-comparison-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow page-eyebrow">Control de datos</p>
          <h2 id="parcel-comparison-title" className="section-title">Catastro ↔ SIGPAC</h2>
          <p className="section-copy">Conserva ambas fuentes verificadas, compara superficies y superpone sus límites sin decidir automáticamente cuál debe prevalecer.</p>
        </div>
        {selected ? <span className={`badge parcel-source-badge ${selected.boundarySource ?? 'none'}`}>{sourceLabel(selected.boundarySource)}</span> : null}
      </div>

      {error ? <div className="alert" role="alert">{error}</div> : null}

      {selected ? (
        <div className="card card-body parcel-comparison-card">
          <div className="parcel-comparison-toolbar">
            <div className="field parcel-comparison-selector">
              <label htmlFor="parcel-comparison-plot">Parcela</label>
              <select id="parcel-comparison-plot" value={selectedPlotId} onChange={(event) => setSelectedPlotId(event.target.value)}>
                {plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name}</option>)}
              </select>
            </div>
            <button className="ghost-button" type="button" onClick={() => setRefreshRevision((current) => current + 1)}>Actualizar comparación</button>
          </div>

          <div className="official-source-metrics">
            <article className="catastro-source-card">
              <span>Catastro</span>
              <strong>{catastro ? formatArea(catastro.calculatedAreaHa) : 'Pendiente'}</strong>
              <small>{catastro ? `RC ${catastro.reference ?? catastro.externalId}` : 'Importa o confirma una parcela catastral'}</small>
            </article>
            <article className="sigpac-source-card">
              <span>SIGPAC</span>
              <strong>{sigpac ? formatArea(sigpac.calculatedAreaHa) : 'Pendiente'}</strong>
              <small>{sigpac ? `Recinto ${sigpac.externalId}` : 'Importa o confirma un recinto SIGPAC'}</small>
            </article>
            <article>
              <span>Diferencia Catastro ↔ SIGPAC</span>
              <strong>{formatPercent(officialPercent)}</strong>
              <small>{officialDelta == null ? 'Se necesitan las dos fuentes' : `${officialDelta >= 0 ? '+' : '−'}${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4 }).format(Math.abs(officialDelta))} ha en SIGPAC respecto a Catastro`}</small>
            </article>
          </div>

          <div className="official-overlay-grid">
            <div className="official-overlay-card">
              <div className="official-overlay-heading">
                <div><strong>Superposición de límites</strong><small>Vista geométrica normalizada</small></div>
                <div className="official-overlay-legend"><span className="catastro">Catastro</span><span className="sigpac">SIGPAC</span></div>
              </div>
              {overlay && officialSources.length ? (
                <svg className="official-overlay-svg" viewBox="0 0 100 100" role="img" aria-label="Superposición de geometrías verificadas de Catastro y SIGPAC">
                  {catastro ? <path className="official-source-path catastro" fillRule="evenodd" d={geometryPath(catastro.geometryGeoJson, overlay.project)} /> : null}
                  {sigpac ? <path className="official-source-path sigpac" fillRule="evenodd" d={geometryPath(sigpac.geometryGeoJson, overlay.project)} /> : null}
                </svg>
              ) : <div className="official-overlay-empty">Añade al menos una fuente oficial para visualizar su perímetro.</div>}
            </div>

            <div className="official-source-detail-list">
              {[catastro, sigpac].filter((source): source is OfficialBoundarySource => Boolean(source)).map((source) => (
                <article key={source.source} className={`official-source-detail ${source.source}`}>
                  <div className="official-source-detail-title"><strong>{source.source === 'catastro' ? 'Catastro' : 'SIGPAC'}</strong><span>{source.geometryGeoJson.type}</span></div>
                  <dl>
                    <div><dt>Calculada por Mágina</dt><dd>{formatArea(source.calculatedAreaHa)}</dd></div>
                    <div><dt>Indicada por proveedor</dt><dd>{formatProviderArea(source.providerAreaM2)}</dd></div>
                    <div><dt>Proveedor</dt><dd>{source.provider}</dd></div>
                    <div><dt>Servicio</dt><dd>{source.service}</dd></div>
                    <div><dt>Versión / campaña</dt><dd>{source.sourceVersion ?? '—'}</dd></div>
                    <div><dt>Verificada</dt><dd>{formatDate(source.checkedAt)}</dd></div>
                  </dl>
                </article>
              ))}
              {sourceLoading ? <div className="parcel-comparison-loading">Actualizando fuentes oficiales…</div> : null}
            </div>
          </div>

          <div className="parcel-comparison-metrics">
            <article>
              <span>Superficie declarada</span>
              <strong>{formatArea(selected.areaHa)}</strong>
              <small>Dato introducido en Mágina Olivo</small>
            </article>
            <article>
              <span>Perímetro activo</span>
              <strong>{formatArea(selected.boundaryAreaHa)}</strong>
              <small>{sourceLabel(selected.boundarySource)}</small>
            </article>
            <article>
              <span>Diferencia declarada ↔ activa</span>
              <strong>{formatPercent(percent)}</strong>
              <small>{signedDifference == null ? 'Faltan datos para comparar' : `${signedDifference >= 0 ? '+' : '−'}${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4 }).format(Math.abs(signedDifference))} ha geométricas`}</small>
            </article>
          </div>

          <div className={`parcel-difference-status ${band}`} role="status">
            <strong>{bandLabel(percent)}</strong>
            <p>{percent == null
              ? 'Introduce una superficie declarada y guarda un perímetro para poder comparar.'
              : band === 'low'
                ? 'Las superficies declarada y activa son próximas. Esto no convierte ninguna de ellas en superficie administrativa oficial.'
                : 'Hay una diferencia visible. Para ayudas o trámites revisa siempre la fuente administrativa que corresponda.'}</p>
          </div>

          <div className="parcel-provenance-grid">
            <div><span>Procedencia del perímetro activo</span><strong>{sourceLabel(selected.boundarySource)}</strong><small>{sourceDetail(selected)}</small></div>
            <div><span>Última modificación activa</span><strong>{formatDate(selected.boundaryUpdatedAt)}</strong><small>{selected.boundarySourceCheckedAt ? `Fuente verificada: ${formatDate(selected.boundarySourceCheckedAt)}` : 'Sin verificación oficial activa'}</small></div>
            <div><span>Referencia SIGPAC</span><strong>{selected.sigpacReference ?? sigpac?.reference ?? '—'}</strong><small>{sigpac ? `Instantánea conservada · ${formatDate(sigpac.checkedAt)}` : 'Sin instantánea SIGPAC verificada'}</small></div>
            <div><span>Referencia catastral</span><strong>{selected.cadastralReference ?? catastro?.reference ?? '—'}</strong><small>{catastro ? `Instantánea conservada · ${formatDate(catastro.checkedAt)}` : 'Sin instantánea Catastro verificada'}</small></div>
          </div>

          <p className="parcel-comparison-disclaimer"><strong>Mágina no elige automáticamente una superficie “correcta”.</strong> Catastro y SIGPAC permanecen independientes porque pueden responder a finalidades y delimitaciones distintas.</p>
        </div>
      ) : null}
    </section>
  );
}
