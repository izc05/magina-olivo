import { useEffect, useMemo, useState } from 'react';

type IrrigationType = 'dryland' | 'irrigated' | 'mixed' | 'unknown';
type PlotSummary = {
  id: string;
  name: string;
  areaHa: string | null;
  boundaryAreaHa: string | null;
  oliveTreeCount: number | null;
  irrigationType: IrrigationType | null;
  oliveVariety: string | null;
};

type ApiErrorBody = { error?: { message?: string } };
type UpdateResponse = PlotSummary;

const VARIETY_SHORTCUTS = ['Picual', 'Hojiblanca', 'Arbequina', 'Manzanilla', 'Lechín', 'Mixta'];

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

function densityLabel(plot: PlotSummary | null): string | null {
  if (!plot || plot.oliveTreeCount == null) return null;
  const area = Number(plot.boundaryAreaHa ?? plot.areaHa);
  if (!Number.isFinite(area) || area <= 0) return null;
  const density = plot.oliveTreeCount / area;
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(density)} olivos/ha`;
}

function irrigationLabel(value: IrrigationType | null): string {
  if (value === 'dryland') return 'Secano';
  if (value === 'irrigated') return 'Regadío';
  if (value === 'mixed') return 'Mixto';
  return 'Sin definir';
}

export function PlotOliveCountPanel({ farmId, onSaved }: { farmId: string; onSaved?: () => Promise<void> }) {
  const [plots, setPlots] = useState<PlotSummary[]>([]);
  const [plotId, setPlotId] = useState('');
  const [oliveTreeCount, setOliveTreeCount] = useState('');
  const [irrigationType, setIrrigationType] = useState<IrrigationType>('unknown');
  const [oliveVariety, setOliveVariety] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedPlot = useMemo(() => plots.find((plot) => plot.id === plotId) ?? null, [plots, plotId]);
  const density = densityLabel(selectedPlot);
  const totalOlives = useMemo(
    () => plots.reduce((total, plot) => total + (plot.oliveTreeCount ?? 0), 0),
    [plots],
  );
  const informedCount = useMemo(() => plots.filter((plot) => plot.oliveTreeCount != null).length, [plots]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void request<{ items: PlotSummary[] }>(`/api/v1/farms/${farmId}/plots/agronomy`).then((result) => {
      if (cancelled) return;
      setPlots(result.items);
      setPlotId((current) => result.items.some((plot) => plot.id === current) ? current : (result.items[0]?.id ?? ''));
    }).catch((reason) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : 'No se han podido cargar los datos agrícolas.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [farmId]);

  useEffect(() => {
    setOliveTreeCount(selectedPlot?.oliveTreeCount == null ? '' : String(selectedPlot.oliveTreeCount));
    setIrrigationType(selectedPlot?.irrigationType ?? 'unknown');
    setOliveVariety(selectedPlot?.oliveVariety ?? '');
    setError(null);
    setNotice(null);
  }, [selectedPlot?.id, selectedPlot?.oliveTreeCount, selectedPlot?.irrigationType, selectedPlot?.oliveVariety]);

  function parsedCount(): number | null | undefined {
    const trimmed = oliveTreeCount.trim();
    const parsed = trimmed === '' ? null : Number(trimmed);
    if (parsed != null && (!Number.isInteger(parsed) || parsed < 0 || parsed > 100000000)) {
      setError('Escribe un número entero de olivos igual o superior a 0.');
      return undefined;
    }
    return parsed;
  }

  async function persistAgronomy(countOverride?: number | null) {
    if (!selectedPlot) return;
    const count = countOverride === undefined ? parsedCount() : countOverride;
    if (count === undefined) return;
    const variety = oliveVariety.trim();
    if (variety.length > 80) {
      setError('La variedad debe tener 80 caracteres como máximo.');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await request<UpdateResponse>(`/api/v1/plots/${selectedPlot.id}/agronomy`, {
        method: 'PATCH',
        body: JSON.stringify({
          oliveTreeCount: count,
          irrigationType,
          oliveVariety: variety || null,
        }),
      });
      setPlots((current) => current.map((plot) => plot.id === updated.id ? updated : plot));
      setOliveTreeCount(updated.oliveTreeCount == null ? '' : String(updated.oliveTreeCount));
      setIrrigationType(updated.irrigationType ?? 'unknown');
      setOliveVariety(updated.oliveVariety ?? '');
      setNotice(`Datos agrícolas guardados para ${updated.name}.`);
      await onSaved?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se han podido guardar los datos agrícolas.');
    } finally {
      setSaving(false);
    }
  }

  async function clearOliveCount() {
    setOliveTreeCount('');
    await persistAgronomy(null);
  }

  if (loading) return <div className="card empty-state" role="status">Cargando ficha agrícola…</div>;
  if (!plots.length) return null;

  return (
    <section className="section" aria-labelledby="plot-agronomy-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow page-eyebrow">Inventario del olivar</p>
          <h2 id="plot-agronomy-title" className="section-title">Ficha agrícola por parcela</h2>
          <p className="section-copy">Completa olivos, variedad y riego de cada parcela. Son datos privados declarados por ti y podrás cambiarlos cuando quieras.</p>
        </div>
        <div className="plot-map-counts" aria-label="Cobertura del inventario de olivos">
          <span className="badge gold">{informedCount}/{plots.length} con olivos</span>
          <span className="badge">{new Intl.NumberFormat('es-ES').format(totalOlives)} olivos</span>
        </div>
      </div>

      <div className="card card-body">
        <div className="field">
          <label htmlFor="agronomy-plot">Parcela</label>
          <select id="agronomy-plot" value={plotId} onChange={(event) => setPlotId(event.target.value)}>
            {plots.map((plot) => (
              <option key={plot.id} value={plot.id}>{plot.name}{plot.oliveTreeCount == null ? ' · olivos sin informar' : ` · ${plot.oliveTreeCount} olivos`}</option>
            ))}
          </select>
        </div>

        <div className="inline-fields">
          <div className="field">
            <label htmlFor="olive-tree-count">Olivos en esta parcela</label>
            <input
              id="olive-tree-count"
              type="number"
              min="0"
              max="100000000"
              step="1"
              inputMode="numeric"
              value={oliveTreeCount}
              onChange={(event) => setOliveTreeCount(event.target.value)}
              placeholder="Ej. 236"
            />
          </div>
          <div className="field">
            <label htmlFor="plot-irrigation-profile">Riego</label>
            <select id="plot-irrigation-profile" value={irrigationType} onChange={(event) => setIrrigationType(event.target.value as IrrigationType)}>
              <option value="unknown">Sin definir</option>
              <option value="dryland">Secano</option>
              <option value="irrigated">Regadío</option>
              <option value="mixed">Mixto</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="olive-variety">Variedad principal o mezcla</label>
          <input
            id="olive-variety"
            maxLength={80}
            value={oliveVariety}
            onChange={(event) => setOliveVariety(event.target.value)}
            placeholder="Ej. Picual"
          />
          <div className="plot-map-actions" aria-label="Variedades frecuentes">
            {VARIETY_SHORTCUTS.map((variety) => (
              <button key={variety} className="ghost-button" type="button" onClick={() => setOliveVariety(variety)} disabled={saving}>{variety}</button>
            ))}
          </div>
        </div>

        <div className="plot-map-meta" aria-live="polite">
          <span>{selectedPlot?.oliveTreeCount == null ? 'Olivos pendientes' : `${new Intl.NumberFormat('es-ES').format(selectedPlot.oliveTreeCount)} olivos`}</span>
          <span>{density ?? 'Densidad pendiente'}</span>
          <span>{selectedPlot?.oliveVariety ?? 'Variedad sin definir'}</span>
          <span>{irrigationLabel(selectedPlot?.irrigationType ?? null)}</span>
        </div>

        <div className="plot-map-meta">
          <span>{selectedPlot?.boundaryAreaHa ? `${selectedPlot.boundaryAreaHa} ha geométricas` : selectedPlot?.areaHa ? `${selectedPlot.areaHa} ha declaradas` : 'Sin superficie'}</span>
          <span>Datos agrícolas privados</span>
        </div>

        <div className="plot-map-actions">
          <button className="primary-button" type="button" onClick={() => void persistAgronomy()} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar ficha agrícola'}
          </button>
          <button className="ghost-button" type="button" onClick={() => void clearOliveCount()} disabled={saving || selectedPlot?.oliveTreeCount == null}>
            Dejar olivos sin informar
          </button>
        </div>

        <p className="plot-editor-help">La densidad se calcula automáticamente con la superficie disponible. Número de olivos, variedad y riego no se obtienen de Catastro ni SIGPAC.</p>
        {error ? <div className="alert" role="alert">{error}</div> : null}
        {notice ? <div className="alert success" role="status">{notice}</div> : null}
      </div>
    </section>
  );
}
