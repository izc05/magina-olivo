import { useEffect, useMemo, useState } from 'react';
import './parcel-source-comparison.css';

type BoundarySource = 'manual_map' | 'manual_gps' | 'imported' | 'sigpac' | 'catastro';
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
type ApiErrorBody = { error?: { message?: string } };
type DifferenceBand = 'none' | 'low' | 'medium' | 'high';

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

function numericArea(value: string | null): number | null {
  if (value == null || value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function areaDifferencePercent(declaredAreaHa: string | null, geometricAreaHa: string | null): number | null {
  const declared = numericArea(declaredAreaHa);
  const geometric = numericArea(geometricAreaHa);
  if (declared == null || geometric == null || declared === 0) return null;
  return Math.abs(geometric - declared) / declared * 100;
}

export function differenceBand(percent: number | null): DifferenceBand {
  if (percent == null) return 'none';
  if (percent < 2) return 'low';
  if (percent < 5) return 'medium';
  return 'high';
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

export function ParcelSourceComparisonPanel({ farmId, revision = 0 }: { farmId: string; revision?: number }) {
  const [plots, setPlots] = useState<PlotComparison[]>([]);
  const [selectedPlotId, setSelectedPlotId] = useState('');
  const [refreshRevision, setRefreshRevision] = useState(0);
  const [loading, setLoading] = useState(true);
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

  const selected = useMemo(() => plots.find((plot) => plot.id === selectedPlotId) ?? null, [plots, selectedPlotId]);
  const percent = selected ? areaDifferencePercent(selected.areaHa, selected.boundaryAreaHa) : null;
  const band = differenceBand(percent);
  const declared = selected ? numericArea(selected.areaHa) : null;
  const geometric = selected ? numericArea(selected.boundaryAreaHa) : null;
  const signedDifference = declared != null && geometric != null ? geometric - declared : null;

  if (loading) return <section className="section card card-body parcel-comparison-loading" role="status">Preparando comparación de la parcela…</section>;
  if (!plots.length && !error) return null;

  return (
    <section className="section parcel-comparison-shell" aria-labelledby="parcel-comparison-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow page-eyebrow">Control de datos</p>
          <h2 id="parcel-comparison-title" className="section-title">Comparador de parcela</h2>
          <p className="section-copy">Compara lo declarado con la superficie geométrica y revisa de dónde procede el perímetro guardado.</p>
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

          <div className="parcel-comparison-metrics">
            <article>
              <span>Superficie declarada</span>
              <strong>{formatArea(selected.areaHa)}</strong>
              <small>Dato introducido en Mágina Olivo</small>
            </article>
            <article>
              <span>Superficie geométrica</span>
              <strong>{formatArea(selected.boundaryAreaHa)}</strong>
              <small>Calculada por el servidor desde el perímetro</small>
            </article>
            <article>
              <span>Diferencia</span>
              <strong>{formatPercent(percent)}</strong>
              <small>{signedDifference == null ? 'Faltan datos para comparar' : `${signedDifference >= 0 ? '+' : '−'}${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4 }).format(Math.abs(signedDifference))} ha geométricas`}</small>
            </article>
          </div>

          <div className={`parcel-difference-status ${band}`} role="status">
            <strong>{bandLabel(percent)}</strong>
            <p>{percent == null
              ? 'Introduce una superficie declarada y guarda un perímetro para poder comparar.'
              : band === 'low'
                ? 'Las dos superficies son próximas. Esto no convierte ninguna de ellas en superficie administrativa oficial.'
                : 'Hay una diferencia visible entre ambas superficies. Si vas a usar el dato para ayudas, trámites o documentación, revisa la fuente oficial correspondiente.'}</p>
          </div>

          <div className="parcel-provenance-grid">
            <div>
              <span>Procedencia del perímetro</span>
              <strong>{sourceLabel(selected.boundarySource)}</strong>
              <small>{sourceDetail(selected)}</small>
            </div>
            <div>
              <span>Última modificación</span>
              <strong>{formatDate(selected.boundaryUpdatedAt)}</strong>
              <small>{selected.boundarySourceCheckedAt ? `Fuente oficial verificada: ${formatDate(selected.boundarySourceCheckedAt)}` : 'Sin verificación oficial activa'}</small>
            </div>
            <div>
              <span>Referencia SIGPAC</span>
              <strong>{selected.sigpacReference ?? '—'}</strong>
              <small>{selected.boundarySource === 'sigpac' ? 'Perímetro actual verificado contra FEGA' : 'Referencia informativa independiente del perímetro actual'}</small>
            </div>
            <div>
              <span>Referencia catastral</span>
              <strong>{selected.cadastralReference ?? '—'}</strong>
              <small>{selected.boundarySource === 'catastro' ? 'Perímetro actual verificado contra Catastro' : 'Referencia informativa independiente del perímetro actual'}</small>
            </div>
          </div>

          <p className="parcel-comparison-disclaimer"><strong>No se elige automáticamente una superficie “correcta”.</strong> Superficie declarada, perímetro de trabajo, SIGPAC y Catastro pueden responder a finalidades distintas.</p>
        </div>
      ) : null}
    </section>
  );
}
