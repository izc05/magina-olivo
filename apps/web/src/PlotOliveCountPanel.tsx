import { useEffect, useMemo, useState } from 'react';

type PlotSummary = {
  id: string;
  name: string;
  areaHa: string | null;
  boundaryAreaHa: string | null;
  oliveTreeCount: number | null;
};

type ApiErrorBody = { error?: { message?: string } };
type UpdateResponse = {
  id: string;
  oliveTreeCount: number | null;
  areaHa: string | null;
  boundaryAreaHa: string | null;
};

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

export function PlotOliveCountPanel({ farmId, onSaved }: { farmId: string; onSaved?: () => Promise<void> }) {
  const [plots, setPlots] = useState<PlotSummary[]>([]);
  const [plotId, setPlotId] = useState('');
  const [oliveTreeCount, setOliveTreeCount] = useState('');
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
    void request<{ items: PlotSummary[] }>(`/api/v1/farms/${farmId}/plots`).then((result) => {
      if (cancelled) return;
      setPlots(result.items);
      setPlotId((current) => result.items.some((plot) => plot.id === current) ? current : (result.items[0]?.id ?? ''));
    }).catch((reason) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : 'No se han podido cargar las parcelas.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [farmId]);

  useEffect(() => {
    setOliveTreeCount(selectedPlot?.oliveTreeCount == null ? '' : String(selectedPlot.oliveTreeCount));
    setError(null);
    setNotice(null);
  }, [selectedPlot?.id, selectedPlot?.oliveTreeCount]);

  async function persistOliveCount(value: number | null) {
    if (!selectedPlot) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await request<UpdateResponse>(`/api/v1/plots/${selectedPlot.id}/olive-count`, {
        method: 'PATCH',
        body: JSON.stringify({ oliveTreeCount: value }),
      });
      setPlots((current) => current.map((plot) => plot.id === updated.id ? {
        ...plot,
        oliveTreeCount: updated.oliveTreeCount,
        areaHa: updated.areaHa,
        boundaryAreaHa: updated.boundaryAreaHa,
      } : plot));
      setOliveTreeCount(updated.oliveTreeCount == null ? '' : String(updated.oliveTreeCount));
      setNotice(updated.oliveTreeCount == null
        ? 'Cantidad de olivos dejada sin informar para esta parcela.'
        : `${new Intl.NumberFormat('es-ES').format(updated.oliveTreeCount)} olivos guardados en esta parcela.`);
      await onSaved?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido guardar la cantidad de olivos.');
    } finally {
      setSaving(false);
    }
  }

  async function saveOliveCount() {
    const trimmed = oliveTreeCount.trim();
    const parsed = trimmed === '' ? null : Number(trimmed);
    if (parsed != null && (!Number.isInteger(parsed) || parsed < 0 || parsed > 100000000)) {
      setError('Escribe un número entero de olivos igual o superior a 0.');
      return;
    }
    await persistOliveCount(parsed);
  }

  async function clearOliveCount() {
    setOliveTreeCount('');
    await persistOliveCount(null);
  }

  if (loading) return <div className="card empty-state" role="status">Cargando inventario de olivos…</div>;
  if (!plots.length) return null;

  return (
    <section className="section" aria-labelledby="plot-olive-count-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow page-eyebrow">Inventario del olivar</p>
          <h2 id="plot-olive-count-title" className="section-title">Olivos por parcela</h2>
          <p className="section-copy">Indica cuántos olivos tienes en cada parcela. Es un dato privado declarado por ti y podrás cambiarlo cuando quieras.</p>
        </div>
        <div className="plot-map-counts" aria-label="Cobertura del inventario de olivos">
          <span className="badge gold">{informedCount}/{plots.length} informadas</span>
          <span className="badge">{new Intl.NumberFormat('es-ES').format(totalOlives)} olivos</span>
        </div>
      </div>

      <div className="card card-body">
        <div className="field">
          <label htmlFor="olive-count-plot">Parcela</label>
          <select id="olive-count-plot" value={plotId} onChange={(event) => setPlotId(event.target.value)}>
            {plots.map((plot) => (
              <option key={plot.id} value={plot.id}>{plot.name}{plot.oliveTreeCount == null ? ' · sin informar' : ` · ${plot.oliveTreeCount} olivos`}</option>
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
            <label>Superficie de referencia</label>
            <div className="input-readonly">{selectedPlot?.boundaryAreaHa ? `${selectedPlot.boundaryAreaHa} ha geométricas` : selectedPlot?.areaHa ? `${selectedPlot.areaHa} ha declaradas` : 'Sin superficie'}</div>
          </div>
        </div>

        <div className="plot-map-meta" aria-live="polite">
          <span>{selectedPlot?.oliveTreeCount == null ? 'Cantidad pendiente' : `${new Intl.NumberFormat('es-ES').format(selectedPlot.oliveTreeCount)} olivos`}</span>
          <span>{density ?? 'Densidad pendiente'}</span>
          <span>Dato agrícola privado</span>
        </div>

        <div className="plot-map-actions">
          <button className="primary-button" type="button" onClick={() => void saveOliveCount()} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cantidad de olivos'}
          </button>
          <button className="ghost-button" type="button" onClick={() => void clearOliveCount()} disabled={saving || selectedPlot?.oliveTreeCount == null}>
            Dejar sin informar
          </button>
        </div>

        <p className="plot-editor-help">La densidad se calcula automáticamente cuando hay superficie disponible. No se obtiene de Catastro ni SIGPAC y no sustituye ningún dato oficial.</p>
        {error ? <div className="alert" role="alert">{error}</div> : null}
        {notice ? <div className="alert success" role="status">{notice}</div> : null}
      </div>
    </section>
  );
}
