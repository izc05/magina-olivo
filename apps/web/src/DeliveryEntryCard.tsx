import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { api, type Farm, type Plot } from './api.ts';
import { uploadDeliveryTicket } from './document-api.ts';

function localDateTimeValue(): string {
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return now.toISOString().slice(0, 16);
}

export function DeliveryEntryCard({
  holdingId,
  campaignId,
  farms,
  onSaved,
}: {
  holdingId: string;
  campaignId: string;
  farms: Farm[];
  onSaved: () => Promise<void>;
}) {
  const [farmId, setFarmId] = useState('');
  const [plots, setPlots] = useState<Plot[]>([]);
  const [plotId, setPlotId] = useState('');
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const [loadingPlots, setLoadingPlots] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPlotId('');
    if (!farmId) {
      setPlots([]);
      return () => { cancelled = true; };
    }

    setLoadingPlots(true);
    void api.plots(farmId).then((result) => {
      if (!cancelled) setPlots(result.items);
    }).catch((reason) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : 'No se han podido cargar las parcelas.');
    }).finally(() => {
      if (!cancelled) setLoadingPlots(false);
    });

    return () => { cancelled = true; };
  }, [farmId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const kilograms = String(data.get('kilograms') || '').trim();
    const destination = String(data.get('destination') || '').trim();
    const deliveredAt = String(data.get('deliveredAt') || '').trim();
    const ticketNumber = String(data.get('ticketNumber') || '').trim();
    const variety = String(data.get('variety') || '').trim();
    const notes = String(data.get('notes') || '').trim();

    setBusy(true);
    setError(null);
    setNotice(null);
    setWarning(null);

    try {
      const clientGeneratedId = crypto.randomUUID();
      const body: {
        deliveredAt: string;
        kilograms: string;
        customDestination: string;
        clientGeneratedId: string;
        farmId?: string;
        plotId?: string;
        ticketNumber?: string;
        variety?: string;
        notes?: string;
      } = {
        deliveredAt: new Date(deliveredAt).toISOString(),
        kilograms,
        customDestination: destination,
        clientGeneratedId,
      };

      if (farmId) body.farmId = farmId;
      if (plotId) body.plotId = plotId;
      if (ticketNumber) body.ticketNumber = ticketNumber;
      if (variety) body.variety = variety;
      if (notes) body.notes = notes;

      const result = await api.createDelivery(campaignId, body, clientGeneratedId);

      if ('offlineQueued' in result) {
        setNotice('Entrega guardada en este móvil y pendiente de sincronizar.');
        if (ticketFile) {
          setWarning('La entrega está segura, pero el archivo del ticket todavía no se ha subido. Podrás adjuntarlo cuando vuelva la conexión.');
        }
      } else {
        if (ticketFile) {
          await uploadDeliveryTicket(holdingId, result.id, ticketFile);
          setNotice('Entrega y ticket privado guardados correctamente.');
        } else {
          setNotice('Entrega guardada correctamente.');
        }
      }

      form.reset();
      setFarmId('');
      setPlots([]);
      setPlotId('');
      setTicketFile(null);
      await onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido guardar la entrega.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section card card-body delivery-entry-card" aria-labelledby="new-delivery-title">
      <div className="delivery-form-heading">
        <div>
          <p className="eyebrow page-eyebrow">Registro rápido</p>
          <h2 id="new-delivery-title" className="section-title form-card-title">Nueva entrega</h2>
        </div>
        <span className="badge gold">Campaña</span>
      </div>

      <form className="form-grid" onSubmit={submit} aria-busy={busy}>
        <div className="inline-fields">
          <div className="field">
            <label htmlFor="delivery-kilograms">Kilos</label>
            <input id="delivery-kilograms" name="kilograms" type="number" min="0.001" step="0.001" inputMode="decimal" placeholder="1842" required />
          </div>
          <div className="field">
            <label htmlFor="delivery-destination">Almazara / cooperativa</label>
            <input id="delivery-destination" name="destination" type="text" maxLength={200} placeholder="San Sebastián" required />
          </div>
        </div>

        <div className="inline-fields">
          <div className="field">
            <label htmlFor="delivery-farm-dependent">Finca</label>
            <select id="delivery-farm-dependent" value={farmId} onChange={(event) => setFarmId(event.target.value)}>
              <option value="">Sin especificar</option>
              {farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="delivery-plot-dependent">Parcela</label>
            <select id="delivery-plot-dependent" value={plotId} onChange={(event) => setPlotId(event.target.value)} disabled={!farmId || loadingPlots} aria-busy={loadingPlots}>
              <option value="">{loadingPlots ? 'Cargando…' : farmId ? 'Sin especificar' : 'Elige primero una finca'}</option>
              {plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name}</option>)}
            </select>
          </div>
        </div>

        <div className="inline-fields">
          <div className="field">
            <label htmlFor="delivery-ticket-number">Nº ticket</label>
            <input id="delivery-ticket-number" name="ticketNumber" type="text" maxLength={200} placeholder="004281" />
          </div>
          <div className="field">
            <label htmlFor="delivery-date-time">Fecha y hora</label>
            <input id="delivery-date-time" name="deliveredAt" type="datetime-local" defaultValue={localDateTimeValue()} required />
          </div>
        </div>

        <div className="inline-fields">
          <div className="field">
            <label htmlFor="delivery-variety">Variedad</label>
            <input id="delivery-variety" name="variety" type="text" maxLength={120} placeholder="Picual" />
          </div>
          <div className="field delivery-file-field">
            <label htmlFor="delivery-ticket-file">Foto / PDF del ticket</label>
            <input
              id="delivery-ticket-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              aria-describedby="delivery-ticket-help"
              onChange={(event) => setTicketFile(event.target.files?.[0] ?? null)}
            />
            <small id="delivery-ticket-help">{ticketFile ? `${ticketFile.name} · ${(ticketFile.size / 1024 / 1024).toFixed(2)} MB` : 'Opcional · máximo 10 MB · archivo privado'}</small>
          </div>
        </div>

        <div className="field">
          <label htmlFor="delivery-notes">Notas</label>
          <textarea id="delivery-notes" name="notes" maxLength={5000} placeholder="Observaciones de la entrega…" />
        </div>

        {error ? <div className="alert" role="alert">{error}</div> : null}
        {notice ? <div className="alert success" role="status" aria-live="polite">{notice}</div> : null}
        {warning ? <div className="alert delivery-warning" role="status" aria-live="polite">{warning}</div> : null}

        <div className="delivery-save-row">
          <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar entrega'}</button>
          <span>La finca es opcional. Si eliges parcela, siempre pertenecerá a la finca seleccionada.</span>
        </div>
      </form>
    </section>
  );
}

export function DeliveryTicketButton({
  holdingId,
  deliveryId,
}: {
  holdingId: string;
  deliveryId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function choose(file: File | null) {
    if (!file) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await uploadDeliveryTicket(holdingId, deliveryId, file);
      setNotice('Ticket adjuntado');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido subir el ticket.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="delivery-ticket-action" aria-busy={busy}>
      <button
        className="ticket-upload-button"
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        aria-describedby={`ticket-status-${deliveryId}`}
      >
        {busy ? 'Subiendo…' : 'Adjuntar ticket'}
      </button>
      <input
        ref={inputRef}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        disabled={busy}
        aria-label="Seleccionar foto o PDF del ticket"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          event.target.value = '';
          void choose(file);
        }}
      />
      <span id={`ticket-status-${deliveryId}`} className="ticket-status" aria-live="polite">
        {notice ? <small className="ticket-success">{notice}</small> : null}
        {error ? <small className="ticket-error" role="alert">{error}</small> : null}
      </span>
    </div>
  );
}
