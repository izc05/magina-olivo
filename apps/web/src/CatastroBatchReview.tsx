import { useEffect, useMemo, useState } from 'react';
import './catastro-batch-review.css';

type IrrigationType = 'dryland' | 'irrigated' | 'mixed' | 'unknown';
type ReviewParcel = {
  nationalCadastralReference: string;
  label: string | null;
  areaM2: number | null;
};
type Draft = {
  name: string;
  oliveTreeCount: string;
  irrigationType: IrrigationType | '';
};
type ValidationItem = {
  cadastralReference: string;
  status: 'ready' | 'duplicate' | 'unsupported' | 'upstream-error' | 'invalid';
  message?: string;
};
type BatchFailure = {
  error?: { message?: string };
  created: false;
  items: ValidationItem[];
};
type BatchSuccess = {
  created: true;
  items: Array<{
    id: string;
    name: string;
    cadastralReference: string;
    boundaryAreaHa: number;
    oliveTreeCount: number | null;
    irrigationType: IrrigationType | null;
  }>;
};

function defaultName(parcel: ReviewParcel): string {
  return parcel.label ? `Parcela ${parcel.label}` : `Parcela ${parcel.nationalCadastralReference}`;
}

function formatArea(areaM2: number | null): string {
  if (areaM2 == null || !Number.isFinite(areaM2)) return 'Superficie oficial pendiente';
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4 }).format(areaM2 / 10_000)} ha Catastro`;
}

function statusLabel(status: ValidationItem['status']): string {
  if (status === 'duplicate') return 'Ya añadida';
  if (status === 'unsupported') return 'Geometría no importable';
  if (status === 'upstream-error') return 'No verificada';
  if (status === 'invalid') return 'Dato no válido';
  return 'Lista';
}

export function CatastroBatchReview({
  farmId,
  parcels,
  onCreated,
  onBack,
}: {
  farmId: string;
  parcels: ReviewParcel[];
  onCreated: (count: number) => Promise<void>;
  onBack: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<Record<string, ValidationItem>>({});

  useEffect(() => {
    setDrafts((current) => {
      const next: Record<string, Draft> = {};
      for (const parcel of parcels) {
        next[parcel.nationalCadastralReference] = current[parcel.nationalCadastralReference] ?? {
          name: defaultName(parcel),
          oliveTreeCount: '',
          irrigationType: '',
        };
      }
      return next;
    });
    setValidation({});
    setError(null);
  }, [parcels]);

  const invalidLocal = useMemo(() => parcels.some((parcel) => {
    const draft = drafts[parcel.nationalCadastralReference];
    if (!draft?.name.trim()) return true;
    if (!draft.oliveTreeCount.trim()) return false;
    const count = Number(draft.oliveTreeCount);
    return !Number.isInteger(count) || count < 0 || count > 100000000;
  }), [drafts, parcels]);

  function patchDraft(reference: string, patch: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,
      [reference]: { ...current[reference]!, ...patch },
    }));
    setValidation((current) => {
      if (!current[reference]) return current;
      const next = { ...current };
      delete next[reference];
      return next;
    });
  }

  function applyIrrigationToAll(irrigationType: IrrigationType) {
    setDrafts((current) => {
      const next = { ...current };
      for (const parcel of parcels) {
        const reference = parcel.nationalCadastralReference;
        next[reference] = { ...next[reference]!, irrigationType };
      }
      return next;
    });
  }

  async function createPlots() {
    if (!parcels.length || invalidLocal) {
      setError('Revisa los nombres y las cantidades de olivos antes de continuar.');
      return;
    }

    setSaving(true);
    setError(null);
    setValidation({});
    try {
      const response = await fetch(`/api/v1/farms/${farmId}/plots/import-catastro`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          parcels: parcels.map((parcel) => {
            const draft = drafts[parcel.nationalCadastralReference]!;
            return {
              cadastralReference: parcel.nationalCadastralReference,
              name: draft.name.trim(),
              oliveTreeCount: draft.oliveTreeCount.trim() === '' ? null : Number(draft.oliveTreeCount),
              irrigationType: draft.irrigationType || null,
            };
          }),
        }),
      });

      const body = await response.json() as BatchSuccess | BatchFailure;
      if (!response.ok || !body.created) {
        const failure = body as BatchFailure;
        setValidation(Object.fromEntries(failure.items.map((item) => [item.cadastralReference, item])));
        setError(failure.error?.message ?? 'No se ha creado ninguna parcela. Revisa los avisos del lote.');
        return;
      }

      await onCreated(body.items.length);
    } catch {
      setError('No se ha podido completar el alta. No se ha confirmado ninguna creación; vuelve a intentarlo cuando tengas conexión.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="catastro-batch-review" aria-labelledby="catastro-batch-review-title">
      <div className="catastro-batch-review-heading">
        <div>
          <p className="eyebrow">Paso 2 · Datos agrícolas</p>
          <h3 id="catastro-batch-review-title">Completa cada parcela</h3>
          <p>Catastro se volverá a consultar en el servidor antes de crear nada.</p>
        </div>
        <button className="ghost-button" type="button" onClick={onBack} disabled={saving}>Volver al mapa</button>
      </div>

      <div className="catastro-batch-quick-actions" aria-label="Aplicar riego a todas las parcelas">
        <span>Aplicar riego a todas:</span>
        <button className="text-button" type="button" onClick={() => applyIrrigationToAll('dryland')} disabled={saving}>Secano</button>
        <button className="text-button" type="button" onClick={() => applyIrrigationToAll('irrigated')} disabled={saving}>Regadío</button>
        <button className="text-button" type="button" onClick={() => applyIrrigationToAll('mixed')} disabled={saving}>Mixto</button>
      </div>

      <div className="catastro-batch-grid">
        {parcels.map((parcel, index) => {
          const reference = parcel.nationalCadastralReference;
          const draft = drafts[reference] ?? { name: defaultName(parcel), oliveTreeCount: '', irrigationType: '' };
          const itemValidation = validation[reference];
          return (
            <article className="card card-body catastro-batch-card" key={reference}>
              <div className="catastro-batch-card-title">
                <span className="catastro-map-first-number">{index + 1}</span>
                <div>
                  <strong>{parcel.label ? `Parcela ${parcel.label}` : reference}</strong>
                  <small>{reference} · {formatArea(parcel.areaM2)}</small>
                </div>
                {itemValidation ? <span className="badge">{statusLabel(itemValidation.status)}</span> : null}
              </div>

              <label className="field">
                <span>Nombre en Mágina Olivo</span>
                <input value={draft.name} maxLength={120} onChange={(event) => patchDraft(reference, { name: event.target.value })} disabled={saving} />
              </label>

              <div className="inline-fields">
                <label className="field">
                  <span>Olivos en esta parcela</span>
                  <input
                    type="number"
                    min="0"
                    max="100000000"
                    step="1"
                    inputMode="numeric"
                    value={draft.oliveTreeCount}
                    onChange={(event) => patchDraft(reference, { oliveTreeCount: event.target.value })}
                    placeholder="Ej. 236"
                    disabled={saving}
                  />
                </label>
                <label className="field">
                  <span>Riego</span>
                  <select value={draft.irrigationType} onChange={(event) => patchDraft(reference, { irrigationType: event.target.value as IrrigationType | '' })} disabled={saving}>
                    <option value="">Sin definir</option>
                    <option value="dryland">Secano</option>
                    <option value="irrigated">Regadío</option>
                    <option value="mixed">Mixto</option>
                    <option value="unknown">No lo sé</option>
                  </select>
                </label>
              </div>

              {itemValidation?.message ? <div className="alert" role="alert">{itemValidation.message}</div> : null}
            </article>
          );
        })}
      </div>

      <div className="catastro-batch-confirmation">
        <div>
          <strong>{parcels.length} parcela{parcels.length === 1 ? '' : 's'} preparada{parcels.length === 1 ? '' : 's'}</strong>
          <small>El lote es todo-o-nada: si una referencia falla, no se crea ninguna.</small>
        </div>
        <button className="primary-button" type="button" onClick={() => void createPlots()} disabled={saving || invalidLocal || !parcels.length}>
          {saving ? 'Verificando Catastro…' : parcels.length === 1 ? 'Crear esta parcela' : `Crear ${parcels.length} parcelas`}
        </button>
      </div>

      <p className="catastro-map-first-trust">Los olivos y el riego son datos privados declarados por ti. El servidor no los obtiene ni los deduce de Catastro.</p>
      {error ? <div className="alert" role="alert">{error}</div> : null}
    </div>
  );
}
