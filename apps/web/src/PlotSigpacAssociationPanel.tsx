import { useEffect, useMemo, useState } from 'react';
import './plot-sigpac-associations.css';

type PlotSummary = {
  id: string;
  name: string;
  cadastralReference: string | null;
  boundarySource: string | null;
};

type SigpacCandidate = {
  id: string;
  provincia: number | null;
  municipio: number | null;
  agregado: number | null;
  zona: number | null;
  poligono: number | null;
  parcela: number | null;
  recinto: number | null;
  usoSigpac: string | null;
  surfaceM2: number | null;
  classification: 'nearby' | 'likely-overlap';
  classificationMethod: 'bbox';
};

type SigpacAssociation = {
  id: string;
  sigpacRecintoId: string;
  provincia: number | null;
  municipio: number | null;
  agregado: number | null;
  zona: number | null;
  poligono: number | null;
  parcela: number | null;
  recinto: number | null;
  usoSigpac: string | null;
  surfaceM2: string | null;
  sourceCheckedAt: string;
};

type ApiErrorBody = { error?: { message?: string } };

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

function formatArea(value: number | string | null): string {
  if (value == null || value === '') return 'Superficie no informada';
  const number = Number(value);
  if (!Number.isFinite(number)) return 'Superficie no informada';
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(number)} m²`;
}

function recintoLabel(item: Pick<SigpacCandidate, 'poligono' | 'parcela' | 'recinto'>): string {
  return `Pol. ${item.poligono ?? '—'} · Parc. ${item.parcela ?? '—'} · Rec. ${item.recinto ?? '—'}`;
}

export function PlotSigpacAssociationPanel({ farmId }: { farmId: string }) {
  const [plots, setPlots] = useState<PlotSummary[]>([]);
  const [plotId, setPlotId] = useState('');
  const [associations, setAssociations] = useState<SigpacAssociation[]>([]);
  const [candidates, setCandidates] = useState<SigpacCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const catastroPlots = useMemo(
    () => plots.filter((plot) => plot.boundarySource === 'catastro' && plot.cadastralReference),
    [plots],
  );
  const selectedPlot = useMemo(() => catastroPlots.find((plot) => plot.id === plotId) ?? null, [catastroPlots, plotId]);
  const associationById = useMemo(
    () => new Map(associations.map((item) => [item.sigpacRecintoId, item])),
    [associations],
  );
  const displayItems = useMemo(() => {
    const items = new Map<string, SigpacCandidate & { alreadyAssociated: boolean }>();
    for (const candidate of candidates) {
      items.set(candidate.id, { ...candidate, alreadyAssociated: associationById.has(candidate.id) });
    }
    for (const association of associations) {
      if (items.has(association.sigpacRecintoId)) continue;
      items.set(association.sigpacRecintoId, {
        id: association.sigpacRecintoId,
        provincia: association.provincia,
        municipio: association.municipio,
        agregado: association.agregado,
        zona: association.zona,
        poligono: association.poligono,
        parcela: association.parcela,
        recinto: association.recinto,
        usoSigpac: association.usoSigpac,
        surfaceM2: association.surfaceM2 == null ? null : Number(association.surfaceM2),
        classification: 'nearby',
        classificationMethod: 'bbox',
        alreadyAssociated: true,
      });
    }
    return [...items.values()];
  }, [associationById, associations, candidates]);

  useEffect(() => {
    let cancelled = false;
    void request<{ items: PlotSummary[] }>(`/api/v1/farms/${farmId}/plots`)
      .then((result) => {
        if (cancelled) return;
        setPlots(result.items);
      })
      .catch(() => {
        if (!cancelled) setPlots([]);
      });
    return () => { cancelled = true; };
  }, [farmId]);

  useEffect(() => {
    setPlotId((current) => catastroPlots.some((plot) => plot.id === current) ? current : (catastroPlots[0]?.id ?? ''));
  }, [catastroPlots]);

  useEffect(() => {
    if (!plotId) {
      setAssociations([]);
      setCandidates([]);
      setSelectedIds([]);
      return;
    }
    let cancelled = false;
    setError(null);
    setCandidates([]);
    void request<{ items: SigpacAssociation[] }>(`/api/v1/plots/${plotId}/sigpac-recintos`)
      .then((result) => {
        if (cancelled) return;
        setAssociations(result.items);
        setSelectedIds(result.items.map((item) => item.sigpacRecintoId));
      })
      .catch((reason) => {
        if (cancelled) return;
        setAssociations([]);
        setSelectedIds([]);
        setError(reason instanceof Error ? reason.message : 'No se han podido cargar los recintos asociados.');
      });
    return () => { cancelled = true; };
  }, [plotId]);

  async function loadCandidates() {
    if (!plotId) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const result = await request<{
        items: SigpacCandidate[];
        relation: { message: string };
      }>(`/api/v1/plots/${plotId}/sigpac-candidates`);
      setCandidates(result.items);
      setNotice(result.items.length
        ? `${result.items.length} recinto${result.items.length === 1 ? '' : 's'} SIGPAC encontrado${result.items.length === 1 ? '' : 's'} en la zona. Revísalos antes de guardar.`
        : 'SIGPAC no ha devuelto recintos candidatos en esta zona.');
    } catch (reason) {
      setCandidates([]);
      setError(reason instanceof Error ? reason.message : 'No se han podido consultar recintos SIGPAC.');
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id]);
  }

  async function saveAssociations() {
    if (!plotId) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const result = await request<{ items: SigpacAssociation[] }>(`/api/v1/plots/${plotId}/sigpac-recintos`, {
        method: 'PUT',
        body: JSON.stringify({ recintoIds: selectedIds }),
      });
      setAssociations(result.items);
      setSelectedIds(result.items.map((item) => item.sigpacRecintoId));
      setNotice(`${result.items.length} recinto${result.items.length === 1 ? '' : 's'} SIGPAC asociado${result.items.length === 1 ? '' : 's'} después de verificación oficial. El perímetro Catastro se mantiene sin cambios.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se han podido guardar los recintos SIGPAC asociados.');
    } finally {
      setSaving(false);
    }
  }

  if (!catastroPlots.length) return null;

  return (
    <section className="section plot-sigpac-association-shell" aria-labelledby="plot-sigpac-association-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow page-eyebrow">Contexto agrícola oficial</p>
          <h2 id="plot-sigpac-association-title" className="section-title">Recintos SIGPAC de tu parcela</h2>
          <p className="section-copy">Relaciona uno o varios recintos SIGPAC con una parcela Catastro sin sustituir su referencia ni su perímetro.</p>
        </div>
        <span className="badge gold">Catastro + SIGPAC</span>
      </div>

      <div className="card card-body plot-sigpac-association-controls">
        <label className="field" htmlFor="plot-sigpac-association-plot">
          <span>Parcela Catastro</span>
          <select id="plot-sigpac-association-plot" value={plotId} onChange={(event) => setPlotId(event.target.value)}>
            {catastroPlots.map((plot) => (
              <option key={plot.id} value={plot.id}>{plot.name} · {plot.cadastralReference}</option>
            ))}
          </select>
        </label>
        <button className="primary-button" type="button" onClick={() => void loadCandidates()} disabled={!selectedPlot || loading}>
          {loading ? 'Consultando SIGPAC…' : 'Ver recintos SIGPAC de esta zona'}
        </button>
        <p className="plot-sigpac-trust"><strong>Catastro y SIGPAC son fuentes diferentes.</strong> Un recinto marcado como posible solape es solo un candidato cartográfico; tú decides cuáles quieres asociar.</p>
      </div>

      {displayItems.length ? (
        <div className="plot-sigpac-candidate-grid" role="group" aria-label="Recintos SIGPAC candidatos y asociados">
          {displayItems.map((item) => {
            const checked = selectedIds.includes(item.id);
            return (
              <label className={`card card-body plot-sigpac-candidate${checked ? ' selected' : ''}`} key={item.id}>
                <input type="checkbox" checked={checked} onChange={() => toggle(item.id)} />
                <div>
                  <div className="plot-sigpac-candidate-title">
                    <strong>{recintoLabel(item)}</strong>
                    {item.alreadyAssociated
                      ? <span className="badge">Asociado</span>
                      : item.classification === 'likely-overlap'
                        ? <span className="badge gold">Posible solape</span>
                        : <span className="badge">Cercano</span>}
                  </div>
                  <small>ID SIGPAC {item.id}</small>
                  <small>{item.usoSigpac ? `Uso ${item.usoSigpac}` : 'Uso no informado'} · {formatArea(item.surfaceM2)}</small>
                </div>
              </label>
            );
          })}
        </div>
      ) : associations.length ? (
        <div className="card card-body">Hay recintos asociados. Pulsa “Ver recintos SIGPAC de esta zona” para volver a compararlos con la cartografía actual.</div>
      ) : null}

      {displayItems.length || associations.length ? (
        <div className="card card-body plot-sigpac-save-bar">
          <div>
            <strong>{selectedIds.length} recinto{selectedIds.length === 1 ? '' : 's'} seleccionado{selectedIds.length === 1 ? '' : 's'}</strong>
            <small>Guardar sustituye el conjunto de asociaciones SIGPAC, pero nunca modifica el perímetro Catastro.</small>
          </div>
          <button className="primary-button" type="button" onClick={() => void saveAssociations()} disabled={saving}>
            {saving ? 'Verificando y guardando…' : 'Guardar recintos asociados'}
          </button>
        </div>
      ) : null}

      {error ? <div className="alert" role="alert">{error}</div> : null}
      {notice ? <div className="alert success" role="status">{notice}</div> : null}
    </section>
  );
}
