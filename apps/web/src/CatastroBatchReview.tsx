import { useEffect, useMemo, useState } from 'react';
import './catastro-batch-review.css';

type IrrigationType = 'dryland' | 'irrigated' | 'mixed' | 'unknown';
type Destination = 'existing' | 'new';
type ReviewParcel = {
  nationalCadastralReference: string;
  label: string | null;
  areaM2: number | null;
};
type Draft = {
  name: string;
  oliveTreeCount: string;
  irrigationType: IrrigationType | '';
  oliveVariety: string;
  notes: string;
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
  farm?: { id: string; name: string };
  items: Array<{
    id: string;
    name: string;
    cadastralReference: string;
    boundaryAreaHa: number;
    oliveTreeCount: number | null;
    irrigationType: IrrigationType | null;
    oliveVariety: string | null;
  }>;
};

export type CatastroBatchCreated = {
  count: number;
  farmId: string;
  farmName?: string;
};

const VARIETIES = ['Picual', 'Hojiblanca', 'Arbequina', 'Manzanilla', 'Lechín', 'Mixta'];

function defaultName(parcel: ReviewParcel): string {
  return parcel.label ? `Parcela ${parcel.label}` : `Parcela ${parcel.nationalCadastralReference}`;
}

function formatArea(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return 'Superficie oficial pendiente';
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4 }).format(value / 10_000)} ha Catastro`;
}

function statusLabel(status: ValidationItem['status']): string {
  if (status === 'duplicate') return 'Ya añadida';
  if (status === 'unsupported') return 'Geometría no importable';
  if (status === 'upstream-error') return 'No verificada';
  if (status === 'invalid') return 'Dato no válido';
  return 'Lista';
}

export function CatastroBatchReview({
  holdingId,
  farmId,
  parcels,
  allowNewFarm = true,
  defaultDestination,
  onCreated,
  onBack,
}: {
  holdingId: string;
  farmId?: string;
  parcels: ReviewParcel[];
  allowNewFarm?: boolean;
  defaultDestination?: Destination;
  onCreated: (result: CatastroBatchCreated) => Promise<void>;
  onBack: () => void;
}) {
  const initialDestination: Destination = defaultDestination ?? (farmId ? 'existing' : 'new');
  const [destination, setDestination] = useState<Destination>(initialDestination);
  const [farmName, setFarmName] = useState('');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<Record<string, ValidationItem>>({});

  useEffect(() => {
    setDestination(defaultDestination ?? (farmId ? 'existing' : 'new'));
  }, [defaultDestination, farmId]);

  useEffect(() => {
    setDrafts((current) => {
      const next: Record<string, Draft> = {};
      for (const parcel of parcels) {
        next[parcel.nationalCadastralReference] = current[parcel.nationalCadastralReference] ?? {
          name: defaultName(parcel),
          oliveTreeCount: '',
          irrigationType: '',
          oliveVariety: '',
          notes: '',
        };
      }
      return next;
    });
    setValidation({});
    setError(null);
  }, [parcels]);

  const invalidLocal = useMemo(() => parcels.some((parcel) => {
    const draft = drafts[parcel.nationalCadastralReference];
    if (!draft?.name.trim() || draft.oliveVariety.trim().length > 80 || draft.notes.length > 5000) return true;
    if (!draft.oliveTreeCount.trim()) return false;
    const count = Number(draft.oliveTreeCount);
    return !Number.isInteger(count) || count < 0 || count > 100000000;
  }), [drafts, parcels]);

  const invalidDestination = destination === 'new' ? !farmName.trim() : !farmId;

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

  function applyIrrigationToAll(value: IrrigationType) {
    setDrafts((current) => Object.fromEntries(
      Object.entries(current).map(([key, valueDraft]) => [key, { ...valueDraft, irrigationType: value }]),
    ));
  }

  function applyVarietyToAll(value: string) {
    setDrafts((current) => Object.fromEntries(
      Object.entries(current).map(([key, valueDraft]) => [key, { ...valueDraft, oliveVariety: value }]),
    ));
  }

  function parcelPayload() {
    return parcels.map((parcel) => {
      const draft = drafts[parcel.nationalCadastralReference]!;
      return {
        cadastralReference: parcel.nationalCadastralReference,
        name: draft.name.trim(),
        oliveTreeCount: draft.oliveTreeCount.trim() === '' ? null : Number(draft.oliveTreeCount),
        irrigationType: draft.irrigationType || null,
        oliveVariety: draft.oliveVariety.trim() || null,
        notes: draft.notes.trim() || null,
      };
    });
  }

  async function createPlots() {
    if (!parcels.length || invalidLocal || invalidDestination) {
      setError(destination === 'new' && !farmName.trim()
        ? 'Escribe un nombre para la finca nueva.'
        : 'Revisa nombres, olivos, variedad y notas antes de continuar.');
      return;
    }

    setSaving(true);
    setError(null);
    setValidation({});
    try {
      const isNewFarm = destination === 'new';
      const url = isNewFarm
        ? `/api/v1/holdings/${holdingId}/farms/import-catastro`
        : `/api/v1/farms/${farmId}/plots/import-catastro`;
      const bodyPayload = isNewFarm
        ? { farm: { name: farmName.trim() }, parcels: parcelPayload() }
        : { parcels: parcelPayload() };

      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      });
      const body = await response.json() as BatchSuccess | BatchFailure;
      if (!response.ok || !body.created) {
        const failure = body as BatchFailure;
        setValidation(Object.fromEntries(failure.items.map((item) => [item.cadastralReference, item])));
        setError(failure.error?.message ?? 'No se ha completado el alta. Revisa los avisos del lote.');
        return;
      }

      const createdFarmId = body.farm?.id ?? farmId;
      if (!createdFarmId) throw new Error('La respuesta no incluye una finca válida.');
      await onCreated({
        count: body.items.length,
        farmId: createdFarmId,
        ...(body.farm?.name ? { farmName: body.farm.name } : {}),
      });
    } catch {
      setError('No se ha podido completar el alta. No se ha confirmado ninguna creación; vuelve a intentarlo cuando tengas conexión.');
    } finally {
      setSaving(false);
    }
  }

  const canChooseDestination = allowNewFarm && Boolean(farmId);
  const submitLabel = saving
    ? 'Verificando Catastro…'
    : destination === 'new'
      ? `Crear finca y ${parcels.length} parcela${parcels.length === 1 ? '' : 's'}`
      : parcels.length === 1
        ? 'Crear esta parcela'
        : `Crear ${parcels.length} parcelas`;

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

      <section className="card card-body catastro-batch-destination" aria-labelledby="catastro-destination-title">
        <strong id="catastro-destination-title">¿Dónde quieres guardar estas parcelas?</strong>
        {canChooseDestination ? (
          <div className="catastro-batch-quick-actions" role="group" aria-label="Destino de las parcelas">
            <button type="button" className={destination === 'existing' ? 'active' : ''} aria-pressed={destination === 'existing'} onClick={() => setDestination('existing')} disabled={saving}>Añadir a esta finca</button>
            <button type="button" className={destination === 'new' ? 'active' : ''} aria-pressed={destination === 'new'} onClick={() => setDestination('new')} disabled={saving}>Crear una finca nueva</button>
          </div>
        ) : null}
        {destination === 'new' ? (
          <label className="field">
            <span>Nombre de la finca nueva</span>
            <input value={farmName} maxLength={120} onChange={(event) => setFarmName(event.target.value)} placeholder="Ej. Los Llanos" disabled={saving} autoFocus />
            <small>La finca solo se creará si todas las parcelas pasan la verificación oficial.</small>
          </label>
        ) : (
          <p className="plot-editor-help">Se añadirán a la finca que estás viendo ahora.</p>
        )}
      </section>

      <div className="catastro-batch-quick-actions">
        <span>Aplicar riego a todas:</span>
        <button className="text-button" type="button" onClick={() => applyIrrigationToAll('dryland')} disabled={saving}>Secano</button>
        <button className="text-button" type="button" onClick={() => applyIrrigationToAll('irrigated')} disabled={saving}>Regadío</button>
        <button className="text-button" type="button" onClick={() => applyIrrigationToAll('mixed')} disabled={saving}>Mixto</button>
      </div>
      <div className="catastro-batch-quick-actions">
        <span>Aplicar variedad a todas:</span>
        {VARIETIES.map((variety) => (
          <button key={variety} className="text-button" type="button" onClick={() => applyVarietyToAll(variety)} disabled={saving}>{variety}</button>
        ))}
      </div>

      <div className="catastro-batch-grid">
        {parcels.map((parcel, index) => {
          const reference = parcel.nationalCadastralReference;
          const draft = drafts[reference] ?? {
            name: defaultName(parcel), oliveTreeCount: '', irrigationType: '', oliveVariety: '', notes: '',
          };
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
                  <input type="number" min="0" max="100000000" step="1" inputMode="numeric" value={draft.oliveTreeCount} onChange={(event) => patchDraft(reference, { oliveTreeCount: event.target.value })} placeholder="Ej. 236" disabled={saving} />
                </label>
                <label className="field">
                  <span>Riego</span>
                  <select value={draft.irrigationType} onChange={(event) => patchDraft(reference, { irrigationType: event.target.value as IrrigationType | '' })} disabled={saving}>
                    <option value="">Sin definir</option><option value="dryland">Secano</option><option value="irrigated">Regadío</option><option value="mixed">Mixto</option><option value="unknown">No lo sé</option>
                  </select>
                </label>
              </div>
              <label className="field">
                <span>Variedad principal o mezcla</span>
                <input maxLength={80} value={draft.oliveVariety} onChange={(event) => patchDraft(reference, { oliveVariety: event.target.value })} placeholder="Ej. Picual" disabled={saving} />
              </label>
              <label className="field">
                <span>Notas (opcional)</span>
                <textarea maxLength={5000} value={draft.notes} onChange={(event) => patchDraft(reference, { notes: event.target.value })} placeholder="Nombre local, acceso, observaciones…" disabled={saving} />
              </label>
              {itemValidation?.message ? <div className="alert" role="alert">{itemValidation.message}</div> : null}
            </article>
          );
        })}
      </div>

      <div className="catastro-batch-confirmation">
        <div>
          <strong>{parcels.length} parcela{parcels.length === 1 ? '' : 's'} preparada{parcels.length === 1 ? '' : 's'}</strong>
          <small>{destination === 'new' ? 'La finca y el lote son todo-o-nada.' : 'El lote es todo-o-nada: si una referencia falla, no se crea ninguna.'}</small>
        </div>
        <button className="primary-button" type="button" onClick={() => void createPlots()} disabled={saving || invalidLocal || invalidDestination || !parcels.length}>{submitLabel}</button>
      </div>
      <p className="catastro-map-first-trust">Olivos, riego, variedad y notas son datos privados declarados por ti. Catastro y SIGPAC no los rellenan automáticamente.</p>
      {error ? <div className="alert" role="alert">{error}</div> : null}
    </div>
  );
}
