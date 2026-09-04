import { useEffect, useState } from 'react';
import {
  listCampaignDocuments,
  privateDocumentContentUrl,
  type UploadedDocument,
} from './document-api.ts';

type ExportFormat = 'pdf' | 'csv' | 'json';

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function documentLabel(type: string): string {
  if (type === 'ticket') return 'Ticket';
  if (type === 'delivery_note') return 'Albarán';
  if (type === 'yield_report') return 'Rendimiento';
  if (type === 'invoice') return 'Factura';
  if (type === 'settlement') return 'Liquidación';
  if (type === 'photo') return 'Foto';
  return 'Documento';
}

function deliveryLine(document: UploadedDocument): string {
  const delivery = document.delivery;
  if (!delivery) return 'Documento privado de la campaña';
  const date = delivery.deliveredAt
    ? new Date(delivery.deliveredAt).toLocaleDateString('es-ES')
    : 'Entrega';
  const kilograms = delivery.kilograms ? `${delivery.kilograms} kg` : null;
  const destination = delivery.destination || 'Cooperativa';
  return [date, kilograms, destination].filter(Boolean).join(' · ');
}

function exportFilename(response: Response, campaignId: string, format: ExportFormat): string {
  const disposition = response.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? `magina-olivo-campana-${campaignId}.${format}`;
}

async function downloadCampaignExport(campaignId: string, format: ExportFormat): Promise<void> {
  const response = await fetch(`/api/v1/campaigns/${campaignId}/export.${format}`, {
    credentials: 'include',
    headers: { accept: format === 'pdf' ? 'application/pdf' : format === 'csv' ? 'text/csv' : 'application/json' },
  });
  if (!response.ok) throw new Error(`No se ha podido preparar la exportación (${response.status}).`);

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = exportFilename(response, campaignId, format);
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}

export function CampaignDocuments({
  holdingId,
  campaignId,
}: {
  holdingId: string;
  campaignId: string;
  deliveries?: readonly unknown[];
}) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setDocuments(await listCampaignDocuments(holdingId, campaignId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se han podido cargar los documentos privados.');
    } finally {
      setLoading(false);
    }
  }

  async function runExport(format: ExportFormat) {
    setExportBusy(format);
    setExportError(null);
    try {
      await downloadCampaignExport(campaignId, format);
    } catch (reason) {
      setExportError(reason instanceof Error ? reason.message : 'No se ha podido descargar el archivo.');
    } finally {
      setExportBusy(null);
    }
  }

  useEffect(() => {
    void load();
  }, [holdingId, campaignId]);

  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener('magina:document-uploaded', refresh);
    return () => window.removeEventListener('magina:document-uploaded', refresh);
  }, [holdingId, campaignId]);

  return (
    <section className="section campaign-documents" aria-labelledby="campaign-documents-title">
      <div className="section-heading campaign-documents-heading">
        <div>
          <p className="eyebrow page-eyebrow">Archivo privado</p>
          <h2 id="campaign-documents-title" className="section-title">Tickets y documentos</h2>
          <p className="section-copy">Archivos vinculados a las entregas de esta campaña.</p>
        </div>
        <span className="badge gold">{documents.length}</span>
      </div>

      <div className="card card-body campaign-export-card" aria-labelledby="campaign-export-title">
        <p className="eyebrow page-eyebrow">Tus datos</p>
        <h3 id="campaign-export-title" className="section-title form-card-title">Informe y exportación</h3>
        <p className="section-copy">El PDF resume la cosecha por finca y parcela, con kilos, entregas, destinos y rendimiento ponderado. CSV sirve para hoja de cálculo y JSON conserva la estructura completa.</p>
        <div className="form-actions campaign-export-actions">
          <button className="primary-button campaign-pdf-download" type="button" disabled={exportBusy !== null} onClick={() => void runExport('pdf')}>{exportBusy === 'pdf' ? 'Preparando PDF…' : 'Descargar informe PDF'}</button>
          <button className="text-button" type="button" disabled={exportBusy !== null} onClick={() => void runExport('csv')}>{exportBusy === 'csv' ? 'Preparando…' : 'Descargar CSV'}</button>
          <button className="text-button" type="button" disabled={exportBusy !== null} onClick={() => void runExport('json')}>{exportBusy === 'json' ? 'Preparando…' : 'Descargar JSON'}</button>
        </div>
        <p className="campaign-export-note">El informe no estima rendimientos que aún estén pendientes.</p>
        {exportError ? <div className="alert" role="alert">{exportError}</div> : null}
      </div>

      {error ? <div className="alert" role="alert">{error}</div> : null}

      <div className="campaign-document-list" aria-busy={loading}>
        {documents.map((document) => (
          <article className="card campaign-document-row" key={document.id}>
            <div className="campaign-document-icon" aria-hidden="true">▤</div>
            <div className="campaign-document-copy">
              <div className="campaign-document-topline">
                <strong>{document.filename}</strong>
                <span>{documentLabel(document.documentType)}</span>
              </div>
              <p>{deliveryLine(document)}</p>
              <small>{formatBytes(document.sizeBytes)} · {new Date(document.createdAt).toLocaleDateString('es-ES')}</small>
            </div>
            <a className="campaign-document-download" href={privateDocumentContentUrl(document.id)}>Descargar</a>
          </article>
        ))}

        {!loading && documents.length === 0 ? (
          <div className="card empty-state">
            <strong>Aún no hay documentos</strong>
            Los tickets que adjuntes a una entrega aparecerán aquí automáticamente.
          </div>
        ) : null}

        {loading ? <div className="campaign-documents-loading" role="status">Cargando archivo privado…</div> : null}
      </div>
    </section>
  );
}
